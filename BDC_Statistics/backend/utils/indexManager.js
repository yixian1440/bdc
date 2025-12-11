import db from '../config/database.js';
import fs from 'fs';
import path from 'path';

/**
 * 索引管理器 - 用于管理和优化数据库索引
 */
class IndexManager {
  constructor() {
    // 在 ES 模块中获取当前文件目录的可靠方法
    const __dirname = path.resolve();
    // 确保路径正确，从 utils 目录向上一级再到 logs 目录
    this.indexLogPath = path.join(path.dirname(__dirname), 'logs', 'index_management.log');
    this.ensureLogDirectory();
  }

  // 确保日志目录存在
  ensureLogDirectory() {
    const logDir = path.dirname(this.indexLogPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  // 记录索引管理日志
  log(message, level = 'info') {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message
    };
    
    try {
      fs.appendFileSync(
        this.indexLogPath,
        JSON.stringify(logEntry) + '\n',
        'utf8'
      );
      console.log(`[${level.toUpperCase()}] ${message}`);
    } catch (error) {
      console.error('Failed to write index log:', error);
    }
  }

  // 获取表的索引信息
  async getTableIndexes(tableName) {
    try {
      const [rows] = await db.execute(
        `SHOW INDEX FROM ${tableName}`
      );
      return rows;
    } catch (error) {
      this.log(`获取表 ${tableName} 的索引信息失败: ${error.message}`, 'error');
      throw error;
    }
  }

  // 检查索引是否存在
  async checkIndexExists(tableName, indexName) {
    try {
      const indexes = await this.getTableIndexes(tableName);
      return indexes.some(index => index.Key_name === indexName);
    } catch (error) {
      this.log(`检查索引 ${indexName} 是否存在失败: ${error.message}`, 'error');
      throw error;
    }
  }

  // 创建单个索引
  async createIndex(tableName, indexName, columns, unique = false) {
    try {
      // 检查索引是否已存在
      const exists = await this.checkIndexExists(tableName, indexName);
      if (exists) {
        this.log(`索引 ${indexName} 在表 ${tableName} 上已存在，跳过创建`);
        return { created: false, message: '索引已存在' };
      }

      const uniqueClause = unique ? 'UNIQUE' : '';
      const query = `CREATE ${uniqueClause} INDEX IF NOT EXISTS ${indexName} ON ${tableName} (${columns})`;
      
      await db.execute(query);
      this.log(`成功在表 ${tableName} 上创建索引 ${indexName}`);
      
      return { created: true, message: '索引创建成功' };
    } catch (error) {
      this.log(`创建索引 ${indexName} 失败: ${error.message}`, 'error');
      throw error;
    }
  }

  // 删除索引
  async dropIndex(tableName, indexName) {
    try {
      const exists = await this.checkIndexExists(tableName, indexName);
      if (!exists) {
        this.log(`索引 ${indexName} 在表 ${tableName} 上不存在，跳过删除`);
        return { dropped: false, message: '索引不存在' };
      }

      await db.execute(`DROP INDEX ${indexName} ON ${tableName}`);
      this.log(`成功从表 ${tableName} 删除索引 ${indexName}`);
      
      return { dropped: true, message: '索引删除成功' };
    } catch (error) {
      this.log(`删除索引 ${indexName} 失败: ${error.message}`, 'error');
      throw error;
    }
  }

  // 批量创建索引
  async createIndexes(indexList) {
    const results = [];
    
    for (const indexDef of indexList) {
      try {
        const result = await this.createIndex(
          indexDef.table,
          indexDef.name,
          indexDef.columns,
          indexDef.unique || false
        );
        results.push({ ...indexDef, ...result });
      } catch (error) {
        results.push({
          ...indexDef,
          created: false,
          message: error.message
        });
      }
    }
    
    return results;
  }

  // 执行索引优化脚本
  async executeIndexScript(scriptPath) {
    try {
      const scriptContent = fs.readFileSync(scriptPath, 'utf8');
      
      // 分割脚本为单独的语句（简单实现）
      const statements = scriptContent
        .split(';')
        .map(statement => statement.trim())
        .filter(statement => statement && !statement.startsWith('--'));
      
      for (const statement of statements) {
        if (statement.toUpperCase().includes('OPTIMIZE TABLE')) {
          // 记录但不执行优化表语句，除非显式启用
          this.log(`发现 OPTIMIZE TABLE 语句: ${statement}. 此操作可能影响性能，已跳过执行。要执行请手动操作。`);
        } else {
          await db.execute(statement);
          this.log(`成功执行: ${statement.substring(0, 100)}...`);
        }
      }
      
      return { success: true, executed: statements.length };
    } catch (error) {
      this.log(`执行索引脚本 ${scriptPath} 失败: ${error.message}`, 'error');
      throw error;
    }
  }

  // 分析查询性能并提供索引建议
  async analyzeQuery(query) {
    try {
      // 执行EXPLAIN分析查询
      const [explainResults] = await db.execute(`EXPLAIN ${query}`);
      
      // 分析结果并生成建议
      const suggestions = [];
      let needsIndex = false;
      
      for (const row of explainResults) {
        // 检查是否有全表扫描
        if (row.type === 'ALL' && row.key === null) {
          needsIndex = true;
          suggestions.push(`发现全表扫描，建议为 ${row.table} 表添加适当的索引`);
        }
        
        // 检查是否使用了临时表
        if (row.Extra && row.Extra.includes('Using temporary')) {
          suggestions.push(`查询使用了临时表，可能需要优化 GROUP BY 或 ORDER BY 子句`);
        }
        
        // 检查是否使用了文件排序
        if (row.Extra && row.Extra.includes('Using filesort')) {
          suggestions.push(`查询使用了文件排序，建议为 ORDER BY 的列添加索引`);
        }
      }
      
      return {
        query,
        explainResults,
        suggestions,
        needsOptimization: suggestions.length > 0
      };
    } catch (error) {
      this.log(`分析查询性能失败: ${error.message}`, 'error');
      throw error;
    }
  }

  // 获取慢查询日志并提供优化建议
  async getSlowQueries() {
    try {
      // 这个方法需要根据实际的慢查询日志存储方式实现
      // 这里提供一个简单的模拟实现
      const slowQueries = [];
      
      // 示例：从性能日志中查找慢查询
      try {
        if (fs.existsSync(this.indexLogPath)) {
          const logs = fs.readFileSync(this.indexLogPath, 'utf8')
            .split('\n')
            .filter(line => line.trim());
          
          for (const line of logs) {
            try {
              const log = JSON.parse(line);
              if (log.message && log.message.includes('slow_query')) {
                slowQueries.push(log);
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      } catch (e) {
        this.log(`读取慢查询日志失败: ${e.message}`, 'error');
      }
      
      return slowQueries;
    } catch (error) {
      this.log(`获取慢查询失败: ${error.message}`, 'error');
      throw error;
    }
  }

  // 获取索引使用统计
  async getIndexUsageStats() {
    try {
      // 注意：此功能需要 MySQL 的 performance_schema 启用
      const [rows] = await db.execute(`
        SELECT 
          object_schema AS database_name,
          object_name AS table_name,
          index_name,
          count_star AS uses,
          count_fetch AS row_reads
        FROM performance_schema.table_io_waits_summary_by_index_usage
        WHERE object_schema = DATABASE()
        ORDER BY count_star DESC
      `).catch(() => {[
        // 如果 performance_schema 不可用，返回空数组
        []
      ]});
      
      return rows;
    } catch (error) {
      this.log(`获取索引使用统计失败: ${error.message}`, 'error');
      return [];
    }
  }

  // 生成索引健康报告
  async generateIndexHealthReport() {
    try {
      const tables = ['cases', 'users', 'developers'];
      const report = {
        timestamp: new Date().toISOString(),
        tables: {},
        slowQueries: await this.getSlowQueries(),
        indexUsage: await this.getIndexUsageStats(),
        recommendations: []
      };
      
      // 获取每个表的索引信息
      for (const table of tables) {
        report.tables[table] = await this.getTableIndexes(table);
      }
      
      // 生成基于常见模式的建议
      const commonIndexes = [
        { table: 'cases', columns: 'user_id', suggested: false },
        { table: 'cases', columns: 'created_at', suggested: false },
        { table: 'cases', columns: 'status', suggested: false },
        { table: 'users', columns: 'username', suggested: false }
      ];
      
      for (const indexDef of commonIndexes) {
        const tableIndexes = report.tables[indexDef.table];
        if (tableIndexes) {
          const exists = tableIndexes.some(index => 
            index.Column_name === indexDef.columns || 
            (index.Comment && index.Comment.includes(indexDef.columns))
          );
          
          if (!exists) {
            report.recommendations.push({
              type: 'missing_index',
              table: indexDef.table,
              columns: indexDef.columns,
              reason: '基于常见查询模式，此索引可能提高性能'
            });
          }
        }
      }
      
      // 检查慢查询并添加建议
      for (const query of report.slowQueries) {
        if (query.query) {
          try {
            const analysis = await this.analyzeQuery(query.query);
            if (analysis.needsOptimization) {
              report.recommendations.push({
                type: 'slow_query',
                query: query.query,
                suggestions: analysis.suggestions,
                execution_time: query.execution_time
              });
            }
          } catch (e) {
            // 忽略分析错误
          }
        }
      }
      
      return report;
    } catch (error) {
      this.log(`生成索引健康报告失败: ${error.message}`, 'error');
      throw error;
    }
  }
}

// 导出索引管理器实例
export default new IndexManager();
