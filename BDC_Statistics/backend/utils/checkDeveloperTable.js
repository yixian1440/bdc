import db from '../config/database.js';

(async () => {
    try {
        console.log('开始检查developers表结构...');
        
        // 查询developers表结构
        const [columns] = await db.execute('DESCRIBE developers');
        
        console.log('developers表结构:');
        columns.forEach(column => {
            console.log(`${column.Field} (${column.Type}) - ${column.Null === 'YES' ? '允许NULL' : '不允许NULL'} - ${column.Key || '无索引'}`);
        });
        
        // 查询前5条记录
        const [rows] = await db.execute('SELECT * FROM developers LIMIT 5');
        
        console.log('\ndevelopers表前5条记录:');
        rows.forEach((row, index) => {
            console.log(`${index + 1}. ${JSON.stringify(row)}`);
        });
        
    } catch (error) {
        console.error('检查developers表结构失败:', error);
    }
})();
