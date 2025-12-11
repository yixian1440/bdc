import express from 'express';
const router = express.Router();
import indexManager from '../utils/indexManager.js';
import path from 'path';
import auth from '../middleware/auth.js';

/**
 * 索引优化API路由
 * 提供数据库索引管理和优化功能
 */

// 认证中间件 - 索引操作需要管理员权限
router.use(auth.protect);
router.use(auth.restrictTo('admin', 'manager'));

// 获取索引健康报告
router.get('/health-report', async (req, res) => {
  try {
    const report = await indexManager.generateIndexHealthReport();
    res.status(200).json({
      status: 'success',
      data: report
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: '生成索引健康报告失败',
      error: error.message
    });
  }
});

// 获取表的索引信息
router.get('/:table/indexes', async (req, res) => {
  try {
    const { table } = req.params;
    const indexes = await indexManager.getTableIndexes(table);
    
    res.status(200).json({
      status: 'success',
      table,
      count: indexes.length,
      data: indexes
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: '获取表索引信息失败',
      error: error.message
    });
  }
});

// 创建索引
router.post('/:table/index', async (req, res) => {
  try {
    const { table } = req.params;
    const { indexName, columns, unique } = req.body;
    
    if (!indexName || !columns) {
      return res.status(400).json({
        status: 'error',
        message: '必须提供索引名称和列名'
      });
    }
    
    const result = await indexManager.createIndex(table, indexName, columns, unique);
    
    res.status(result.created ? 201 : 200).json({
      status: 'success',
      message: result.message,
      data: {
        table,
        indexName,
        columns,
        unique: unique || false
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: '创建索引失败',
      error: error.message
    });
  }
});

// 删除索引
router.delete('/:table/index/:indexName', async (req, res) => {
  try {
    const { table, indexName } = req.params;
    
    const result = await indexManager.dropIndex(table, indexName);
    
    res.status(200).json({
      status: 'success',
      message: result.message
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: '删除索引失败',
      error: error.message
    });
  }
});

// 批量创建索引
router.post('/batch-create', async (req, res) => {
  try {
    const { indexes } = req.body;
    
    if (!Array.isArray(indexes)) {
      return res.status(400).json({
        status: 'error',
        message: '索引定义必须是数组格式'
      });
    }
    
    const results = await indexManager.createIndexes(indexes);
    
    const successCount = results.filter(r => r.created).length;
    const totalCount = results.length;
    
    res.status(200).json({
      status: 'success',
      message: `成功创建 ${successCount}/${totalCount} 个索引`,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: '批量创建索引失败',
      error: error.message
    });
  }
});

// 执行索引优化脚本
router.post('/execute-script', async (req, res) => {
  try {
    const scriptPath = path.join(__dirname, '../sql/create_indexes.sql');
    const result = await indexManager.executeIndexScript(scriptPath);
    
    res.status(200).json({
      status: 'success',
      message: `成功执行索引优化脚本，处理了 ${result.executed} 条SQL语句`
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: '执行索引优化脚本失败',
      error: error.message
    });
  }
});

// 获取慢查询分析
router.get('/slow-queries', async (req, res) => {
  try {
    const slowQueries = await indexManager.getSlowQueries();
    
    res.status(200).json({
      status: 'success',
      count: slowQueries.length,
      data: slowQueries
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: '获取慢查询信息失败',
      error: error.message
    });
  }
});

// 分析特定查询
router.post('/analyze-query', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({
        status: 'error',
        message: '必须提供查询语句'
      });
    }
    
    const analysis = await indexManager.analyzeQuery(query);
    
    res.status(200).json({
      status: 'success',
      data: analysis
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: '分析查询失败',
      error: error.message
    });
  }
});

// 获取索引使用统计
router.get('/usage-stats', async (req, res) => {
  try {
    const stats = await indexManager.getIndexUsageStats();
    
    res.status(200).json({
      status: 'success',
      count: stats.length,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: '获取索引使用统计失败',
      error: error.message
    });
  }
});

export default router;
