import express from 'express';
import db from '../config/database.js';
import { getUserCreatableCaseTypes } from '../middleware/casePermission.js';
import jwt from 'jsonwebtoken';

// 确保JWT密钥与auth.js中使用相同的值
const JWT_SECRET = process.env.JWT_SECRET || 'bdc_statistics_secure_jwt_secret_key_2024';

const router = express.Router();

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

// 获取案件列表
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 10, pageSize = 10, type, status, start_date, end_date } = req.query;
        // 确保分页参数为整数
        const actualPage = parseInt(page);
        const actualLimit = parseInt(limit) || parseInt(pageSize) || 10;
        const offset = (actualPage - 1) * actualLimit;
        
        // 构建基本查询
        let query = `
            SELECT c.*, u.real_name as creator_name, 
                   CASE 
                       WHEN c.case_type IN ('开发商转移', '开发商转移登记') THEN c.agent 
                       WHEN c.receiver_id IS NOT NULL THEN a.real_name 
                       ELSE u.real_name 
                   END as handler_name 
            FROM cases AS c 
            LEFT JOIN users AS u ON c.user_id = u.id 
            LEFT JOIN users AS a ON c.receiver_id = a.id
            WHERE 1=1
        `;
        
        const params = [];
        
        // 添加过滤条件
        if (type) {
            query += ' AND c.case_type = ?';
            params.push(type);
        }
        
        if (status) {
            query += ' AND c.status = ?';
            params.push(status);
        }
        
        if (start_date && end_date) {
            query += ' AND c.case_date BETWEEN ? AND ?';
            params.push(start_date, end_date);
        }
        
        // 按创建时间倒序排序
        query += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
        params.push(actualLimit, offset);
        
        const [cases] = await db.execute(query, params);
        
        // 获取总记录数
        let countQuery = `
            SELECT COUNT(*) as total 
            FROM cases 
            WHERE 1=1
        `;
        
        const countParams = [];
        if (type) {
            countQuery += ' AND case_type = ?';
            countParams.push(type);
        }
        if (status) {
            countQuery += ' AND status = ?';
            countParams.push(status);
        }
        if (start_date && end_date) {
            countQuery += ' AND case_date BETWEEN ? AND ?';
            countParams.push(start_date, end_date);
        }
        
        const [countResult] = await db.execute(countQuery, countParams);
        const total = countResult[0].total;
        
        // 构建响应数据，确保完全符合Element Plus表格组件的期望格式
        // Element Plus表格组件期望的格式是：{ success: true, data: [...], total: ... }
        const responseData = {
            success: true,
            // 确保包含cases字段，这样收件记录才能正常显示
            cases: cases,
            // 同时返回data字段，符合Element Plus表格组件期望
            data: cases,
            // 确保返回total字段，这是Element Plus表格组件分页必须的
            total: total,
            // 确保返回当前页码，使用page而不是current，符合更多组件的期望
            page: actualPage,
            // 确保返回每页条数，使用pageSize，符合Element Plus等组件的命名
            pageSize: actualLimit
        };
        
        // 返回响应
        res.json(responseData);
    } catch (error) {
        console.error('获取案件列表失败:', error);
        res.status(500).json({
            success: false,
            message: '获取案件列表失败',
            error: error.message
        });
    }
});

