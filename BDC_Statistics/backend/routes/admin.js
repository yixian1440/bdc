import express from 'express';
import { authenticateToken } from './modules/authMiddleware.js';
import LogService from '../services/LogService.js';
import MonitoringService from '../services/MonitoringService.js';
import UserInfoUtils from '../utils/userInfoUtils.js';

const router = express.Router();

// 验证是否为管理员的中间件
const verifyAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: '用户信息未认证' });
    }
    
    // 支持多种管理员角色名称
    const adminRoles = ['管理员', 'administrator', 'admin'];
    if (!adminRoles.includes(req.user.role)) {
        console.log('用户角色验证失败，当前角色:', req.user.role, '，需要角色:', adminRoles);
        return res.status(403).json({ 
            error: '只有管理员可以访问此功能', 
            currentRole: req.user.role 
        });
    }
    
    next();
};

// 日志相关API
router.get('/logs', authenticateToken, verifyAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 20, action, level, username, startDate, endDate } = req.query;
        
        const result = await LogService.getLogs({
            page: parseInt(page),
            limit: parseInt(limit),
            action,
            level,
            username,
            startDate,
            endDate
        });
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('获取日志列表失败:', error);
        res.status(500).json({
            success: false,
            message: '获取日志列表失败',
            error: error.message
        });
    }
});

router.get('/logs/stats', authenticateToken, verifyAdmin, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        const stats = await LogService.getLogStats({
            startDate,
            endDate
        });
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('获取日志统计失败:', error);
        res.status(500).json({
            success: false,
            message: '获取日志统计失败',
            error: error.message
        });
    }
});

router.get('/logs/:id', authenticateToken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const log = await LogService.getLogById(parseInt(id));
        
        if (log) {
            res.json({
                success: true,
                data: log
            });
        } else {
            res.status(404).json({
                success: false,
                message: '日志不存在'
            });
        }
    } catch (error) {
        console.error('获取日志详情失败:', error);
        res.status(500).json({
            success: false,
            message: '获取日志详情失败',
            error: error.message
        });
    }
});

router.delete('/logs/clean', authenticateToken, verifyAdmin, async (req, res) => {
    try {
        const { days = 30 } = req.query;
        
        const deletedCount = await LogService.cleanOldLogs(parseInt(days));
        
        res.json({
            success: true,
            message: `清理了 ${deletedCount} 条旧日志`,
            data: {
                deletedCount
            }
        });
    } catch (error) {
        console.error('清理旧日志失败:', error);
        res.status(500).json({
            success: false,
            message: '清理旧日志失败',
            error: error.message
        });
    }
});

// 监控相关API
router.get('/monitoring', authenticateToken, verifyAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        
        const result = await MonitoringService.getMonitoringData({
            page: parseInt(page),
            limit: parseInt(limit)
        });
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('获取监控数据失败:', error);
        res.status(500).json({
            success: false,
            message: '获取监控数据失败',
            error: error.message
        });
    }
});

router.get('/monitoring/stats', authenticateToken, verifyAdmin, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        const stats = await MonitoringService.getMonitoringStats({
            startDate,
            endDate
        });
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('获取监控统计数据失败:', error);
        res.status(500).json({
            success: false,
            message: '获取监控统计数据失败',
            error: error.message
        });
    }
});

router.get('/monitoring/latest', authenticateToken, verifyAdmin, async (req, res) => {
    try {
        const latestData = await MonitoringService.getLatestMonitoringData();
        
        res.json({
            success: true,
            data: latestData
        });
    } catch (error) {
        console.error('获取最新监控数据失败:', error);
        res.status(500).json({
            success: false,
            message: '获取最新监控数据失败',
            error: error.message
        });
    }
});

router.post('/monitoring/collect', authenticateToken, verifyAdmin, async (req, res) => {
    try {
        // 获取用户信息
        const userInfo = UserInfoUtils.getUserInfo(req);
        
        // 收集带用户信息的监控数据
        const storedMetrics = await MonitoringService.collectAndStoreMetrics({
            username: userInfo.username,
            ip_address: userInfo.ipAddress,
            mac_address: userInfo.macAddress
        });
        
        res.json({
            success: true,
            message: '监控数据收集成功',
            data: storedMetrics
        });
    } catch (error) {
        console.error('收集监控数据失败:', error);
        res.status(500).json({
            success: false,
            message: '收集监控数据失败',
            error: error.message
        });
    }
});

router.delete('/monitoring/clean', authenticateToken, verifyAdmin, async (req, res) => {
    try {
        const { days = 7 } = req.query;
        
        const deletedCount = await MonitoringService.cleanOldMonitoringData(parseInt(days));
        
        res.json({
            success: true,
            message: `清理了 ${deletedCount} 条旧监控数据`,
            data: {
                deletedCount
            }
        });
    } catch (error) {
        console.error('清理旧监控数据失败:', error);
        res.status(500).json({
            success: false,
            message: '清理旧监控数据失败',
            error: error.message
        });
    }
});

// 用户活动相关API
router.get('/monitoring/user-activity', authenticateToken, verifyAdmin, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        const userActivityData = await MonitoringService.getUserActivityData({
            startDate,
            endDate
        });
        
        res.json({
            success: true,
            data: userActivityData
        });
    } catch (error) {
        console.error('获取用户活动数据失败:', error);
        res.status(500).json({
            success: false,
            message: '获取用户活动数据失败',
            error: error.message
        });
    }
});

export default router;
