/**
 * 异步操作优化工具模块
 * 提供并行查询和优化的分页功能
 */

/**
 * 并行执行多个不相互依赖的数据库查询
 * @param {Array<Array>} queries - 查询数组，每个元素是[sql, params]格式
 * @param {object} db - 数据库连接池实例
 * @returns {Promise<Array>} 包含所有查询结果的数组
 */
export async function parallelQueries(queries, db) {
  if (!Array.isArray(queries)) {
    throw new Error('queries must be an array');
  }
  
  console.log(`[并行查询] 开始执行 ${queries.length} 个查询`);
  const startTime = Date.now();
  
  try {
    // 使用Promise.all并行执行所有查询
    const promises = queries.map(async ([sql, params]) => {
      try {
        const queryStartTime = Date.now();
        const [results] = await db.execute(sql, params);
        const queryDuration = Date.now() - queryStartTime;
        
        // 记录慢查询（超过100ms）
        if (queryDuration > 100) {
          console.warn(`[慢查询警告] ${queryDuration}ms: ${sql}`);
        }
        
        return results;
      } catch (error) {
        console.error(`[查询失败] ${sql}`, error);
        throw error; // 继续抛出错误，以便Promise.all可以捕获
      }
    });
    
    // 等待所有查询完成
    const results = await Promise.all(promises);
    const totalDuration = Date.now() - startTime;
    
    console.log(`[并行查询] 所有查询完成，耗时: ${totalDuration}ms`);
    return results;
  } catch (error) {
    console.error('[并行查询] 执行失败:', error);
    throw error;
  }
}

/**
 * 优化的分页查询函数，支持表连接
 * @param {object} db - 数据库连接池实例
 * @param {string} table - 表名
 * @param {object} options - 查询选项
 * @param {number} options.page - 当前页码，默认为1
 * @param {number} options.pageSize - 每页记录数，默认为20，最大为100
 * @param {object} options.filters - 过滤条件对象
 * @param {object} options.sort - 排序条件，{field: '字段名', direction: 'ASC|DESC'}
 * @param {Array<string>} options.fields - 要查询的字段列表，默认'*'
 * @param {object|Array<object>} options.join - 表连接配置，{table, as, condition, type}
 * @returns {Promise<object>} 分页查询结果
 */