// 获取当前用户的案件列表
router.get('/my-cases', authenticateToken, async (req, res) => {
    try {
        console.log('收到获取当前用户案件列表请求:', req.query);
        const userId = req.user?.id;
        console.log('当前用户ID:', userId);
        
        // 检查userId是否存在
        if (!userId) {
            console.error('用户ID不存在');
            return res.status(401).json({
                success: false,
                message: '用户未认证',
                error: 'user_id is null'
            });
        }
        
        const { page = 1, pageSize = 10, limit = 10, viewMode = 'all', sortBy = 'created_at', sortOrder = 'desc' } = req.query;
        // 确保分页参数为整数
        const actualPage = parseInt(page);
        const actualPageSize = parseInt(pageSize) || parseInt(limit);
        const offset = (actualPage - 1) * actualPageSize;
        
        // 验证排序字段和排序顺序
        const validSortFields = ['created_at', 'case_date', 'case_number'];
        const validSortOrders = ['asc', 'desc'];
        const actualSortBy = validSortFields.includes(sortBy) ? sortBy : 'created_at';
        const actualSortOrder = validSortOrders.includes(sortOrder.toLowerCase()) ? sortOrder.toLowerCase() : 'desc';
        
        // 构建基本查询
        let query = `
            SELECT c.*, u.real_name as creator_name, 
                   CASE 
                       WHEN c.case_type IN ('开发商转移', '开发商转移登记') THEN c.agent 
                       WHEN c.receiver_id IS NOT NULL THEN a.real_name 
                       ELSE u.real_name 
                   END as handler_name 
            FROM cases AS c 
            LEFT JOIN users AS u ON c.user_id = u.id 
            LEFT JOIN users AS a ON c.receiver_id = a.id
            WHERE (c.user_id = ? OR c.receiver_id = ?)
        `;
        
        const params = [userId, userId];
        
        // 根据viewMode添加过滤条件
        if (viewMode === 'submitted') {
            // 只显示已提交的案件（根据需求，所有案件状态都是已完成）
            query += ' AND c.status = ?';
            params.push('已完成');
        } else if (viewMode === 'allocated') {
            // 只显示分配给自己的案件
            query += ' AND c.receiver_id = ?';
            params.push(userId);
        }
        
        // 按指定字段排序，默认按创建时间倒序
        query += ` ORDER BY c.${actualSortBy} ${actualSortOrder} LIMIT ? OFFSET ?`;
        params.push(actualPageSize, offset);
        
        console.log('执行案件查询:', query);
        console.log('查询参数:', params);
        
        const [cases] = await db.execute(query, params);
        console.log('查询结果:', cases.length, '条记录');
        
        // 获取总记录数
        let countQuery = `
            SELECT COUNT(*) as total 
            FROM cases 
            WHERE (user_id = ? OR receiver_id = ?)
        `;
        
        const countParams = [userId, userId];
        
        if (viewMode === 'submitted') {
            countQuery += ' AND status = ?';
            countParams.push('已完成');
        } else if (viewMode === 'allocated') {
            countQuery += ' AND receiver_id = ?';
            countParams.push(userId);
        }
        
        console.log('执行总记录数查询:', countQuery);
        console.log('总记录数查询参数:', countParams);
        
        const [countResult] = await db.execute(countQuery, countParams);
        console.log('总记录数查询结果:', countResult);
        
        const total = countResult[0].total;
        
        // 转换数据格式，确保符合前端预期
        const formattedCases = cases.map(caseItem => ({
            ...caseItem,
            // 确保日期格式正确
            case_date: caseItem.case_date ? caseItem.case_date.toISOString().split('T')[0] : null,
            created_at: caseItem.created_at ? caseItem.created_at.toISOString().split('T')[0] : null,
            updated_at: caseItem.updated_at ? caseItem.updated_at.toISOString().split('T')[0] : null,
            completed_at: caseItem.completed_at ? caseItem.completed_at.toISOString().split('T')[0] : null,
            // 确保handler_name始终有值
            handler_name: caseItem.handler_name || caseItem.creator_name || '未知',
            // 添加前端可能需要的额外字段
            status_text: caseItem.status === '已完成' ? '已完成' : '未完成'
        }));
        
        console.log('返回响应:', {
            success: true,
            data: formattedCases,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(pageSize),
                total_pages: Math.ceil(total / pageSize)
            }
        });
        
        // 构建响应数据，确保完全符合Element Plus表格组件的期望格式
        // Element Plus表格组件期望的格式是：{ success: true, data: [...], total: ... }
        const responseData = {
            success: true,
            // 确保包含cases字段，这样收件记录才能正常显示
            cases: formattedCases,
            // 同时返回data字段，符合Element Plus表格组件期望
            data: formattedCases,
            // 确保返回total字段，这是Element Plus表格组件分页必须的
            total: total,
            // 确保返回当前页码，使用page而不是current，符合更多组件的期望
            page: actualPage,
            // 确保返回每页条数，使用pageSize，符合Element Plus等组件的命名
            pageSize: actualPageSize
        };
        
        res.json(responseData);
    } catch (error) {
        console.error('获取当前用户案件列表失败:', error);
        console.error('错误堆栈:', error.stack);
        res.status(500).json({
            success: false,
            message: '获取当前用户案件列表失败',
            error: error.message,
            stack: error.stack
        });
    }
});

