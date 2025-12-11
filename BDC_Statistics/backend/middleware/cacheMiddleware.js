import NodeCache from 'node-cache';

// 创建缓存实例，默认TTL为5分钟（300秒）
const cache = new NodeCache({
  stdTTL: 300,         // 默认缓存时间（秒）
  checkperiod: 60,     // 检查过期项的时间间隔（秒）
  deleteOnExpire: true // 缓存过期时自动删除
});

/**
 * 创建缓存中间件
 * @param {number} duration - 缓存持续时间（秒），默认5分钟
 * @param {boolean} cacheError - 是否缓存错误响应，默认false
 * @returns {function} Express中间件函数
 */
function createCacheMiddleware(duration = 300, cacheError = false) {
  return (req, res, next) => {
    // 只缓存GET请求
    if (req.method !== 'GET') {
      return next();
    }
    
    // 生成缓存键，考虑查询参数
    const cacheKey = `__express__${req.originalUrl}`;
    
    // 尝试从缓存获取
    const cachedBody = cache.get(cacheKey);
    
    if (cachedBody) {
      // 缓存命中，记录日志
      console.log(`[缓存命中] ${req.originalUrl}`);
      
      // 添加缓存头信息
      res.setHeader('X-Cache-Status', 'HIT');
      res.setHeader('X-Cache-Timestamp', cachedBody.timestamp);
      
      // 返回缓存的响应数据
      return res.status(cachedBody.statusCode).json(cachedBody.body);
    }
    
    // 缓存未命中，拦截send方法
    res.sendResponse = res.json;
    res.json = (body) => {
      // 记录缓存未命中
      console.log(`[缓存未命中] ${req.originalUrl}`);
      
      // 添加缓存头信息
      res.setHeader('X-Cache-Status', 'MISS');
      
      // 缓存成功响应或配置为缓存错误响应时的响应
      const shouldCache = cacheError || (res.statusCode >= 200 && res.statusCode < 300);
      
      if (shouldCache) {
        // 存储响应到缓存
        cache.set(
          cacheKey, 
          {
            body,
            statusCode: res.statusCode,
            timestamp: new Date().toISOString()
          }, 
          duration
        );
        console.log(`[缓存已设置] ${req.originalUrl}, TTL: ${duration}秒`);
      }
      
      // 继续发送响应
      res.sendResponse(body);
    };
    
    next();
  };
}

/**
 * 清除指定路径的缓存
 * @param {string} path - 要清除的路径模式，可以是完整路径或路径前缀
 * @returns {number} 清除的键数量
 */
function clearCache(path) {
  if (!path) {
    // 清除所有缓存
    const stats = cache.getStats();
    cache.flushAll();
    console.log(`[缓存已清空] 共${stats.keys}个键`);
    return stats.keys;
  }
  
  // 获取所有键
  const keys = cache.keys();
  let clearedCount = 0;
  
  // 清除匹配路径的缓存
  keys.forEach(key => {
    if (key.includes(path)) {
      cache.del(key);
      clearedCount++;
    }
  });
  
  console.log(`[缓存已清除] 路径: ${path}, 共${clearedCount}个键`);
  return clearedCount;
}

/**
 * 获取缓存统计信息
 * @returns {object} 缓存统计信息
 */
function getCacheStats() {
  return cache.getStats();
}

// 导出
const cacheMiddleware = {
  create: createCacheMiddleware,
  clear: clearCache,
  stats: getCacheStats
};

export default cacheMiddleware;
