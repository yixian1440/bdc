import db from '../config/database.js';
import webSocketService from './webSocketService.js';

/**
 * 消息通知服务
 * 用于处理系统中的各类通知
 */
class NotificationService {
    /**
     * 发送新任务通知
     * @param {number} userId - 接收用户ID
     * @param {string} caseType - 案件类型
     * @param {number} caseId - 案件ID
     * @returns {Promise<Object>} 创建的消息对象
     */
    static async sendNewTaskNotification(userId, caseType, caseId) {
        try {
            const title = '您有一个新的任务待处理';
            const content = `您有一个新的${caseType}待处理，案件ID：${caseId}`;
            
            return await this.createNotification(userId, title, content, '新任务通知');
        } catch (error) {
            console.error('发送新任务通知失败:', error);
            throw error;
        }
    }
    
    /**
     * 发送收件人之间的案件分配通知
     * @param {number} userId - 接收用户ID
     * @param {string} caseType - 案件类型
     * @returns {Promise<Object>} 创建的消息对象
     */
    static async sendReceiverAllocationNotification(userId, caseType) {
        try {
            const title = '您有一个新的案件待处理';
            const content = `您有一个新的${caseType}待处理`;
            
            return await this.createNotification(userId, title, content, '新任务通知');
        } catch (error) {
            console.error('发送收件人之间案件分配通知失败:', error);
            throw error;
        }
    }
    
    /**
     * 发送开发商案件分配通知
     * @param {number} userId - 接收用户ID
     * @param {string} caseType - 案件类型
     * @param {string} applicant - 申请人
     * @returns {Promise<Object>} 创建的消息对象
     */
    static async sendDeveloperAllocationNotification(userId, caseType, applicant) {
        try {
            const title = '您有一个新的开发商案件待处理';
            const content = `您有一个新的${caseType}待处理，申请人：${applicant}`;
            
            return await this.createNotification(userId, title, content, '新任务通知');
        } catch (error) {
            console.error('发送开发商案件分配通知失败:', error);
            throw error;
        }
    }
    
    /**
     * 发送轮到收件通知
     * @param {number} userId - 接收用户ID
     * @param {string} currentReceiverName - 当前收件人姓名
     * @param {string} caseType - 案件类型
     * @param {string} applicant - 申请人
     * @returns {Promise<Object>} 创建的消息对象
     */
    static async sendNextReceiverNotification(userId, currentReceiverName, caseType, applicant) {
        try {
            const title = '接下来轮到您收件了';
            const content = `${currentReceiverName}已经收了一个${caseType}，申请人${applicant}，接下来该由您收件了`;
            
            return await this.createNotification(userId, title, content, '新任务通知');
        } catch (error) {
            console.error('发送轮到收件通知失败:', error);
            throw error;
        }
    }
    
    /**
     * 发送提交确认通知
     * @param {number} userId - 接收用户ID
     * @param {string} caseType - 案件类型
     * @param {number} caseId - 案件ID
     * @returns {Promise<Object>} 创建的消息对象
     */
    static async sendSubmissionConfirmation(userId, caseType, caseId) {
        try {
            const title = '案件提交成功';
            const content = `您的${caseType}已成功提交，案件ID：${caseId}`;
            
            return await this.createNotification(userId, title, content, '提交确认通知');
        } catch (error) {
            console.error('发送提交确认通知失败:', error);
            throw error;
        }
    }
    
    /**
     * 发送统计通知
     * @param {number} userId - 接收用户ID
     * @param {Object} statistics - 统计数据
     * @returns {Promise<Object>} 创建的消息对象
     */
    static async sendStatisticsNotification(userId, statistics) {
        try {
            const title = '系统收件统计报告';
            const content = this.formatStatisticsContent(statistics);
            
            return await this.createNotification(userId, title, content, '统计通知');
        } catch (error) {
            console.error('发送统计通知失败:', error);
            throw error;
        }
    }
    
    /**
     * 发送队列变更通知
     * @param {Array<number>} userIds - 接收用户ID列表
     * @param {string} queueType - 队列类型
     * @param {string} changeDetail - 变更详情
     * @returns {Promise<Array>} 创建的消息对象列表
     */
    static async sendQueueChangeNotification(userIds, queueType, changeDetail) {
        try {
            const title = '分配队列人员变动通知';
            const content = `${queueType}分配队列人员发生变动：${changeDetail}`;
            
            const promises = userIds.map(userId => 
                this.createNotification(userId, title, content, '队列变更通知')
            );
            
            return await Promise.all(promises);
        } catch (error) {
            console.error('发送队列变更通知失败:', error);
            throw error;
        }
    }
    
    /**
     * 创建通知消息
     * @param {number} userId - 接收用户ID
     * @param {string} title - 消息标题
     * @param {string} content - 消息内容
     * @param {string} messageType - 消息类型
     * @returns {Promise<Object>} 创建的消息对象
     */
    static async createNotification(userId, title, content, messageType) {
        try {
            const [result] = await db.execute(
                `INSERT INTO messages (user_id, title, content, message_type, is_read)
                 VALUES (?, ?, ?, ?, FALSE)`,
                [userId, title, content, messageType]
            );
            
            return {
                id: result.insertId,
                user_id: userId,
                title,
                content,
                message_type: messageType,
                is_read: false,
                created_at: new Date()
            };
        } catch (error) {
            console.error('创建通知失败:', error);
            throw error;
        }
    }
    
