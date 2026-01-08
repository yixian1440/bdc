// 简单的同步脚本，用于从所有开发商转移案件中提取代理人信息和联系方式
// 直接在服务器中运行，确保在ESM模块模式下工作

import db from '../config/database.js';

// 立即执行函数
(async () => {
    console.log('开始简单同步脚本...');
    
    try {
        // 1. 查询所有开发商转移案件
        const [cases] = await db.execute(`
            SELECT developer, agent, contact_phone 
            FROM cases 
            WHERE case_type IN ('开发商转移', '开发商转移登记') 
            AND developer IS NOT NULL AND developer != ''
            ORDER BY created_at DESC
        `);
        
        console.log(`找到 ${cases.length} 条开发商转移案件`);
        
        // 2. 提取独特的开发商信息
        const developerMap = new Map();
        
        for (const caseItem of cases) {
            const { developer, agent, contact_phone } = caseItem;
            
            // 只保留每个开发商的第一条记录（最新的）
            if (!developerMap.has(developer)) {
                developerMap.set(developer, { agent, contact_phone });
            }
        }
        
        console.log(`提取到 ${developerMap.size} 个独特的开发商`);
        
        // 3. 同步到developers表
        let successCount = 0;
        let errorCount = 0;
        
        for (const [developer, info] of developerMap.entries()) {
            const { agent, contact_phone } = info;
            
            try {
                // 使用正确的字段名，为必填的project_name字段提供值
                await db.execute(`
                    INSERT INTO developers (name, project_name, contact_person, contact_phone) 
                    VALUES (?, ?, ?, ?) 
                    ON DUPLICATE KEY UPDATE 
                        contact_person = VALUES(contact_person), 
                        contact_phone = VALUES(contact_phone)
                `, [developer, developer, agent, contact_phone]);
                
                successCount++;
                console.log(`✓ 同步成功: ${developer}`);
            } catch (err) {
                errorCount++;
                console.error(`✗ 同步失败: ${developer} - ${err.message}`);
            }
        }
        
        console.log(`\n同步完成: 成功 ${successCount} 个，失败 ${errorCount} 个`);
        
        // 4. 验证结果
        const [result] = await db.execute('SELECT COUNT(*) as count FROM developers');
        console.log(`\ndevelopers表中共有 ${result[0].count} 条记录`);
        
    } catch (error) {
        console.error('同步过程中发生错误:', error);
    }
})();
