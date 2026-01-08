import db from './config/database.js';

/**
 * 创建系统日志相关的数据库表
 */
async function createLogTables() {
    try {
        console.log('开始创建系统日志相关表结构...');
        
        // 1. 检查是否存在 login_logs 表
        console.log('检查 login_logs 表是否存在...');
        const [loginLogsExists] = await db.execute(
            "SHOW TABLES LIKE 'login_logs'"
        );
        
        if (loginLogsExists.length > 0) {
            console.log('发现 login_logs 表，检查是否有数据...');
            
            // 检查 login_logs 表是否有数据
            const [loginLogsData] = await db.execute(
                "SELECT COUNT(*) as count FROM login_logs"
            );
            
            if (loginLogsData[0].count === 0) {
                console.log('login_logs 表为空，删除并创建 system_logs 表...');
                // 删除空的 login_logs 表
                await db.execute("DROP TABLE IF EXISTS login_logs");
            } else {
                console.log('login_logs 表有数据，将其重命名为 system_logs...');
                // 重命名 login_logs 表为 system_logs
                await db.execute("RENAME TABLE login_logs TO system_logs");
            }
        } else {
            console.log('login_logs 表不存在，创建 system_logs 表...');
        }
        
        // 2. 创建或更新 system_logs 表
        console.log('创建/更新 system_logs 表...');
        await db.execute(`
            CREATE TABLE IF NOT EXISTS system_logs (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT,
                username VARCHAR(50) NOT NULL,
                action VARCHAR(100) NOT NULL,
                description TEXT,
                ip_address VARCHAR(50),
                user_agent TEXT,
                level VARCHAR(20) DEFAULT 'info',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_user_id (user_id),
                INDEX idx_action (action),
                INDEX idx_created_at (created_at),
                INDEX idx_level (level)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        
        console.log('system_logs 表创建/更新成功！');
        
        // 3. 创建 system_monitoring 表
        console.log('创建 system_monitoring 表...');
        await db.execute(`
            CREATE TABLE IF NOT EXISTS system_monitoring (
                id INT PRIMARY KEY AUTO_INCREMENT,
                cpu_usage DECIMAL(5,2),
                memory_usage DECIMAL(5,2),
                disk_usage DECIMAL(5,2),
                network_in BIGINT,
                network_out BIGINT,
                process_count INT,
                active_connections INT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        
        console.log('system_monitoring 表创建成功！');
        
        console.log('\n=== 表结构创建完成 ===');
        console.log('1. system_logs 表 - 用于存储系统操作日志');
        console.log('2. system_monitoring 表 - 用于存储系统监控数据');
        
    } catch (error) {
        console.error('创建表结构失败:', error);
        throw error;
    }
}

// 执行创建表结构
createLogTables().catch(console.error);
