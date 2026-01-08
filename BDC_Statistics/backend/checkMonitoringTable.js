import db from './config/database.js';

async function checkMonitoringTable() {
    try {
        console.log('检查system_monitoring表结构...');
        const [rows] = await db.execute('DESCRIBE system_monitoring');
        console.table(rows);
        
        console.log('\n检查system_monitoring表数据...');
        const [data] = await db.execute('SELECT * FROM system_monitoring LIMIT 5');
        console.table(data);
    } catch (error) {
        console.error('错误:', error);
        console.log('\n创建system_monitoring表...');
        await createMonitoringTable();
    } finally {
        process.exit();
    }
}

async function createMonitoringTable() {
    try {
        await db.execute(`
            CREATE TABLE IF NOT EXISTS system_monitoring (
                id INT(11) AUTO_INCREMENT PRIMARY KEY,
                cpu_usage FLOAT DEFAULT 0,
                memory_usage FLOAT DEFAULT 0,
                disk_usage FLOAT DEFAULT 0,
                network_in BIGINT DEFAULT 0,
                network_out BIGINT DEFAULT 0,
                process_count INT DEFAULT 0,
                active_connections INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✓ 创建了system_monitoring表');
        
        // 验证创建结果
        const [rows] = await db.execute('DESCRIBE system_monitoring');
        console.log('\n创建后的表结构:');
        console.table(rows);
    } catch (error) {
        console.error('创建表失败:', error);
    }
}

checkMonitoringTable();
