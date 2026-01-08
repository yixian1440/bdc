// 检查数据库中的用户数量
import db from './config/database.js';

async function checkUsers() {
    try {
        console.log('开始检查数据库中的用户数量...');
        
        // 查询用户总数
        const [users] = await db.execute('SELECT id, real_name, role FROM users');
        
        console.log('查询结果:', users);
        console.log('用户总数:', users.length);
        
        if (users.length === 0) {
            console.log('警告: 数据库中没有用户记录，在线用户数将显示为0');
        } else {
            console.log('数据库中有用户记录，在线用户数应该显示为:', users.length);
            console.log('用户列表:');
            users.forEach(user => {
                console.log(`  - ID: ${user.id}, 姓名: ${user.real_name}, 角色: ${user.role}`);
            });
        }
        
        // 关闭数据库连接
        await db.end();
        
    } catch (error) {
        console.error('检查用户数量失败:', error);
        
        // 关闭数据库连接
        try {
            await db.end();
        } catch (closeError) {
            console.error('关闭数据库连接失败:', closeError);
        }
    }
}

// 执行函数
checkUsers();
