/**
 * 案件分配模块 - 处理案件的分配逻辑
 */

/**
 * 获取下一个案件接收人
 * @param {object} db - 数据库连接
 * @param {number} userId - 用户ID
 * @param {string} caseType - 案件类型
 * @returns {Promise<object>} - 推荐的收件人信息
 */
export async function getNextCaseReceiver(db, userId, caseType = null) {
    try {
        // 检查是否为国资或企业类型案件
        const isSpecialCaseType = caseType === '国资' || caseType === '企业';
        const isDeveloperCaseType = caseType === '开发商转移登记' || caseType === '开发商转移';
        
        // 根据案件类型选择对应的角色
        let queryParams;
        let query;
        
        if (isSpecialCaseType) {
            // 国资、企业类型：只从国资企业专窗角色获取
            query = 'SELECT id, real_name FROM users WHERE role = ?';
            queryParams = ['国资企业专窗'];
        } else if (isDeveloperCaseType) {
            // 开发商转移类型：从收件人和国资企业专窗角色获取
            query = 'SELECT id, real_name FROM users WHERE role = ? OR role = ?';
            queryParams = ['收件人', '国资企业专窗'];
        } else {
            // 其他类型：只从收件人角色获取
            query = 'SELECT id, real_name FROM users WHERE role = ?';
            queryParams = ['收件人'];
        }
        
        // 获取对应的角色用户
        const [receiversOnly] = await db.execute(query, queryParams);
        
        // 提取收件人列表并按id排序，确保每次顺序一致
        const validReceivers = receiversOnly.sort((a, b) => a.id - b.id);
        
        // 如果没有有效的收件人，返回null
        if (validReceivers.length === 0) {
            return null;
        }
        
        // 获取当前案件数量，用于1:1循环分配
        const [caseCountResult] = await db.execute(
            `SELECT COUNT(*) as total_cases FROM cases`
        );
        
        const totalCases = caseCountResult[0].total_cases || 0;
        
        // 1:1循环分配：根据总案件数取模确定下一个收件人
        const nextIndex = totalCases % validReceivers.length;
        const nextReceiver = validReceivers[nextIndex];
        
        console.log(`1:1循环分配 - 总案件数: ${totalCases}, 收件人数: ${validReceivers.length}, 分配索引: ${nextIndex}, 分配收件人: ${nextReceiver.real_name}`);
        
        return nextReceiver;
    } catch (error) {
        console.error('获取下一个案件接收人错误:', error);
        throw error;
    }
}

/**
 * 分配案件给指定接收人
 * @param {object} db - 数据库连接
 * @param {number} caseId - 案件ID
 * @param {number} previousReceiverId - 原接收人ID
 * @param {object} receiver - 新接收人信息
 * @param {string} allocatedBy - 分配人
 * @param {string} reason - 分配原因
 * @returns {Promise<void>}
 */
export async function allocateCase(db, caseId, previousReceiverId, receiver, allocatedBy, reason) {
    try {
        let connection = null;
        
        try {
            // 获取连接
            connection = await db.getConnection();
            
            // 开始事务
            await connection.beginTransaction();
            
            // 更新案件记录
            await connection.execute(
                `UPDATE cases 
                 SET receiver = ?, receiver_id = ?, assigned_to = ?, assigned_to_id = ?, status = '已完成', completed_at = NOW() 
                 WHERE id = ?`,
                [receiver.real_name, receiver.id, receiver.real_name, receiver.id, caseId]
            );
            
            // 移除用户工作量更新功能
            
            // 记录分配历史
            await connection.execute(
                `INSERT INTO allocation_history 
                 (case_id, previous_receiver_id, new_receiver_id, allocated_by, reason) 
                 VALUES (?, ?, ?, ?, ?)`,
                [caseId, previousReceiverId, receiver.id, allocatedBy, reason]
            );
            
            // 提交事务
            await connection.commit();
        } catch (error) {
            // 回滚事务
            if (connection) {
                await connection.rollback();
            }
            throw error;
        } finally {
            // 释放连接
            if (connection) {
                connection.release();
            }
        }
    } catch (error) {
        console.error('分配案件错误:', error);
        throw error;
    }
}

/**
 * 处理开发商转移案件的分配
 * @param {object} db - 数据库连接
 * @param {number} userId - 用户ID
 * @param {string} caseType - 案件类型
 * @returns {Promise<object>} - 推荐的收件人信息
 */
export async function handleDeveloperTransferAllocation(db, userId, caseType) {
    try {
        // 对于开发商转移案件，使用1:1循环分配给收件人和国资企业专窗
        const [availableReceivers] = await db.execute(
            `SELECT id, real_name 
             FROM users 
             WHERE role IN (?, ?) 
             ORDER BY id`,
            ['收件人', '国资企业专窗']
        );
        
        if (availableReceivers.length > 0) {
            // 获取当前案件数量，用于1:1循环分配
            const [caseCountResult] = await db.execute(
                `SELECT COUNT(*) as total_cases FROM cases`
            );
            
            const totalCases = caseCountResult[0].total_cases || 0;
            
            // 1:1循环分配：根据总案件数取模确定下一个收件人
            const nextIndex = totalCases % availableReceivers.length;
            const nextReceiver = availableReceivers[nextIndex];
            
            console.log(`1:1循环分配 - 总案件数: ${totalCases}, 收件人数: ${availableReceivers.length}, 分配索引: ${nextIndex}, 分配收件人: ${nextReceiver.real_name}`);
            
            return nextReceiver;
        } else {
            // 如果没有可用收件人，返回null
            return null;
        }
    } catch (error) {
        console.error('处理开发商转移案件分配错误:', error);
        throw error;
    }
}