// 导入案件管理模块
import { createCase as createCaseModule } from './modules/casesModule.js';

// 创建案件
router.post('/', authenticateToken, async (req, res) => {
    try {
        // 获取当前用户ID
        const userId = req.user?.id;
        
        // 准备案件数据，合并用户ID和请求体
        const caseData = {
            ...req.body,
            user_id: userId
        };
        
        // 使用案件管理模块创建案件，包含完整的分配逻辑
        const createdCase = await createCaseModule(db, caseData);
        
        // 返回成功响应，包括新创建的案件信息
        res.json({
            success: true,
            message: '案件创建成功',
            caseId: createdCase.id
        });
    } catch (error) {
        console.error('创建案件失败:', error);
        res.status(500).json({
            success: false,
            message: '创建案件失败',
            error: error.message
        });
    }
});

// 获取统计数据
export const getStatisticsHandler = async (req, res) => {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.role;
        const { timeFilter = 'all' } = req.query;
        
        // 初始化结果变量
        let typeStats = [];
        let receiverStats = [];
        let workloadTrend = [];
        let roleStatistics = [];
        let developerStatistics = [];
        let allocationAnalysis = {};
        let weightedSuggestions = { recommendations: [], workloadAnalysis: '已移除加权分配建议功能' };
        let userInfo = [];
        let users = [];
        
        // 获取所有用户信息
        const [allUsers] = await db.execute('SELECT id, real_name, role FROM users');
        users = allUsers;
        
        // 获取当前用户信息
        const [currentUser] = await db.execute('SELECT id, real_name, role FROM users WHERE id = ?', [userId]);
        userInfo = currentUser;
        
        // 分别查询系统总案件数和个人总案件数
        let totalCases = 0; // 个人总案件数
        let systemTotalCases = 0; // 系统总案件数
        
        try {
            // 1. 查询系统总案件数（所有角色都能看到）
            const [systemCountResult] = await db.execute('SELECT COUNT(*) as count FROM cases');
            systemTotalCases = systemCountResult[0].count || 0;
            
            // 2. 查询个人总案件数（被分配的和自己录入的）
            let personalCountQuery = 'SELECT COUNT(*) as count FROM cases';
            let personalCountParams = [];
            
            if (userRole !== '管理员') {
                personalCountQuery += ' WHERE (user_id = ? OR receiver_id = ?)';
                personalCountParams = [userId, userId];
            }
            
            const [personalCountResult] = await db.execute(personalCountQuery, personalCountParams);
            totalCases = personalCountResult[0].count || 0;
            
            console.log('系统总收件数:', systemTotalCases, '个人总收件数:', totalCases);
        } catch (error) {
            console.error('计算案件数错误:', error);
            systemTotalCases = 0;
            totalCases = 0;
        }
        
        // 从数据库查询真实的案件类型统计数据 - 简化查询，避免参数问题
        let typeQuery, typeParams;
        if (userRole === '管理员') {
            typeQuery = 'SELECT case_type, COUNT(*) as total_count, SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as completed_count, SUM(CASE WHEN status != ? THEN 1 ELSE 0 END) as pending_count FROM cases GROUP BY case_type ORDER BY total_count DESC';
            typeParams = ['已完成', '已完成'];
        } else {
            typeQuery = 'SELECT case_type, COUNT(*) as total_count, SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as completed_count, SUM(CASE WHEN status != ? THEN 1 ELSE 0 END) as pending_count FROM cases WHERE user_id = ? OR receiver_id = ? GROUP BY case_type ORDER BY total_count DESC';
            typeParams = ['已完成', '已完成', userId, userId];
        }
        const [typeStatsResult] = await db.execute(typeQuery, typeParams);
        typeStats = typeStatsResult;
        
        // 从数据库查询真实的收件人统计数据 - 简化查询，避免参数问题
        let receiverQuery, receiverParams;
        // 所有角色都能看到所有收件人和国资企业专窗的收件数，用于对比
        // 移除WHERE条件，让所有角色都能看到完整的收件人统计
        receiverQuery = 'SELECT u.real_name as receiver, COUNT(*) as total_count, COUNT(*) as completed_count, 0 as pending_count, SUM(CASE WHEN case_type = ? THEN 1 ELSE 0 END) as general_count, SUM(CASE WHEN case_type = ? THEN 1 ELSE 0 END) as developer_transfer_count, SUM(CASE WHEN case_type LIKE ? THEN 1 ELSE 0 END) as transfer_developer_count, SUM(CASE WHEN case_type LIKE ? THEN 1 ELSE 0 END) as state_owned_count, SUM(CASE WHEN case_type LIKE ? THEN 1 ELSE 0 END) as multi_transfer_count, SUM(CASE WHEN case_type = ? THEN 1 ELSE 0 END) as complex_count FROM cases c JOIN users u ON c.receiver_id = u.id GROUP BY u.real_name ORDER BY total_count DESC';
        receiverParams = ['一般件', '开发商转移', '%转移%', '%国资%', '%分割%', '其他'];
        const [receiverStatsResult] = await db.execute(receiverQuery, receiverParams);
        receiverStats = receiverStatsResult;
        
        // 从数据库查询真实的角色统计数据 - 简化查询，避免参数问题
        let roleQuery, roleParams;
        if (userRole === '管理员') {
            roleQuery = 'SELECT u.role as role_name, COUNT(c.id) as case_count FROM cases c JOIN users u ON c.user_id = u.id GROUP BY u.role ORDER BY case_count DESC';
            roleParams = [];
        } else {
            roleQuery = 'SELECT u.role as role_name, COUNT(c.id) as case_count FROM cases c JOIN users u ON c.user_id = u.id WHERE c.user_id = ? OR c.receiver_id = ? GROUP BY u.role ORDER BY case_count DESC';
            roleParams = [userId, userId];
        }
        const [roleStatsResult] = await db.execute(roleQuery, roleParams);
        
        // 手动计算百分比，避免复杂的SQL查询
        roleStatistics = roleStatsResult.map(item => ({
            ...item,
            percentage: totalCases > 0 ? (item.case_count / totalCases * 100).toFixed(2) : '0.00'
        }));
        
        // 从数据库查询真实的收件人排行数据 - 简化查询，避免参数问题
        let adminRankingQuery, adminRankingParams;
        // 所有角色都能看到完整的收件人排行，包括所有收件人和国资企业专窗
        adminRankingQuery = 'SELECT u.real_name as receiver, COUNT(*) as total_count, COUNT(*) as completed_count, 0 as pending_count, SUM(CASE WHEN case_type = ? THEN 1 ELSE 0 END) as general_count, SUM(CASE WHEN case_type LIKE ? THEN 1 ELSE 0 END) as transfer_developer_count, SUM(CASE WHEN case_type LIKE ? THEN 1 ELSE 0 END) as state_owned_count, SUM(CASE WHEN case_type LIKE ? THEN 1 ELSE 0 END) as multi_transfer_count, SUM(CASE WHEN case_type = ? THEN 1 ELSE 0 END) as complex_count FROM cases c JOIN users u ON c.receiver_id = u.id GROUP BY u.real_name ORDER BY total_count DESC';
        adminRankingParams = ['一般件', '%转移%', '%国资%', '%分割%', '其他'];
        const [adminRankingResult] = await db.execute(adminRankingQuery, adminRankingParams);
        
        // 手动计算百分比，避免复杂的SQL查询
        const adminRankingWithPercentage = adminRankingResult.map(item => ({
            ...item,
            percentage: totalCases > 0 ? (item.total_count / totalCases * 100).toFixed(1) : '0.0'
        }));
        
        // 所有角色都使用相同的完整收件人排行数据，不再区分管理员和非管理员
        const receiverRankingResult = adminRankingResult;
        
        
        // 手动计算百分比，避免复杂的SQL查询
        const receiverRankingWithPercentage = receiverRankingResult.map(item => ({
            ...item,
            percentage: totalCases > 0 ? (item.total_count / totalCases * 100).toFixed(1) : '0.0'
        }));
        
        // 构建收件人排行对象
        const receiverRanking = {
            '管理员': adminRankingWithPercentage,
            '收件人': receiverRankingWithPercentage
        };
        
        // 从数据库查询真实的开发商统计数据 - 简化查询，避免参数问题
        let developerQuery, developerParams;
        if (userRole === '管理员') {
            developerQuery = 'SELECT developer, COUNT(*) as total_count, SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as completed_count, SUM(CASE WHEN status != ? THEN 1 ELSE 0 END) as pending_count FROM cases WHERE developer IS NOT NULL AND developer != ? GROUP BY developer ORDER BY total_count DESC';
            developerParams = ['已完成', '已完成', ''];
        } else {
            developerQuery = 'SELECT developer, COUNT(*) as total_count, SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as completed_count, SUM(CASE WHEN status != ? THEN 1 ELSE 0 END) as pending_count FROM cases WHERE developer IS NOT NULL AND developer != ? AND (user_id = ? OR receiver_id = ?) GROUP BY developer ORDER BY total_count DESC';
            developerParams = ['已完成', '已完成', '', userId, userId];
        }
        const [developerStatsResult] = await db.execute(developerQuery, developerParams);
        developerStatistics = developerStatsResult;
        
        // 5. 获取本月收件总数
        let monthlyTotalCases = totalCases;
        
        console.log('统计数据查询结果:', { 
            totalCases, 
            typeStats: typeStats.length, 
            receiverStats: receiverStats.length, 
            developerStatistics: developerStatistics.length 
        });
        
        // 返回成功响应 - 直接返回统计数据，不再嵌套data字段
        res.json({
            success: true,
            user_info: userInfo[0],
            type_statistics: typeStats,
            workload_trend: workloadTrend,
            receiver_ranking: receiverRanking,
            role_statistics: roleStatistics,
            developer_statistics: developerStatistics,
            system_total_cases: systemTotalCases, // 系统总收件数（整个系统）
            personal_total_cases: totalCases, // 个人总收件数（被分配的和自己录入的）
            total_cases: systemTotalCases, // 保持向后兼容，仍返回total_cases字段
            monthly_total_cases: monthlyTotalCases,
            allocation_analysis: allocationAnalysis,
            weighted_suggestions: weightedSuggestions,
            time_filter: timeFilter
        });
    } catch (error) {
        console.error('获取统计数据失败:', error);
        console.error('错误堆栈:', error.stack);
        res.status(500).json({
            success: false,
            message: '获取统计数据失败',
            error: error.message
        });
    }
};

