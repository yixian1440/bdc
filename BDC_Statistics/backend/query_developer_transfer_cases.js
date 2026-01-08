import db from './config/database.js';

async function queryDeveloperTransferCases() {
    try {
        // 获取今天的日期，格式为YYYY-MM-DD
        const today = new Date().toISOString().split('T')[0];
        console.log(`查询日期: ${today}`);
        console.log('查询类型: 开发商转移件');
        console.log('查询内容: 按收件人分组的分配数量\n');
        
        // 执行SQL查询：查询今天的开发商转移件，按收件人分组统计数量
        const [results] = await db.execute(`
            SELECT 
                receiver as 收件人,
                COUNT(*) as 分配数量
            FROM 
                cases
            WHERE 
                case_type IN ('开发商转移', '开发商转移登记')
                AND DATE(created_at) = ?
            GROUP BY 
                receiver
            ORDER BY 
                分配数量 DESC
        `, [today]);
        
        if (results.length === 0) {
            console.log('今天没有开发商转移件分配记录');
        } else {
            console.log('查询结果:');
            console.table(results);
            
            // 计算总数量
            const total = results.reduce((sum, item) => sum + item['分配数量'], 0);
            console.log(`\n总分配数量: ${total}`);
        }
        
        process.exit(0);
    } catch (error) {
        console.error('查询失败:', error);
        process.exit(1);
    }
}

queryDeveloperTransferCases();
