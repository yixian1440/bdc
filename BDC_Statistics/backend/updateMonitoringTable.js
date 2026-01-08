import db from './config/database.js';

async function updateMonitoringTable() {
    try {
        console.log('更新system_monitoring表结构...');
        
        // 添加新列
        await db.execute(`
            ALTER TABLE system_monitoring
            ADD COLUMN username VARCHAR(255) DEFAULT NULL,
            ADD COLUMN ip_address VARCHAR(50) DEFAULT NULL,
            ADD COLUMN mac_address VARCHAR(50) DEFAULT NULL
        `);
        
        console.log('✓ 成功添加新列到system_monitoring表');
        
        // 验证更新结果
        const [rows] = await db.execute('DESCRIBE system_monitoring');
        console.log('\n更新后的表结构:');
        console.table(rows);
        
    } catch (error) {
        console.error('更新表失败:', error);
    } finally {
        process.exit();
    }
}

updateMonitoringTable();
