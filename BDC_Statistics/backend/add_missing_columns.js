import db from './config/database.js';

async function addMissingColumns() {
    try {
        console.log('开始添加缺失的列...');
        
        // 尝试添加 real_name 列
        console.log('添加 real_name 列...');
        try {
            await db.execute("ALTER TABLE system_logs ADD COLUMN real_name VARCHAR(100);");
            console.log('real_name 列添加成功！');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('real_name 列已存在，跳过...');
            } else {
                console.error('添加 real_name 列失败:', error.message);
            }
        }
        
        // 尝试添加 agent_name 列
        console.log('添加 agent_name 列...');
        try {
            await db.execute("ALTER TABLE system_logs ADD COLUMN agent_name VARCHAR(100);");
            console.log('agent_name 列添加成功！');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('agent_name 列已存在，跳过...');
            } else {
                console.error('添加 agent_name 列失败:', error.message);
            }
        }
        
        // 查看表结构
        console.log('\n查看更新后的表结构...');
        const [columns] = await db.execute("DESCRIBE system_logs");
        console.log('system_logs 表结构：');
        columns.forEach(column => {
            console.log(`${column.Field} (${column.Type}) ${column.Null === 'NO' ? 'NOT NULL' : ''}`);
        });
        
        console.log('\n操作完成！');
        
    } catch (error) {
        console.error('执行过程中出错:', error);
    } finally {
        // 关闭数据库连接
        process.exit(0);
    }
}

addMissingColumns();
