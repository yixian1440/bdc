import db from './config/database.js';

async function updateTable() {
    try {
        console.log('开始更新system_logs表结构...');
        
        // 添加缺少的字段
        await db.execute('ALTER TABLE system_logs ADD COLUMN username VARCHAR(255) DEFAULT NULL');
        console.log('✓ 添加了username字段');
        
        await db.execute('ALTER TABLE system_logs ADD COLUMN description TEXT DEFAULT NULL');
        console.log('✓ 添加了description字段');
        
        await db.execute('ALTER TABLE system_logs ADD COLUMN ip_address VARCHAR(50) DEFAULT NULL');
        console.log('✓ 添加了ip_address字段');
        
        await db.execute('ALTER TABLE system_logs ADD COLUMN user_agent TEXT DEFAULT NULL');
        console.log('✓ 添加了user_agent字段');
        
        await db.execute('ALTER TABLE system_logs ADD COLUMN level VARCHAR(20) DEFAULT \'info\'');
        console.log('✓ 添加了level字段');
        
        console.log('\n表结构更新完成！');
        
        // 验证更新后的表结构
        console.log('\n更新后的表结构:');
        const [rows] = await db.execute('DESCRIBE system_logs');
        console.table(rows);
        
    } catch (error) {
        console.error('更新表结构失败:', error);
    } finally {
        process.exit();
    }
}

updateTable();
