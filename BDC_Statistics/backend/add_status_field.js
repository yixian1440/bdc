import db from './config/database.js';

async function addStatusField() {
  try {
    console.log('使用现有数据库连接池');
    
    // 执行SQL语句，添加status字段
    const sql = 'ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT \'正常\' NOT NULL';
    const [result] = await db.execute(sql);
    
    console.log('SQL执行成功:', result);
    console.log('成功在users表中添加status字段');
  } catch (error) {
    console.error('执行SQL失败:', error);
    process.exit(1);
  }
}

addStatusField();