import express from 'express';
import db from '../config/database.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// 确保JWT密钥与auth.js中使用相同的值
const JWT_SECRET = process.env.JWT_SECRET || 'bdc_statistics_secure_jwt_secret_key_2024';

// 认证中间件
const authenticateToken = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            console.error('未提供认证令牌');
            return res.status(401).json({ error: '需要认证', message: '未提供认证令牌' });
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
            console.log('认证成功，用户ID:', decoded.id, '角色:', decoded.role);
            next();
        } catch (error) {
            console.error('无效的认证令牌:', error.message);
            return res.status(403).json({ error: '无效的认证令牌', message: error.message });
        }
    } catch (error) {
        console.error('认证中间件错误:', error.message);
        return res.status(500).json({ error: '内部服务器错误', message: error.message });
    }
};

// 验证是否为管理员的中间件
const verifyAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== '管理员') {
        return res.status(403).json({ error: '只有管理员可以访问此功能' });
    }
    next();
};

/**
 * 获取开发商项目列表（兼容现有功能）
 */
router.get('/projects', async (req, res) => {
    try {
        // 查询所有开发商，优先从developers表获取，确保能看到所有维护的开发商
        const query = `
            SELECT DISTINCT project_name 
            FROM developers 
            WHERE project_name IS NOT NULL AND project_name != ''
            ORDER BY project_name ASC
        `;
        
        const [developers] = await db.execute(query);
        
        res.json({
            projects: developers.map(dev => ({ id: dev.project_name, project_name: dev.project_name }))
        });
    } catch (error) {
        console.error('获取开发商项目列表失败:', error);
        res.status(500).json({
            error: '获取开发商项目列表失败'
        });
    }
});

/**
 * 获取开发商列表，用于展示联系簿（管理员功能）
 */
router.get('/', authenticateToken, verifyAdmin, async (req, res) => {
    try {
        // 查询developers表，根据project_name去重，只显示一条记录
        // 开发商名称使用project_name字段
        // 使用GROUP BY和聚合函数确保每个project_name只显示一条记录
        const query = `
            SELECT 
                project_name AS developer, 
                project_name, 
                MAX(contact_person) AS agent, 
                MAX(contact_phone) AS contact_phone 
            FROM developers 
            GROUP BY project_name 
            ORDER BY project_name ASC
        `;
        
        const [developers] = await db.execute(query);
        
        res.json({
            success: true,
            data: developers
        });
    } catch (error) {
        console.error('获取开发商列表失败:', error);
        res.status(500).json({
            success: false,
            message: '获取开发商列表失败',
            error: error.message
        });
    }
});

/**
 * 同步开发商信息，从最近的开发商转移案件获取代理人和联系方式
 */
router.post('/sync', authenticateToken, verifyAdmin, async (req, res) => {
    try {
        // 首先获取所有唯一的开发商名称
        const [uniqueDevelopers] = await db.execute(`
            SELECT DISTINCT developer 
            FROM cases 
            WHERE developer IS NOT NULL AND developer != ''
        `);
        
        // 统计同步结果
        let totalDevelopers = uniqueDevelopers.length;
        let syncedDevelopers = 0;
        let failedDevelopers = 0;
        let skippedDevelopers = 0;
        
        // 遍历每个开发商，同步最新的代理人和联系方式
        for (const dev of uniqueDevelopers) {
            const developerName = dev.developer;
            
            try {
                // 查询该开发商所有开发商转移案件，找到有代理人和联系方式的记录
                const [latestCase] = await db.execute(`
                    SELECT agent, contact_phone 
                    FROM cases 
                    WHERE developer = ? 
                    AND case_type IN ('开发商转移', '开发商转移登记')
                    AND (agent IS NOT NULL AND agent != '' OR contact_phone IS NOT NULL AND contact_phone != '')
                    ORDER BY created_at DESC 
                    LIMIT 1
                `, [developerName]);
                
                if (latestCase.length > 0) {
                    const { agent, contact_phone } = latestCase[0];
                    
                    // 1. 同步到所有该开发商的案件中
                    const [updateCasesResult] = await db.execute(`
                        UPDATE cases 
                        SET agent = ?, contact_phone = ? 
                        WHERE developer = ? 
                        AND case_type IN ('开发商转移', '开发商转移登记')
                    `, [agent, contact_phone, developerName]);
                    
                    // 2. 同步到developers表中（插入或更新）
                    try {
                        // 使用正确的字段名：name, project_name, contact_person, contact_phone
                        await db.execute(`
                            INSERT INTO developers (name, project_name, contact_person, contact_phone) 
                            VALUES (?, ?, ?, ?) 
                            ON DUPLICATE KEY UPDATE 
                                contact_person = VALUES(contact_person), 
                                contact_phone = VALUES(contact_phone),
                                updated_at = CURRENT_TIMESTAMP
                        `, [developerName, developerName, agent, contact_phone]);
                    } catch (err) {
                        console.error(`同步到developers表失败: ${developerName}`, err.message);
                        // 继续执行，不影响cases表的同步
                    }
                    
                    if (updateCasesResult.affectedRows > 0) {
                        syncedDevelopers++;
                        console.log(`成功同步开发商: ${developerName}，更新了 ${updateCasesResult.affectedRows} 条记录`);
                    } else {
                        skippedDevelopers++;
                        console.log(`跳过开发商: ${developerName}，没有需要更新的记录`);
                    }
                } else {
                    skippedDevelopers++;
                    console.log(`跳过开发商: ${developerName}，没有找到有效的代理人和联系方式`);
                }
            } catch (err) {
                failedDevelopers++;
                console.error(`同步开发商 ${developerName} 失败:`, err);
            }
        }
        
        res.json({
            success: true,
            message: '开发商信息同步完成',
            stats: {
                total: totalDevelopers,
                synced: syncedDevelopers,
                failed: failedDevelopers,
                skipped: skippedDevelopers
            }
        });
    } catch (error) {
        console.error('同步开发商信息失败:', error);
        res.status(500).json({
            success: false,
            message: '同步开发商信息失败',
            error: error.message
        });
    }
});

export default router;
