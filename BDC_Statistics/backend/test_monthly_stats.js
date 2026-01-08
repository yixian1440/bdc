import db from './config/database.js';

async function testMonthlyStats() {
    try {
        console.log('测试按月统计查询...');
        
        // 测试管理员查询
        const adminQuery = `
            SELECT 
                DATE_FORMAT(case_date, '%Y-%m') as month,
                COALESCE(u.real_name, c.agent, d.agent) as receiver_name,
                COUNT(*) as case_count
            FROM cases c
            LEFT JOIN users u ON (c.receiver_id = u.id OR c.user_id = u.id)
            LEFT JOIN developers d ON c.developer = d.developer_name
            WHERE DATE(case_date) >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY month, COALESCE(u.real_name, c.agent, d.agent)
            ORDER BY month DESC, case_count DESC
        `;
        
        console.log('执行管理员查询...');
        const [adminResult] = await db.execute(adminQuery);
        console.log('管理员查询结果:', adminResult);
        console.log('管理员查询结果数量:', adminResult.length);
        
        // 测试简单查询
        const simpleQuery = `
            SELECT 
                DATE_FORMAT(case_date, '%Y-%m') as month,
                COUNT(*) as case_count
            FROM cases 
            WHERE DATE(case_date) >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY month
            ORDER BY month DESC
        `;
        
        console.log('执行简单查询...');
        const [simpleResult] = await db.execute(simpleQuery);
        console.log('简单查询结果:', simpleResult);
        console.log('简单查询结果数量:', simpleResult.length);
        
        // 测试案件总数
        const countQuery = 'SELECT COUNT(*) as total FROM cases WHERE DATE(case_date) >= DATE_SUB(NOW(), INTERVAL 6 MONTH)';
        const [countResult] = await db.execute(countQuery);
        console.log('最近六个月案件总数:', countResult[0].total);
        
    } catch (error) {
        console.error('测试失败:', error);
        console.error('错误堆栈:', error.stack);
    } finally {
        process.exit(0);
    }
}

testMonthlyStats();
