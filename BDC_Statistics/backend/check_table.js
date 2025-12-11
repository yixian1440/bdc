import db from './config/database.js';

async function checkTableStructure() {
  try {
    // 查询cases表的结构
    const [columns] = await db.execute('DESCRIBE cases');
    console.log('Cases表结构:');
    columns.forEach(col => {
      console.log(`${col.Field} - ${col.Type} - ${col.Null}`);
    });
    
    // 查询cases表的实际数据，了解数据格式
    const [data] = await db.execute('SELECT * FROM cases LIMIT 5');
    console.log('\nCases表数据示例:');
    console.log(data);
    
    process.exit(0);
  } catch (error) {
    console.error('查询表结构失败:', error);
    process.exit(1);
  }
}

checkTableStructure();