// 获取分角色统计数据（排除管理员角色）
async function getRoleStatistics(db, userId, userRole, timeCondition, timeParams) {
    try {
        // 简化实现，避免复杂的子查询和参数不匹配问题
        let whereClause = '';
        let queryParams = [];
        
        // 确保timeParams是数组
        const safeTimeParams = Array.isArray(timeParams) ? timeParams : [];
        
        if (userRole === '管理员') {
            // 管理员查询所有非管理员角色的统计数据
            if (timeCondition) {
                whereClause = `WHERE ${timeCondition.substring(4)} AND u.role != '管理员'`;
                queryParams = [...safeTimeParams];
            } else {
                whereClause = `WHERE u.role != '管理员'`;
            }
        } else {
            // 非管理员只能查看自己相关的案件统计
            if (timeCondition) {
                whereClause = `WHERE (c.user_id = ? OR c.receiver_id = ?) ${timeCondition}`;
                queryParams = [userId, userId, ...safeTimeParams];
            } else {
                whereClause = `WHERE (c.user_id = ? OR c.receiver_id = ?)`;
                queryParams = [userId, userId];
            }
        }
        
        const query = `
            SELECT 
                u.role as role_name,
                COUNT(c.id) as case_count
            FROM 
                cases c
            JOIN 
                users u ON c.user_id = u.id
            ${whereClause}
            GROUP BY 
                u.role
            ORDER BY 
                case_count DESC;
        `;
        
        const [results] = await db.execute(query, queryParams);
        
        // 计算每个角色的占比
        const totalCount = results.reduce((sum, role) => sum + role.case_count, 0);
        
        return results.map(role => ({
            role_name: role.role_name,
            case_count: role.case_count,
            percentage: totalCount > 0 ? ((role.case_count / totalCount) * 100).toFixed(2) : '0.00',
            receivers: [] // 简化实现，移除复杂的receivers数据
        }));
    } catch (error) {
        console.error('获取分角色统计数据错误:', error);
        return [];
    }
}

