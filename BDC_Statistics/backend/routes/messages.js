import express from 'express';
import { authenticateToken } from './modules/authMiddleware.js';
import NotificationService from '../services/notificationService.js';

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

export default router;