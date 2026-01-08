import db from './config/database.js';

async function checkTable() {
    try {
        console.log('检查system_logs表结构...');
        const [rows] = await db.execute('DESCRIBE system_logs');
        console.table(rows);
        
        console.log('\n检查system_logs表数据...');
        const [data] = await db.execute('SELECT * FROM system_logs LIMIT 5');
        console.table(data);
    } catch (error) {
        console.error('错误:', error);
    } finally {
        process.exit();
    }
}

checkTable();
