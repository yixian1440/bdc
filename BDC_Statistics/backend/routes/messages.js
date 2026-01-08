import express from 'express';
import { authenticateToken } from './modules/authMiddleware.js';
import NotificationService from '../services/notificationService.js';
import LogService from '../services/LogService.js';

const router = express.Router();

// 获取用户消息列表
router.get('/messages', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20, messageType } = req.query;
        
        const result = await NotificationService.getUserMessages(userId, {
            page: parseInt(page),
            limit: parseInt(limit),
            messageType
        });
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('获取用户消息列表失败:', error);
        res.status(500).json({
            success: false,
            message: '获取消息列表失败',
            error: error.message
        });
    }
});

// 标记消息为已读
router.put('/messages/:id/read', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const messageId = parseInt(req.params.id);
        
        const success = await NotificationService.markMessageAsRead(userId, messageId);
        
        if (success) {
            res.json({
                success: true,
                message: '消息已标记为已读'
            });
        } else {
            res.status(404).json({
                success: false,
                message: '消息不存在或已读'
            });
        }
    } catch (error) {
        console.error('标记消息已读失败:', error);
        res.status(500).json({
            success: false,
            message: '标记消息已读失败',
            error: error.message
        });
    }
});

// 标记所有消息为已读
router.put('/messages/read-all', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const success = await NotificationService.markAllMessagesAsRead(userId);
        
        if (success) {
            res.json({
                success: true,
                message: '所有消息已标记为已读'
            });
        } else {
            res.status(500).json({
                success: false,
                message: '标记所有消息已读失败'
            });
        }
    } catch (error) {
        console.error('标记所有消息已读失败:', error);
        res.status(500).json({
            success: false,
            message: '标记所有消息已读失败',
            error: error.message
        });
    }
});

// 发送消息
router.post('/messages/send', authenticateToken, async (req, res) => {
    try {
        const { userIds, title, content, messageType } = req.body;
        const userId = req.user?.id;
        const username = req.user?.username || '未知';
        const realName = req.user?.real_name || '';
        
        // 获取客户端信息
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'] || '';
        
        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: '请选择至少一个接收用户'
            });
        }
        
        if (!title || !content) {
            return res.status(400).json({
                success: false,
                message: '请输入消息标题和内容'
            });
        }
        
        const messages = await NotificationService.sendCustomMessage(userIds, title, content, messageType);
        
        // 记录消息发送成功日志
        await LogService.logOperation({
            userId,
            username,
            realName,
            action: 'send_message',
            description: `用户 ${realName || username} 发送了消息：${title}，类型：${messageType}，接收用户数：${userIds.length}`,
            ipAddress,
            userAgent
        });
        
        res.json({
            success: true,
            message: '消息发送成功',
            data: {
                messages
            }
        });
    } catch (error) {
        console.error('发送消息失败:', error);
        
        // 记录消息发送失败日志
        await LogService.logError({
            userId: req.user?.id || null,
            username: req.user?.username || '未知',
            realName: req.user?.real_name || '',
            action: 'send_message',
            description: `用户 ${req.user?.real_name || req.user?.username || '未知'} 发送消息失败：${error.message}`,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'] || ''
        });
        
        res.status(500).json({
            success: false,
            message: '发送消息失败',
            error: error.message
        });
    }
});

export default router;