// 统计数据路由
router.get('/statistics', authenticateToken, getStatisticsHandler);

// 获取收件列表
router.get('/receivers', authenticateToken, async (req, res) => {
    try {
        // 查询所有收件人角色的用户
        const [receivers] = await db.execute('SELECT id, real_name FROM users WHERE role IN (?, ?)', ['收件人', '国资企业专窗']);
        
        res.json({
            success: true,
            receivers: receivers
        });
    } catch (error) {
        console.error('获取收件列表失败:', error);
        res.status(500).json({
            success: false,
            message: '获取收件列表失败',
            error: error.message
        });
    }
});

// 获取所有案件列表（管理员用）
router.get('/all-cases', authenticateToken, async (req, res) => {
    try {
        // 记录收到的请求参数，详细调试分页问题
        console.log('\n=== /all-cases 请求收到 ===');
        console.log('原始请求参数:', req.query);
        const { page = 1, limit = 10, pageSize = 10, caseType = '' } = req.query;
        console.log('解析后的参数 - page:', page, 'limit:', limit, 'pageSize:', pageSize, 'caseType:', caseType);
        // 兼容不同的分页参数名
        const actualPage = parseInt(page);
        const actualPageSize = parseInt(pageSize) || parseInt(limit) || 10;
        const offset = (actualPage - 1) * actualPageSize;
        
        // 构建基本查询
        let query = `
            SELECT c.*, u.real_name as creator_name, 
                   CASE 
                       WHEN c.case_type IN ('开发商转移', '开发商转移登记') THEN c.agent 
                       WHEN c.receiver_id IS NOT NULL THEN a.real_name 
                       ELSE u.real_name 
                   END as handler_name 
            FROM cases AS c 
            LEFT JOIN users AS u ON c.user_id = u.id 
            LEFT JOIN users AS a ON c.receiver_id = a.id
        `;
        
        const params = [];
        
        // 添加caseType过滤条件
        if (caseType && caseType !== '') {
            query += ' WHERE c.case_type = ?';
            params.push(caseType);
        }
        
        // 添加排序和分页
        query += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
        params.push(actualPageSize, offset);
        
        const [cases] = await db.execute(query, params);
        
        // 获取总记录数
        let countQuery = 'SELECT COUNT(*) as total FROM cases';
        const countParams = [];
        
        if (caseType && caseType !== '') {
            countQuery += ' WHERE case_type = ?';
            countParams.push(caseType);
        }
        
        const [countResult] = await db.execute(countQuery, countParams);
        const total = countResult[0].total;
        
        // 转换数据格式，确保符合前端预期
        const formattedCases = cases.map(caseItem => ({
            ...caseItem,
            case_date: caseItem.case_date ? caseItem.case_date.toISOString().split('T')[0] : null,
            created_at: caseItem.created_at ? caseItem.created_at.toISOString().split('T')[0] : null,
            updated_at: caseItem.updated_at ? caseItem.updated_at.toISOString().split('T')[0] : null,
            completed_at: caseItem.completed_at ? caseItem.completed_at.toISOString().split('T')[0] : null,
            handler_name: caseItem.handler_name || caseItem.creator_name || '未知',
            status_text: caseItem.status === '已完成' ? '已完成' : '未完成'
        }));
        
        // 构建响应数据，确保完全符合Element Plus表格组件的期望格式
        // Element Plus表格组件期望的格式是：{ success: true, data: [...], total: ... }
        const responseData = {
            success: true,
            // 确保包含cases字段，这样收件记录才能正常显示
            cases: formattedCases,
            // 同时返回data字段，符合Element Plus表格组件期望
            data: formattedCases,
            // 确保返回total字段，这是Element Plus表格组件分页必须的
            total: total,
            // 确保返回当前页码，使用page而不是current，符合更多组件的期望
            page: actualPage,
            // 确保返回每页条数，使用pageSize，符合Element Plus等组件的命名
            pageSize: actualPageSize
        };
        
        // 简化日志输出，只记录关键信息
        console.log(`返回第${actualPage}页数据，总条数: ${total}，每页${actualPageSize}条，返回${formattedCases.length}条`);
        
        // 返回响应
        res.json(responseData);
    } catch (error) {
        console.error('获取所有案件列表失败:', error);
        res.status(500).json({
            success: false,
            message: '获取所有案件列表失败',
            error: error.message
        });
    }
});

