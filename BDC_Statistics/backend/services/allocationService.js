import db from '../config/database.js';

/**
 * 案件分配服务
 * 实现案件自动分配规则和轮询机制
 */
class AllocationService {
    /**
     * 根据案件类型获取可用的接收人员
     * @param {string} caseType 案件类型
     * @returns {Promise<Array>} 可用接收人员列表
     */
    static async getAvailableReceivers(caseType) {
        try {
            // 根据案件类型获取匹配的角色
            let roles = [];
            
            switch (caseType) {
                case '开发商转移':
                case '开发商转移登记':
                    // 开发商转移案件应该分配给收件人和国资企业专窗
                    roles = ['收件人', '国资企业专窗'];
                    break;
                case '开发商首次':
                case '开发商':
                    // 开发商首次案件应该分配给国资企业专窗
                    roles = ['国资企业专窗'];
                    break;
                case '国资企业':
                case '国资':
                case '企业':
                    roles = ['国资企业专窗'];
                    break;
                default:
                    roles = ['收件人'];
            }
            
            // 查询匹配角色的用户
            // 使用固定占位符避免JSON数组问题
            const query = roles.length === 1 
                ? `SELECT id, real_name, role FROM users WHERE role = ? ORDER BY id`
                : `SELECT id, real_name, role FROM users WHERE role IN (?, ?) ORDER BY id`;
            
            const [users] = await db.execute(query, roles);
            
            return users;
        } catch (error) {
            console.error('获取可用接收人员失败:', error);
            return [];
        }
    }
    
    /**
     * 获取下一个案件接收人（轮询机制）
     * @param {string} caseType 案件类型
     * @returns {Promise<Object|null>} 下一个接收人员信息
     */
    static async getNextCaseReceiver(caseType) {
        try {
            // 获取可用接收人员
            const availableReceivers = await this.getAvailableReceivers(caseType);
            
            if (availableReceivers.length === 0) {
                return null;
            }
            
            // 获取最近分配的案件
            const [recentAllocations] = await db.execute(
                `SELECT new_receiver_id 
                 FROM allocation_history 
                 ORDER BY allocated_at DESC 
                 LIMIT 1`
            );
            
            let nextReceiver;
            
            if (recentAllocations.length === 0) {
                // 没有分配历史，返回第一个可用接收人员
                nextReceiver = availableReceivers[0];
            } else {
                // 找到最近分配的接收人员在可用列表中的索引
                const lastReceiverId = recentAllocations[0].new_receiver_id;
                const lastIndex = availableReceivers.findIndex(user => user.id === lastReceiverId);
                
                // 轮询到下一个接收人员
                const nextIndex = (lastIndex + 1) % availableReceivers.length;
                nextReceiver = availableReceivers[nextIndex];
            }
            
            return nextReceiver;
        } catch (error) {
            console.error('获取下一个案件接收人失败:', error);
            return null;
        }
    }
    
