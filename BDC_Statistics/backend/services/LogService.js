import db from '../config/database.js';

/**
 * 系统日志服务
 * 用于处理系统操作日志的记录和查询
 */
class LogService {
    /**
     * 记录系统日志
     * @param {Object} logData - 日志数据
     * @param {number} logData.userId - 用户ID
     * @param {string} logData.username - 用户名
     * @param {string} logData.realName - 实际姓名
     * @param {string} logData.agentName - 代理人姓名（开发商用）
     * @param {string} logData.action - 操作类型
     * @param {string} logData.description - 操作描述
     * @param {string} logData.ipAddress - 客户端IP
     * @param {string} logData.userAgent - 用户代理
     * @param {string} logData.level - 日志级别 (info/warning/error)
     * @returns {Promise<Object>} 创建的日志记录
     */
    static async log(logData) {
        try {
            const {
                userId = null,
                username,
                realName,
                agentName,
                action,
                description = '',
                ipAddress = '',
                userAgent = '',
                level = 'info'
            } = logData;

            // 确定要显示的用户名：优先使用代理人姓名，然后是实际姓名，最后是账户名
            const displayName = agentName || realName || username;

            const [result] = await db.execute(
                `INSERT INTO system_logs 
                 (user_id, username, real_name, agent_name, action, description, ip_address, user_agent, level) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [userId, username, realName, agentName, action, description, ipAddress, userAgent, level]
            );

            return {
                id: result.insertId,
                userId,
                username,
                realName,
                agentName,
                displayName,
                action,
                description,
                ipAddress,
                userAgent,
                level,
                created_at: new Date()
            };
        } catch (error) {
            console.error('记录日志失败:', error);
            throw error;
        }
    }

    /**
     * 记录登录日志
     * @param {Object} loginData - 登录数据
     * @param {string} loginData.username - 用户名
     * @param {string} [loginData.realName] - 实际姓名
     * @param {boolean} loginData.success - 是否登录成功
     * @param {string} loginData.ipAddress - 客户端IP
     * @param {string} loginData.userAgent - 用户代理
     * @param {string} [loginData.error] - 错误信息
     * @returns {Promise<Object>} 创建的日志记录
     */
    static async logLogin(loginData) {
        const {
            username,
            realName,
            success,
            ipAddress = '',
            userAgent = '',
            error = ''
        } = loginData;

        const displayName = realName || username;

        return this.log({
            username,
            realName,
            action: success ? 'login_success' : 'login_failed',
            description: success 
                ? `用户 ${displayName} 登录成功` 
                : `用户 ${displayName} 登录失败: ${error}`,
            ipAddress,
            userAgent,
            level: success ? 'info' : 'error'
        });
    }

    /**
     * 记录操作日志
     * @param {Object} operationData - 操作数据
     * @param {number} operationData.userId - 用户ID
     * @param {string} operationData.username - 用户名
     * @param {string} [operationData.realName] - 实际姓名
     * @param {string} [operationData.agentName] - 代理人姓名（开发商用）
     * @param {string} operationData.action - 操作类型
     * @param {string} operationData.description - 操作描述
     * @param {string} operationData.ipAddress - 客户端IP
     * @param {string} operationData.userAgent - 用户代理
     * @returns {Promise<Object>} 创建的日志记录
     */
    static async logOperation(operationData) {
        return this.log({
            ...operationData,
            level: 'info'
        });
    }

    /**
     * 记录错误日志
     * @param {Object} errorData - 错误数据
     * @param {number} errorData.userId - 用户ID
     * @param {string} errorData.username - 用户名
     * @param {string} [errorData.realName] - 实际姓名
     * @param {string} [errorData.agentName] - 代理人姓名（开发商用）
     * @param {string} errorData.action - 操作类型
     * @param {string} errorData.description - 错误描述
     * @param {string} errorData.ipAddress - 客户端IP
     * @param {string} errorData.userAgent - 用户代理
     * @returns {Promise<Object>} 创建的日志记录
     */
    static async logError(errorData) {
        return this.log({
            ...errorData,
            level: 'error'
        });
    }

    /**
     * 获取日志列表
     * @param {Object} options - 查询选项
     * @param {number} options.page - 页码
     * @param {number} options.limit - 每页数量
     * @param {string} options.action - 操作类型筛选
     * @param {string} options.level - 日志级别筛选
     * @param {string} options.username - 用户名筛选
     * @param {string} options.startDate - 开始日期
     * @param {string} options.endDate - 结束日期
     * @returns {Promise<Object>} 日志列表和分页信息
     */
    static async getLogs(options = {}) {
        try {
            const {
                page = 1,
                limit = 20,
                action = '',
                level = '',
                username = '',
                startDate = '',
                endDate = ''
            } = options;

            const offset = (page - 1) * limit;
            let query = 'SELECT * FROM system_logs WHERE 1=1';
            let countQuery = 'SELECT COUNT(*) as total FROM system_logs WHERE 1=1';
            const params = [];
            const countParams = [];

            // 构建查询条件
            if (action) {
                query += ' AND action = ?';
                countQuery += ' AND action = ?';
                params.push(action);
                countParams.push(action);
            }

            if (level) {
                query += ' AND level = ?';
                countQuery += ' AND level = ?';
                params.push(level);
                countParams.push(level);
            }

            if (username) {
                // 同时搜索用户名、实际姓名和代理人姓名
                query += ' AND (username LIKE ? OR real_name LIKE ? OR agent_name LIKE ?)';
                countQuery += ' AND (username LIKE ? OR real_name LIKE ? OR agent_name LIKE ?)';
                const likeUsername = `%${username}%`;
                params.push(likeUsername, likeUsername, likeUsername);
                countParams.push(likeUsername, likeUsername, likeUsername);
            }

            if (startDate) {
                query += ' AND created_at >= ?';
                countQuery += ' AND created_at >= ?';
                params.push(startDate);
                countParams.push(startDate);
            }

            if (endDate) {
                query += ' AND created_at <= ?';
                countQuery += ' AND created_at <= ?';
                params.push(endDate);
                countParams.push(endDate);
            }

            // 添加排序和分页
            query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);

            // 执行查询
            const [logs] = await db.execute(query, params);
            const [countResult] = await db.execute(countQuery, countParams);

            // 处理日志数据，添加displayName字段
            const processedLogs = logs.map(log => {
                // 确定要显示的用户名：优先使用代理人姓名，然后是实际姓名，最后是账户名
                const displayName = log.agent_name || log.real_name || log.username;
                return {
                    ...log,
                    displayName
                };
            });

            return {
                logs: processedLogs,
                pagination: {
                    total: countResult[0].total,
                    page,
                    limit,
                    totalPages: Math.ceil(countResult[0].total / limit)
                }
            };
        } catch (error) {
            console.error('获取日志列表失败:', error);
            throw error;
        }
    }

    /**
     * 获取日志统计数据
     * @param {Object} options - 统计选项
     * @param {string} options.startDate - 开始日期
     * @param {string} options.endDate - 结束日期
     * @returns {Promise<Object>} 统计数据
     */
    static async getLogStats(options = {}) {
        try {
            const { startDate = '', endDate = '' } = options;

            let query = `
                SELECT 
                    action, 
                    level, 
                    COUNT(*) as count 
                FROM system_logs 
                WHERE 1=1
            `;
            const params = [];

            if (startDate) {
                query += ' AND created_at >= ?';
                params.push(startDate);
            }

            if (endDate) {
                query += ' AND created_at <= ?';
                params.push(endDate);
            }

            query += ' GROUP BY action, level';

            const [stats] = await db.execute(query, params);

            // 格式化统计数据
            const actionStats = {};
            const levelStats = {};

            stats.forEach(item => {
                // 按操作类型统计
                if (!actionStats[item.action]) {
                    actionStats[item.action] = 0;
                }
                actionStats[item.action] += item.count;

                // 按日志级别统计
                if (!levelStats[item.level]) {
                    levelStats[item.level] = 0;
                }
                levelStats[item.level] += item.count;
            });

            return {
                totalLogs: stats.reduce((sum, item) => sum + item.count, 0),
                actionStats,
                levelStats,
                detailedStats: stats
            };
        } catch (error) {
            console.error('获取日志统计失败:', error);
            throw error;
        }
    }

    /**
     * 根据ID获取日志详情
     * @param {number} logId - 日志ID
     * @returns {Promise<Object>} 日志详情
     */
    static async getLogById(logId) {
        try {
            const [logs] = await db.execute(
                'SELECT * FROM system_logs WHERE id = ?',
                [logId]
            );

            return logs[0] || null;
        } catch (error) {
            console.error('获取日志详情失败:', error);
            throw error;
        }
    }

    /**
     * 清理旧日志
     * @param {number} days - 保留天数
     * @returns {Promise<number>} 删除的日志数量
     */
    static async cleanOldLogs(days = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);

            const [result] = await db.execute(
                'DELETE FROM system_logs WHERE created_at < ?',
                [cutoffDate]
            );

            return result.affectedRows;
        } catch (error) {
            console.error('清理旧日志失败:', error);
            throw error;
        }
    }
}

export default LogService;
