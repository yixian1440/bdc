import db from '../config/database.js';

/**
 * 从所有开发商转移案件中提取代理人信息和联系方式，同步到developers表
 */
async function syncDevelopersFromCases() {
    console.log('\n=====================================');
    console.log('开始从所有开发商转移案件中同步代理人信息到developers表');
    console.log('=====================================');
    
    try {
        // 1. 查询所有开发商转移案件中的独特开发商信息
        console.log('\n1. 查询所有开发商转移案件中的独特开发商...');
        
        // 先检查数据库连接
        console.log('检查数据库连接...');
        const [testResult] = await db.execute('SELECT 1 AS test');
        console.log('数据库连接正常:', testResult);
        
        // 查询开发商转移案件
        const query = `
            SELECT DISTINCT 
                c.developer,
                c.agent,
                c.contact_phone
            FROM cases c 
            WHERE c.developer IS NOT NULL AND c.developer != ''
            AND c.case_type IN ('开发商转移', '开发商转移登记')
            AND (c.agent IS NOT NULL AND c.agent != '' OR c.contact_phone IS NOT NULL AND c.contact_phone != '')
            ORDER BY c.created_at DESC
        `;
        
        console.log('执行查询语句:', query);
        const [cases] = await db.execute(query);
        
        console.log(`查询完成: 找到 ${cases.length} 条独特的开发商信息记录`);
        
        // 如果没有找到记录，直接返回
        if (cases.length === 0) {
            console.log('没有找到需要同步的开发商信息记录');
            return {
                success: true,
                total: 0,
                inserted: 0,
                updated: 0,
                skipped: 0,
                errors: 0,
                finalCount: 0
            };
        }
        
        // 显示前5条记录作为示例
        console.log('\n前5条记录示例:');
        cases.slice(0, 5).forEach((item, index) => {
            console.log(`${index + 1}. 开发商: ${item.developer}, 代理人: ${item.agent || '无'}, 联系方式: ${item.contact_phone || '无'}`);
        });
        
        // 2. 处理每条记录，同步到developers表
        console.log('\n2. 同步到developers表...');
        
        // 统计结果
        let totalProcessed = 0;
        let insertedCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        
        // 用于跟踪已处理的开发商，避免重复处理
        const processedDevelopers = new Set();
        
        for (const caseItem of cases) {
            const { developer, agent, contact_phone } = caseItem;
            
            // 跳过已处理的开发商，只处理每个开发商的第一条记录（最新的）
            if (processedDevelopers.has(developer)) {
                skippedCount++;
                continue;
            }
            processedDevelopers.add(developer);
            
            totalProcessed++;
            
            try {
                // 插入或更新developers表
                const insertQuery = `
                    INSERT INTO developers (developer_name, agent, contact_phone) 
                    VALUES (?, ?, ?) 
                    ON DUPLICATE KEY UPDATE 
                        agent = VALUES(agent), 
                        contact_phone = VALUES(contact_phone),
                        last_updated = CURRENT_TIMESTAMP
                `;
                
                console.log(`\n处理第 ${totalProcessed} 个开发商: ${developer}`);
                console.log(`  代理人: ${agent || '无'}`);
                console.log(`  联系方式: ${contact_phone || '无'}`);
                
                const [result] = await db.execute(insertQuery, [developer, agent, contact_phone]);
                
                if (result.affectedRows === 1) {
                    // 插入操作
                    insertedCount++;
                    console.log(`  结果: ✓ 新增记录`);
                } else if (result.affectedRows === 2) {
                    // 更新操作
                    updatedCount++;
                    console.log(`  结果: ✓ 更新记录`);
                } else {
                    skippedCount++;
                    console.log(`  结果: ⚠ 跳过，没有变化`);
                }
            } catch (err) {
                errorCount++;
                console.error(`  结果: ✗ 失败 - ${err.message}`);
                // 继续处理下一条记录
            }
        }
        
        // 3. 统计结果
        console.log('\n3. 同步完成，统计结果:');
        console.log('=====================================');
        console.log(`总处理开发商数: ${totalProcessed}`);
        console.log(`新增记录数: ${insertedCount}`);
        console.log(`更新记录数: ${updatedCount}`);
        console.log(`跳过记录数: ${skippedCount}`);
        console.log(`错误记录数: ${errorCount}`);
        console.log('=====================================');
        
        // 4. 验证同步结果
        console.log('\n4. 验证同步结果...');
        const [developers] = await db.execute('SELECT COUNT(*) as count FROM developers');
        const developersCount = developers[0].count;
        console.log(`当前developers表中共有 ${developersCount} 条记录`);
        
        // 显示部分developers表中的数据
        const [sampleDevelopers] = await db.execute('SELECT * FROM developers LIMIT 5');
        console.log('\ndevelopers表中的前5条记录:');
        sampleDevelopers.forEach((dev, index) => {
            console.log(`${index + 1}. 开发商: ${dev.developer_name}, 代理人: ${dev.agent || '无'}, 联系方式: ${dev.contact_phone || '无'}`);
        });
        
        console.log('\n=====================================');
        console.log('🎉 从所有开发商转移案件同步代理人信息到developers表完成！');
        console.log('=====================================');
        
        return {
            success: true,
            total: totalProcessed,
            inserted: insertedCount,
            updated: updatedCount,
            skipped: skippedCount,
            errors: errorCount,
            finalCount: developersCount
        };
    } catch (error) {
        console.error('\n=====================================');
        console.error('❌ 同步开发商信息失败:');
        console.error('错误信息:', error.message);
        console.error('错误堆栈:', error.stack);
        console.error('=====================================');
        return {
            success: false,
            error: error.message
        };
    }
}

// 执行脚本
if (import.meta.url === `file://${process.argv[1]}`) {
    syncDevelopersFromCases().then(result => {
        if (result.success) {
            console.log('\n同步成功！');
            process.exit(0);
        } else {
            console.error('\n同步失败！', result.error);
            process.exit(1);
        }
    });
}

export default syncDevelopersFromCases;