    /**
     * 自动分配案件
     * @param {number} caseId 案件ID
     * @param {string} caseType 案件类型
     * @param {number} creatorId 创建人ID
     * @returns {Promise<Object>} 分配结果
     */
    static async autoAllocateCase(caseId, caseType, creatorId) {
        try {
            // 获取创建人信息
            const [creatorInfo] = await db.execute(
                'SELECT real_name, role FROM users WHERE id = ?',
                [creatorId]
            );
            
            if (creatorInfo.length === 0) {
                throw new Error('创建人不存在');
            }
            
            const creator = creatorInfo[0];
            let receiverId, receiverName;
            
            // 根据创建人角色和案件类型决定分配策略
            if (creator.role === '收件人' && caseType !== '开发商转移') {
                // 收件人录入的非开发商转移案件，自动分配给自己
                receiverId = creatorId;
                receiverName = creator.real_name;
            } else if (creator.role === '国资企业专窗') {
                // 国资企业专窗录入的案件，自动分配给自己
                receiverId = creatorId;
                receiverName = creator.real_name;
            } else {
                // 其他情况，使用轮询机制分配给下一个可用接收人员
                const nextReceiver = await this.getNextCaseReceiver(caseType);
                
                if (!nextReceiver) {
                    throw new Error('没有可用的接收人员');
                }
                
                receiverId = nextReceiver.id;
                receiverName = nextReceiver.real_name;
            }
            
            // 执行分配
            const result = await this.allocateCase(caseId, receiverId, caseType, creatorId);
            
            return {
                success: true,
                receiver_id: receiverId,
                receiver_name: receiverName,
                ...result
            };
        } catch (error) {
            console.error('自动分配案件失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * 手动分配案件
     * @param {number} caseId 案件ID
     * @param {number} receiverId 接收人员ID
     * @param {string} caseType 案件类型
     * @param {number} allocatedById 分配人ID
     * @returns {Promise<Object>} 分配结果
     */
    static async allocateCase(caseId, receiverId, caseType, allocatedById) {
        let connection = null;
        
        try {
            // 获取接收人员信息
            const [receiverInfo] = await db.execute(
                'SELECT real_name FROM users WHERE id = ?',
                [receiverId]
            );
            
            if (receiverInfo.length === 0) {
                throw new Error('接收人员不存在');
            }
            
            const receiverName = receiverInfo[0].real_name;
            
            // 获取分配人信息
            const [allocatorInfo] = await db.execute(
                'SELECT real_name FROM users WHERE id = ?',
                [allocatedById]
            );
            
            const allocatedByName = allocatorInfo[0]?.real_name || '系统';
            
            // 获取当前案件信息
            const [currentCase] = await db.execute(
                'SELECT receiver_id FROM cases WHERE id = ?',
                [caseId]
            );
            
            if (currentCase.length === 0) {
                throw new Error('案件不存在');
            }
            
            const previousReceiverId = currentCase[0].receiver_id;
            
            // 开始事务
            connection = await db.getConnection();
            await connection.beginTransaction();
            
            // 更新案件信息，分配后默认状态为已完成
            await connection.execute(
                `UPDATE cases 
                 SET receiver = ?, receiver_id = ?, assigned_to = ?, assigned_to_id = ?, 
                     is_allocated = 1, allocated_at = NOW(), status = '已完成', 
                     completed_at = NOW(), updated_at = NOW() 
                 WHERE id = ?`,
                [receiverName, receiverId, receiverName, receiverId, caseId]
            );
            
            // 记录分配历史
            await connection.execute(
                `INSERT INTO allocation_history 
                 (case_id, previous_receiver_id, new_receiver_id, allocated_by, reason) 
                 VALUES (?, ?, ?, ?, ?)`,
                [caseId, previousReceiverId, receiverId, allocatedByName, `手动分配案件，案件类型: ${caseType}`]
            );
            
            // 提交事务
            await connection.commit();
            
            return {
                success: true,
                case_id: caseId,
                previous_receiver_id: previousReceiverId,
                new_receiver_id: receiverId,
                allocated_by: allocatedByName
            };
        } catch (error) {
            // 回滚事务
            if (connection) {
                try {
                    await connection.rollback();
                } catch (rollbackError) {
                    console.error('回滚事务失败:', rollbackError);
                }
            }
            
            console.error('手动分配案件失败:', error);
            return {
                success: false,
                error: error.message
            };
        } finally {
            // 释放连接
            if (connection) {
                connection.release();
            }
        }
    }
    
    /**
     * 获取案件分配历史
     * @param {number} caseId 案件ID
     * @returns {Promise<Array>} 分配历史列表
     */
    static async getAllocationHistory(caseId) {
        try {
            const [history] = await db.execute(
                `SELECT ah.*, u1.real_name as previous_receiver_name, 
                        u2.real_name as new_receiver_name 
                 FROM allocation_history ah 
                 LEFT JOIN users u1 ON ah.previous_receiver_id = u1.id 
                 LEFT JOIN users u2 ON ah.new_receiver_id = u2.id 
                 WHERE ah.case_id = ? 
                 ORDER BY ah.allocated_at DESC`,
                [caseId]
            );
            
            return history;
        } catch (error) {
            console.error('获取案件分配历史失败:', error);
            return [];
        }
    }
    
    /**
     * 获取下一个应该接收案件的人员（用于轮询提醒）
     * @param {number} currentReceiverId 当前接收人员ID
     * @returns {Promise<Object|null>} 下一个接收人员信息
     */
    static async getNextInLineReceiver(currentReceiverId) {
        try {
            // 获取当前接收人员信息
            const [currentReceiverInfo] = await db.execute(
                'SELECT role FROM users WHERE id = ?',
                [currentReceiverId]
            );
            
            if (currentReceiverInfo.length === 0) {
                throw new Error('当前接收人员不存在');
            }
            
            const currentRole = currentReceiverInfo[0].role;
            
            // 查询同角色的所有用户
            const [sameRoleUsers] = await db.execute(
                `SELECT id, real_name 
                 FROM users 
                 WHERE role = ? 
                 ORDER BY id`,
                [currentRole]
            );
            
            if (sameRoleUsers.length <= 1) {
                return null;
            }
            
            // 找到当前接收人员在列表中的索引
            const currentIndex = sameRoleUsers.findIndex(user => user.id === currentReceiverId);
            
            if (currentIndex === -1) {
                return null;
            }
            
            // 返回下一个接收人员
            const nextIndex = (currentIndex + 1) % sameRoleUsers.length;
            return sameRoleUsers[nextIndex];
        } catch (error) {
            console.error('获取下一个轮询接收人员失败:', error);
            return null;
        }
    }
    
    /**
     * 案件完成后更新轮询状态
     * @param {number} caseId 案件ID
     * @returns {Promise<Object>} 轮询提醒信息
     */
    static async updatePollingStatus(caseId) {
        try {
            // 获取案件信息
            const [caseInfo] = await db.execute(
                'SELECT receiver_id FROM cases WHERE id = ?',
                [caseId]
            );
            
            if (caseInfo.length === 0) {
                throw new Error('案件不存在');
            }
            
            const receiverId = caseInfo[0].receiver_id;
            
            // 获取下一个轮询接收人员
            const nextReceiver = await this.getNextInLineReceiver(receiverId);
            
            if (!nextReceiver) {
                return {
                    success: true,
                    hasNext: false
                };
            }
            
            return {
                success: true,
                hasNext: true,
                nextReceiver: nextReceiver
            };
        } catch (error) {
            console.error('更新轮询状态失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

export default AllocationService;
