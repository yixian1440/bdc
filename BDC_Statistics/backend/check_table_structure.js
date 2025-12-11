import db from './config/database.js';

async function checkTableStructure() {
    try {
        // 查询cases表的结构
        const [rows] = await db.execute('DESCRIBE cases');
        console.log('cases表结构:');
        console.table(rows);
        
        // 查询是否有developer字段
        const [columns] = await db.execute('SHOW COLUMNS FROM cases LIKE "developer"');
        if (columns.length > 0) {
            console.log('\ncases表中存在developer字段:');
            console.table(columns);
        } else {
            console.log('\ncases表中不存在developer字段');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('查询表结构失败:', error);
        process.exit(1);
    }
}

checkTableStructure();