// 调试路由，检查路由系统是否正常工作
router.get('/test', authenticateToken, async (req, res) => {
    console.log('调试路由被调用');
    return res.json({
        success: true,
        message: '调试路由工作正常',
        user: req.user
    });
});

// 获取单个案件详情
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const userRole = req.user?.role;
        
        console.log('获取案件详情请求，案件ID:', id, '用户ID:', userId, '用户角色:', userRole);
        
        // 确保id是数字
        const caseId = parseInt(id);
        if (isNaN(caseId)) {
            return res.status(400).json({
                success: false,
                message: '无效的案件ID'
            });
        }
        
        // 构建查询，添加权限控制
        let query;
        let params;
        
        if (userRole === '管理员') {
            // 管理员可以查看所有案件
            query = `
                SELECT c.*, u.real_name as creator_name, 
                       CASE 
                           WHEN c.case_type IN ('开发商转移', '开发商转移登记') THEN c.agent 
                           WHEN c.receiver_id IS NOT NULL THEN a.real_name 
                           ELSE u.real_name 
                       END as handler_name 
                FROM cases AS c 
                JOIN users AS u ON c.user_id = u.id 
                LEFT JOIN users AS a ON c.receiver_id = a.id
                WHERE c.id = ?
            `;
            params = [caseId];
        } else {
            // 非管理员只能查看自己相关的案件
            query = `
                SELECT c.*, u.real_name as creator_name, 
                       CASE 
                           WHEN c.case_type IN ('开发商转移', '开发商转移登记') THEN c.agent 
                           WHEN c.receiver_id IS NOT NULL THEN a.real_name 
                           ELSE u.real_name 
                       END as handler_name 
                FROM cases AS c 
                JOIN users AS u ON c.user_id = u.id 
                LEFT JOIN users AS a ON c.receiver_id = a.id
                WHERE c.id = ? AND (c.user_id = ? OR c.receiver_id = ?)
            `;
            params = [caseId, userId, userId];
        }
        
        console.log('执行查询:', query);
        console.log('查询参数:', params);
        
        const [cases] = await db.execute(query, params);
        
        console.log('查询结果:', cases);
        
        if (cases.length === 0) {
            return res.status(404).json({
                success: false,
                message: '案件不存在'
            });
        }
        
        const caseItem = cases[0];
        
        // 转换数据格式，确保符合前端预期
        const formattedCase = {
            ...caseItem,
            case_date: caseItem.case_date ? caseItem.case_date.toISOString().split('T')[0] : null,
            created_at: caseItem.created_at ? caseItem.created_at.toISOString().split('T')[0] : null,
            updated_at: caseItem.updated_at ? caseItem.updated_at.toISOString().split('T')[0] : null,
            completed_at: caseItem.completed_at ? caseItem.completed_at.toISOString().split('T')[0] : null,
            handler_name: caseItem.handler_name || caseItem.creator_name || '未知',
            status_text: caseItem.status === '已完成' ? '已完成' : '未完成'
        };
        
        res.json({
            success: true,
            case: formattedCase
        });
    } catch (error) {
        console.error('获取案件详情失败:', error);
        console.error('错误堆栈:', error.stack);
        res.status(500).json({
            success: false,
            message: '获取案件详情失败',
            error: error.message
        });
    }
});

export default router;