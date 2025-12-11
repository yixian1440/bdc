import mysql from 'mysql2/promise';

// 使用环境变量获取数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'BDC123',
  database: process.env.DB_NAME || 'bdc_statistics',
  port: parseInt(process.env.DB_PORT) || 3306,
  charset: 'utf8mb4'
};

// 创建数据库连接池
const pool = mysql.createPool({
  ...dbConfig,
  // 连接池优化配置
  waitForConnections: true,
  connectionLimit: 20,        // 最大连接数，支持10+并发用户
  queueLimit: 100,            // 最大等待队列长度
  idleTimeout: 60000,         // 空闲连接超时时间（60秒）
  enableKeepAlive: true,      // 启用连接保活
  keepAliveInitialDelay: 10000 // 保活初始延迟（10秒）
});

// 添加连接池状态监控（可选）
pool.on('connection', function(connection) {
  console.log('数据库连接已创建');
  
  connection.on('error', function(err) {
    console.error('数据库连接错误:', err);
  });
  
  connection.on('close', function(err) {
    console.log('数据库连接已关闭');
  });
});

// 导出数据库连接池
export default pool;

// 保留原有的创建连接函数
export const createConnection = async () => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    console.log('数据库连接成功');
    return connection;
  } catch (error) {
    console.error('数据库连接失败:', error);
    throw error;
  }
};