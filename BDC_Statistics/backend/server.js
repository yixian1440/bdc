import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import caseRoutes from './routes/cases.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import developerRoutes from './routes/developers.js';
import indexOptimizationRoutes from './routes/indexOptimization.js';
import messageRoutes from './routes/messages.js';
import db from './config/database.js';
import cacheMiddleware from './middleware/cacheMiddleware.js';
// 导入WebSocket服务
import webSocketService from './services/webSocketService.js';
import {
  prometheusMiddleware,
  apiResponseTimeMonitor,
  createDbPerformanceWrapper,
  initializePerformanceMonitoring,
  recordCacheOperation
} from './middleware/performanceMonitor.js';

// 包装数据库连接以监控查询性能
const monitoredDb = createDbPerformanceWrapper(db);

// 初始化性能监控
initializePerformanceMonitoring();

const app = express();
const PORT = process.env.PORT || 3001;

// 全局错误捕获
process.on('uncaughtException', (err) => {
  console.error('未捕获的异常:', err);
  console.error('堆栈跟踪:', err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
  if (reason instanceof Error) {
    console.error('错误堆栈:', reason.stack);
  }
});

// 中间件配置
app.use(helmet());
// 允许局域网访问的CORS配置
app.use(cors({
  origin: true, // 允许所有来源，生产环境中应该限制为特定域名
  credentials: true
}));

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 150, // 增加到每IP 15分钟150次请求
  standardHeaders: true,
  legacyHeaders: false,
  // 添加更友好的错误处理
  handler: (req, res) => {
    res.status(429).json({
      error: '请求过于频繁',
      message: '请在15分钟后再次尝试',
      retryAfter: 900 // 秒
    });
  }
});
app.use(limiter);

// 解析JSON请求体
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 静态文件服务 - 用于访问性能监控面板
app.use(express.static('public'));

// 应用Prometheus监控中间件
app.use(prometheusMiddleware);

// 应用自定义API响应时间监控
app.use(apiResponseTimeMonitor);

// API路由 - 传递监控的数据库连接
// 认证相关路由不使用缓存
app.use('/api/auth', authRoutes);

// 用户和开发者信息使用较短的缓存时间（30秒）
const shortCache = cacheMiddleware.create(30);
app.use('/api/users', shortCache, userRoutes);
app.use('/api/developers', shortCache, developerRoutes);

// 简单的缓存控制中间件
const cacheControlMiddleware = (req, res, next) => {
  // 设置缓存控制头，确保不返回304
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
};

// 案件数据根据不同端点使用不同缓存策略
// 创建缓存路由组
const apiRouter = express.Router();

// 应用缓存控制中间件到所有API路由
apiRouter.use(cacheControlMiddleware);

// 挂载各路由模块 - 直接挂载案件路由到API路由，修复路径重复问题
apiRouter.use(caseRoutes);

// 新增：添加一个路由，将/api/cases/*请求代理到现有案件路由上，兼容前端请求
apiRouter.use('/cases', caseRoutes);

// 挂载消息路由到API路由组
apiRouter.use(messageRoutes);

// 应用API路由组
app.use('/api', apiRouter);

// 索引优化路由
app.use('/api/index-optimization', indexOptimizationRoutes);

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'BDC Statistics API',
    cacheStats: cacheMiddleware.stats(),
    monitoringEnabled: true
  });
});

// 性能指标端点
app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  const register = require('prom-client').register;
  res.send(register.metrics());
});

// 缓存管理端点
app.get('/api/cache/stats', (req, res) => {
  const stats = cacheMiddleware.stats();
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    stats: {
      keys: stats.keys,
      hits: stats.hits,
      misses: stats.misses,
      avgGetTime: stats.avgGetTime + 'ms',
      avgSetTime: stats.avgSetTime + 'ms'
    }
  });
});