    /**
     * 格式化统计内容
     * @param {Object} statistics - 统计数据
     * @returns {string} 格式化后的统计内容
     */
    static formatStatisticsContent(statistics) {
        let content = '';
        
        if (statistics.totalCases) {
            content += `总收件数：${statistics.totalCases}\n`;
        }
        
        if (statistics.caseTypeDistribution) {
            content += '\n收件类型分布：\n';
            Object.entries(statistics.caseTypeDistribution).forEach(([type, count]) => {
                content += `- ${type}：${count}件\n`;
            });
        }
        
        if (statistics.timeRange) {
            content += `\n统计时间段：${statistics.timeRange}\n`;
        }
        
        return content;
    }
    
    /**
     * 获取用户未读消息数量
     * @param {number} userId - 用户ID
     * @returns {Promise<number>} 未读消息数量
     */
    static async getUnreadMessageCount(userId) {
        try {
            const [rows] = await db.execute(
                'SELECT COUNT(*) as count FROM messages WHERE user_id = ? AND is_read = FALSE',
                [userId]
            );
            return rows[0].count;
        } catch (error) {
            console.error('获取未读消息数量失败:', error);
            return 0;
        }
    }
    
    /**
     * 获取用户消息列表
     * @param {number} userId - 用户ID
     * @param {Object} options - 选项（分页、类型过滤等）
     * @returns {Promise<Object>} 消息列表和分页信息
     */
    static async getUserMessages(userId, options = {}) {
        try {
            const { page = 1, limit = 20, messageType } = options;
            const offset = (page - 1) * limit;
            
            // 获取当前用户的角色信息
            const [userInfo] = await db.execute(
                'SELECT role FROM users WHERE id = ?',
                [userId]
            );
            
            const userRole = userInfo[0]?.role;
            
            let query = 'SELECT * FROM messages WHERE user_id = ?';
            let params = [userId];
            let countQuery = 'SELECT COUNT(*) as total FROM messages WHERE user_id = ?';
            let countParams = [userId];
            
            // 如果是收件人角色，返回所有消息类型
            // 移除了收件人角色的消息类型限制，允许收件人查看所有类型的消息
            if (userRole === '收件人') {
                // 收件人可以查看所有类型的消息
                // 包括新任务通知、提交确认通知等
            }
            
            if (messageType) {
                query += ' AND message_type = ?';
                params.push(messageType);
                
                countQuery += ' AND message_type = ?';
                countParams.push(messageType);
            }
            
            query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);
            
            const [messages] = await db.execute(query, params);
            
            // 获取总数
            const [countResult] = await db.execute(
                countQuery,
                countParams
            );
            
            return {
                messages,
                pagination: {
                    total: countResult[0].total,
                    page,
                    limit,
                    totalPages: Math.ceil(countResult[0].total / limit)
                }
            };
        } catch (error) {
            console.error('获取用户消息失败:', error);
            throw error;
        }
    }
    
    /**
     * 标记消息为已读
     * @param {number} userId - 用户ID
     * @param {number} messageId - 消息ID
     * @returns {Promise<boolean>} 是否标记成功
     */
    static async markMessageAsRead(userId, messageId) {
        try {
            const [result] = await db.execute(
                'UPDATE messages SET is_read = TRUE WHERE id = ? AND user_id = ?',
                [messageId, userId]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('标记消息已读失败:', error);
            throw error;
        }
    }
    
    /**
     * 标记所有消息为已读
     * @param {number} userId - 用户ID
     * @returns {Promise<boolean>} 是否标记成功
     */
    static async markAllMessagesAsRead(userId) {
        try {
            const [result] = await db.execute(
                'UPDATE messages SET is_read = TRUE WHERE user_id = ?',
                [userId]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('标记所有消息已读失败:', error);
            throw error;
        }
    }
    
    /**
     * 发送自定义消息
     * @param {Array<number>} userIds - 接收用户ID列表
     * @param {string} title - 消息标题
     * @param {string} content - 消息内容
     * @param {string} messageType - 消息类型
     * @returns {Promise<Array>} 创建的消息对象列表
     */
    static async sendCustomMessage(userIds, title, content, messageType) {
        try {
            const promises = userIds.map(userId => 
                this.createNotification(userId, title, content, messageType)
            );
            
            const messages = await Promise.all(promises);
            
            // 通过WebSocket发送实时通知
            this.sendWebSocketNotification(userIds, title, content, messageType);
            
            return messages;
        } catch (error) {
            console.error('发送自定义消息失败:', error);
            throw error;
        }
    }
    
    /**
     * 通过WebSocket发送消息通知
     * @param {Array<number>} userIds - 接收用户ID列表
     * @param {string} title - 消息标题
     * @param {string} content - 消息内容
     * @param {string} messageType - 消息类型
     */
    static sendWebSocketNotification(userIds, title, content, messageType) {
        try {
            const notificationMessage = {
                type: 'messageNotification',
                title,
                content,
                messageType,
                timestamp: new Date().toISOString()
            };
            
            // 广播到所有客户端
            webSocketService.broadcastToAllClients(notificationMessage);
            
            // 同时发送到消息频道
            webSocketService.broadcastToChannel('messages', notificationMessage);
            
            console.log(`已通过WebSocket发送消息通知，接收用户数: ${userIds.length}`);
        } catch (error) {
            console.error('发送WebSocket消息通知失败:', error);
        }
    }
}

export default NotificationService;
