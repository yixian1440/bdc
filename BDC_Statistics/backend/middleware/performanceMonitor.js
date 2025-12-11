import promBundle from 'express-prom-bundle';
import client from 'prom-client';
import fs from 'fs';
import path from 'path';

// 创建自定义指标
const responseTimeHistogram = new client.Histogram({
  name: 'api_response_time_seconds',
  help: 'API response time in seconds',
  labelNames: ['endpoint', 'method', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 0.7, 1, 2, 3, 5, 10] // 响应时间桶
});

const dbQueryTimeHistogram = new client.Histogram({
  name: 'db_query_time_seconds',
  help: 'Database query time in seconds',
  labelNames: ['query_type', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.3, 0.5, 1]
});

const cacheOperationsCounter = new client.Counter({
  name: 'cache_operations_total',
  help: 'Total number of cache operations',
  labelNames: ['operation', 'status'] // operation: get/set/delete, status: hit/miss/error
});

// 创建一个性能日志记录器
class PerformanceLogger {
  constructor() {
    // 在 ES 模块中获取日志路径
    const __dirname = path.resolve();
    this.logPath = path.join(path.dirname(__dirname), 'logs', 'performance.log');
    // 确保日志目录存在
    const logDir = path.dirname(this.logPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  async logPerformanceData(data) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      ...data
    };
    
    try {
      fs.appendFileSync(
        this.logPath,
        JSON.stringify(logEntry) + '\n',
        'utf8'
      );
    } catch (error) {
      console.error('Failed to write performance log:', error);
    }
  }

  // 清理过期日志（超过7天）
  cleanOldLogs() {
    try {
      if (!fs.existsSync(this.logPath)) return;
      
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const lines = fs.readFileSync(this.logPath, 'utf8').split('\n');
      const newContent = lines
        .filter(line => line.trim())
        .map(line => {
          try {
            const entry = JSON.parse(line);
            return new Date(entry.timestamp).getTime() > sevenDaysAgo ? line : null;
          } catch (e) {
            return null;
          }
        })
        .filter(Boolean)
        .join('\n');
      
      fs.writeFileSync(this.logPath, newContent, 'utf8');
    } catch (error) {
      console.error('Failed to clean old logs:', error);
    }
  }
}

const performanceLogger = new PerformanceLogger();

// 数据库查询性能包装器
function createDbPerformanceWrapper(db) {
  const originalExecute = db.execute.bind(db);
  
  db.execute = async function(query, params = []) {
    const startTime = process.hrtime();
    let table = 'unknown';
    let queryType = 'unknown';
    
    // 简单解析查询类型和表名
    const queryLower = query.toLowerCase();
    if (queryLower.startsWith('select')) {
      queryType = 'select';
      const fromMatch = queryLower.match(/from\s+(\w+)/i);
      if (fromMatch) table = fromMatch[1];
    } else if (queryLower.startsWith('insert')) {
      queryType = 'insert';
      const intoMatch = queryLower.match(/into\s+(\w+)/i);
      if (intoMatch) table = intoMatch[1];
    } else if (queryLower.startsWith('update')) {
      queryType = 'update';
      const updateMatch = queryLower.match(/update\s+(\w+)/i);
      if (updateMatch) table = updateMatch[1];
    } else if (queryLower.startsWith('delete')) {
      queryType = 'delete';
      const fromMatch = queryLower.match(/from\s+(\w+)/i);
      if (fromMatch) table = fromMatch[1];
    }
    
    try {
      const result = await originalExecute(query, params);
      
      // 计算执行时间
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const executionTime = seconds + nanoseconds / 1e9;
      
      // 记录性能指标
      dbQueryTimeHistogram.observe({ query_type: queryType, table }, executionTime);
      
      // 记录慢查询
      if (executionTime > 0.5) {
        performanceLogger.logPerformanceData({
          type: 'slow_query',
          query: query.slice(0, 200), // 限制查询长度
          params: params.length,
          execution_time: executionTime,
          query_type: queryType,
          table: table
        });
      }
      
      return result;
    } catch (error) {
      // 记录查询错误
      performanceLogger.logPerformanceData({
        type: 'query_error',
        query: query.slice(0, 200),
        params: params.length,
        error: error.message,
        query_type: queryType,
        table: table
      });
      throw error;
    }
  };
  
  return db;
}

// API响应时间监控中间件
function apiResponseTimeMonitor(req, res, next) {
  const startTime = process.hrtime();
  const originalSend = res.send;
  
  res.send = function(body) {
    // 计算响应时间
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const responseTime = seconds + nanoseconds / 1e9;
    
    // 记录Prometheus指标
    responseTimeHistogram.observe({
      endpoint: req.path,
      method: req.method,
      status_code: res.statusCode
    }, responseTime);
    
    // 记录慢API
    if (responseTime > 2) {
      performanceLogger.logPerformanceData({
        type: 'slow_api',
        endpoint: req.path,
        method: req.method,
        status_code: res.statusCode,
        response_time: responseTime,
        ip: req.ip,
        user_agent: req.headers['user-agent']
      });
    }
    
    return originalSend.call(this, body);
  };
  
  next();
}

// Prometheus默认监控中间件
export const prometheusMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  includeUp: true,
  customLabels: { app: 'bdc-statistics-api' },
  promClient: {
    collectDefaultMetrics: {
      timeout: 5000
    }
  }
});

// 缓存操作指标记录
export const recordCacheOperation = (operation, status) => {
  cacheOperationsCounter.inc({ operation, status });
};

// 初始化性能监控
export const initializePerformanceMonitoring = () => {
  // 设置定期清理日志任务
  setInterval(() => {
    performanceLogger.cleanOldLogs();
  }, 24 * 60 * 60 * 1000); // 每天清理一次
  
  return {
    responseTimeHistogram,
    dbQueryTimeHistogram,
    cacheOperationsCounter
  };
};

// 导出其他函数
export { createDbPerformanceWrapper, apiResponseTimeMonitor };