// 清除缓存端点
app.delete('/api/cache/clear', (req, res) => {
  const { path } = req.query;
  const clearedCount = cacheMiddleware.clear(path);
  res.status(200).json({
    status: 'OK',
    message: path ? `已清除路径包含"${path}"的缓存` : '已清除所有缓存',
    clearedKeys: clearedCount,
    timestamp: new Date().toISOString()
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// 错误处理中间件
app.use((error, req, res, next) => {
  // 记录详细的错误日志，包括用户IP和性能指标
  console.error('错误:', {
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString()
  });
  
  // 详细的错误日志记录
  if (error instanceof Error) {
    console.error('错误堆栈:', error.stack);
    console.error('错误类型:', error.name);
    console.error('请求路径:', req.path);
    console.error('请求方法:', req.method);
    console.error('用户IP:', req.ip);
  }
  
  // 根据错误类型设置不同的状态码
  let statusCode = 500;
  if (error.name === 'ValidationError' || error.name === 'SyntaxError') {
    statusCode = 400; // 客户端请求错误
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401; // 未授权
  } else if (error.name === 'ForbiddenError') {
    statusCode = 403; // 禁止访问
  } else if (error.name === 'NotFoundError') {
    statusCode = 404; // 资源不存在
  }
  
  // 构建详细的错误响应
  const errorResponse = {
    error: error.name || 'ServerError',
    statusCode,
    timestamp: new Date().toISOString(),
    path: req.path,
  };
  
  // 根据环境提供不同详细程度的错误信息
  if (process.env.NODE_ENV === 'development') {
    errorResponse.message = error.message || '内部服务器错误';
    errorResponse.details = error.details || undefined;
    errorResponse.stack = error.stack ? error.stack.split('\n') : undefined;
  } else {
    // 生产环境提供安全的错误信息
    switch (statusCode) {
      case 400:
        errorResponse.message = '请求参数错误，请检查输入';
        break;
      case 401:
        errorResponse.message = '认证失败，请重新登录';
        break;
      case 403:
        errorResponse.message = '您没有权限执行此操作';
        break;
      case 404:
        errorResponse.message = '请求的资源不存在';
        break;
      default:
        errorResponse.message = '服务器内部错误，请稍后再试或联系管理员';
    }
  }
  
  res.status(statusCode).json(errorResponse);
});

// 启动前测试数据库连接
async function startServer() {
  console.log('开始启动服务器...');
  try {
    console.log('正在测试数据库连接...');
    const [testResult] = await db.execute('SELECT 1 AS test');
    console.log('数据库连接测试成功:', testResult);
    
    console.log(`正在启动HTTP服务器，监听端口: ${PORT}...`);
    // 创建HTTP服务器
    const server = http.createServer(app);
    
    // 初始化WebSocket服务
    webSocketService.initialize(server);
    
    // 启动服务器
    server.listen(PORT, () => {
      console.log(`🚀 后端服务器运行在 http://localhost:${PORT}`);
      console.log(`📊 健康检查: http://localhost:${PORT}/health`);
      console.log(`🔐 认证接口: http://localhost:${PORT}/api/auth`);
      console.log(`🌐 外部访问: http://127.0.0.1:${PORT}`);
      console.log(`🎯 服务器进程ID: ${process.pid}`);
      console.log(`📈 性能指标可访问: http://localhost:${PORT}/metrics`);
      console.log(`🔌 WebSocket服务: ws://localhost:${PORT}/ws`);
      console.log('服务器启动完成，等待请求...');
    });
    
    server.on('error', (err) => {
      console.error('服务器启动错误:', err);
      console.error('错误堆栈:', err.stack);
    });
    
    server.on('listening', () => {
      console.log(`服务器成功开始监听端口 ${PORT}`);
    });
    
    server.on('close', () => {
      console.log('服务器已关闭');
    });
    
    // 跟踪服务器状态
    console.log('服务器实例创建成功');
    console.log('服务器事件监听器已注册');
    
    // 防止意外退出
    process.on('beforeExit', (code) => {
      console.log(`进程即将退出，退出码: ${code}`);
      console.log('服务器是否仍在监听:', !server.listening);
    });
    
    // 优雅关闭
    process.on('SIGINT', () => {
      console.log('收到SIGINT信号，正在关闭服务器...');
      server.close(() => {
        console.log('服务器已关闭');
        process.exit(0);
      });
    });
    
    process.on('SIGTERM', () => {
      console.log('收到SIGTERM信号，正在关闭服务器...');
      server.close(() => {
        console.log('服务器已关闭');
        process.exit(0);
      });
    });
    
    // 强制保持服务器运行
    console.log('服务器启动逻辑完成，服务器应该继续运行');
    
  } catch (error) {
    console.error('服务器启动失败:', error);
    console.error('错误堆栈:', error.stack);
    process.exit(1);
  }
}

// 启动服务器
startServer();