export async function paginatedQuery(db, table, options = {}) {
  const {
    page = 1,
    pageSize = 20,
    filters = {},
    sort = { field: 'id', direction: 'DESC' },
    fields = ['*'],
    join = null
  } = options;
  
  // 验证和安全检查
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safePageSize = Math.max(1, Math.min(100, parseInt(pageSize, 10) || 20));
  const offset = (safePage - 1) * safePageSize;
  
  // 构建字段列表
  const fieldsList = Array.isArray(fields) ? fields.join(', ') : fields;
  
  // 构建JOIN子句
  let joinClause = '';
  const joins = Array.isArray(join) ? join : (join ? [join] : []);
  if (joins.length > 0) {
    joinClause = joins.map(j => {
      const joinType = j.type || 'JOIN';
      const tableName = j.table;
      const alias = j.as ? `AS ${j.as}` : '';
      const condition = j.condition;
      return `${joinType} ${tableName} ${alias} ON ${condition}`;
    }).join(' ');
  }
  
  // 构建WHERE子句
  const filterKeys = Object.keys(filters);
  let whereClause = '';
  const params = [];
  
  if (filterKeys.length > 0) {
    whereClause = 'WHERE ' + filterKeys.map((key, index) => {
      const value = filters[key];
      
      // 处理特殊的查询操作符
      if (typeof value === 'object' && value !== null) {
        if (value.$eq !== undefined) {
          params.push(value.$eq);
          return `${key} = ?`;
        } else if (value.$like !== undefined) {
          params.push('%' + value.$like + '%');
          return `${key} LIKE ?`;
        } else if (value.$in !== undefined && Array.isArray(value.$in)) {
          const placeholders = value.$in.map(() => '?').join(', ');
          params.push(...value.$in);
          return `${key} IN (${placeholders})`;
        } else if (value.$gt !== undefined) {
          params.push(value.$gt);
          return `${key} > ?`;
        } else if (value.$gte !== undefined) {
          params.push(value.$gte);
          return `${key} >= ?`;
        } else if (value.$lt !== undefined) {
          params.push(value.$lt);
          return `${key} < ?`;
        } else if (value.$lte !== undefined) {
          params.push(value.$lte);
          return `${key} <= ?`;
        } else if (value.$between !== undefined && Array.isArray(value.$between) && value.$between.length === 2) {
          params.push(value.$between[0], value.$between[1]);
          return `${key} BETWEEN ? AND ?`;
        }
      }
      
      // 默认等于操作
      params.push(value);
      return `${key} = ?`;
    }).join(' AND ');
  }
  
  // 构建ORDER BY子句
  const orderByClause = `ORDER BY ${sort.field} ${sort.direction === 'ASC' ? 'ASC' : 'DESC'}`;
  
  // 构建查询SQL
  const selectSql = `SELECT ${fieldsList} FROM ${table} ${joinClause} ${whereClause} ${orderByClause} LIMIT ? OFFSET ?`;
  
  // 对于JOIN查询，COUNT需要特别处理
  const countTable = joins.length > 0 ? `(SELECT 1 FROM ${table} ${joinClause} ${whereClause})` : table;
  const countSql = `SELECT COUNT(*) as total FROM ${countTable}`;
  
  // 准备查询参数
  const selectParams = [...params, safePageSize, offset];
  // COUNT查询不需要LIMIT和OFFSET参数，但需要WHERE子句的参数
  const countParams = [...params];
  
  console.log(`[分页查询] 表: ${table}, 页码: ${safePage}, 每页: ${safePageSize}`);
  const startTime = Date.now();
  
  try {
    // 并行执行数据查询和总数查询
    const [results, countResults] = await Promise.all([
      db.execute(selectSql, selectParams),
      db.execute(countSql, countParams)
    ]);
    
    const total = countResults[0][0].total || 0;
    const totalPages = Math.ceil(total / safePageSize);
    const duration = Date.now() - startTime;
    
    console.log(`[分页查询] 完成, 找到 ${total} 条记录, 耗时: ${duration}ms`);
    
    return {
      data: results[0],
      pagination: {
        page: safePage,
        pageSize: safePageSize,
        total,
        totalPages,
        hasNext: safePage < totalPages,
        hasPrev: safePage > 1
      },
      meta: {
        queryTime: duration + 'ms',
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error(`[分页查询] 失败: ${table}`, error);
    throw error;
  }
}

/**
 * 批量执行数据库操作
 * @param {object} db - 数据库连接池实例
 * @param {string} sql - SQL语句模板
 * @param {Array<Array>} paramsArray - 参数数组，每个元素是参数数组
 * @param {number} batchSize - 批次大小，默认50
 * @returns {Promise<Array>} 所有操作的结果
 */
export async function batchExecute(db, sql, paramsArray, batchSize = 50) {
  if (!Array.isArray(paramsArray)) {
    throw new Error('paramsArray must be an array');
  }
  
  const totalItems = paramsArray.length;
  console.log(`[批量执行] 开始处理 ${totalItems} 条记录，批次大小: ${batchSize}`);
  
  const allResults = [];
  const startTime = Date.now();
  
  try {
    // 分批次处理
    for (let i = 0; i < totalItems; i += batchSize) {
      const batch = paramsArray.slice(i, i + batchSize);
      
      // 并行执行当前批次的所有操作
      const batchPromises = batch.map(params => db.execute(sql, params));
      const batchResults = await Promise.all(batchPromises);
      
      allResults.push(...batchResults);
      console.log(`[批量执行] 批次 ${Math.floor(i / batchSize) + 1} 完成，已处理 ${Math.min(i + batchSize, totalItems)} / ${totalItems}`);
    }
    
    const totalDuration = Date.now() - startTime;
    console.log(`[批量执行] 所有 ${totalItems} 条记录处理完成，耗时: ${totalDuration}ms`);
    
    return allResults;
  } catch (error) {
    console.error(`[批量执行] 失败`, error);
    throw error;
  }
}

/**
 * 带超时的异步操作
 * @param {Promise} promise - 要执行的Promise
 * @param {number} ms - 超时时间（毫秒）
 * @param {string} message - 超时错误消息
 * @returns {Promise} 包装后的Promise
 */
export function withTimeout(promise, ms, message = '操作超时') {
  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
  
  return Promise.race([promise, timeout]);
}

export default {
  parallelQueries,
  paginatedQuery,
  batchExecute,
  withTimeout
};
