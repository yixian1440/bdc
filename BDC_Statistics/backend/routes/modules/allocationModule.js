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
            query = 'SELECT id, real_name FROM users WHERE role = ? AND status = ?';
            queryParams = ['国资企业专窗', '正常'];
        } else if (isDeveloperCaseType) {
            // 开发商转移类型：从收件人和国资企业专窗角色获取
            query = 'SELECT id, real_name FROM users WHERE (role = ? OR role = ?) AND status = ?';
            queryParams = ['收件人', '国资企业专窗', '正常'];
        } else {
            // 其他类型：只从收件人角色获取
            query = 'SELECT id, real_name FROM users WHERE role = ? AND status = ?';
            queryParams = ['收件人', '正常'];
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
        // 使用最近30天的案件数量，避免休假回来的用户被分配太多案件
        const [recentCaseCountResult] = await db.execute(
            `SELECT COUNT(*) as total_cases FROM cases WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
        );
        
        const totalCases = recentCaseCountResult[0].total_cases || 0;
        
        // 1:1循环分配：根据最近30天案件数取模确定下一个收件人
        const nextIndex = totalCases % validReceivers.length;
        const nextReceiver = validReceivers[nextIndex];
        
        console.log(`1:1循环分配 - 最近30天案件数: ${totalCases}, 收件人数: ${validReceivers.length}, 分配索引: ${nextIndex}, 分配收件人: ${nextReceiver.real_name}`);
        
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
        // 对于开发商转移案件，采用1:1循环平均分配
        // 只从收件人和国资企业专窗角色获取可用用户
        const [availableReceivers] = await db.execute(
            `SELECT id, real_name 
             FROM users 
             WHERE role IN (?, ?) AND status = '正常' 
             ORDER BY id`,
            ['收件人', '国资企业专窗']
        );
        
        if (availableReceivers.length === 0) {
            return null;
        }
        
        // 获取当天开发商转移案件数量，用于1:1循环分配
        const [totalCountResult] = await db.execute(
            `SELECT COUNT(*) as total 
             FROM cases 
             WHERE case_type IN ('开发商转移', '开发商转移登记') 
             AND DATE(created_at) = CURRENT_DATE`
        );
        
        const totalCases = totalCountResult[0].total || 0;
        
        // 1:1循环分配：根据当天案件数取模确定下一个收件人
        const nextIndex = totalCases % availableReceivers.length;
        const nextReceiver = availableReceivers[nextIndex];
        
        console.log(`开发商转移案件1:1循环分配 - 当天案件数: ${totalCases}, 收件人数: ${availableReceivers.length}, 分配索引: ${nextIndex}, 分配收件人: ${nextReceiver.real_name}`);
        
        return nextReceiver;
    } catch (error) {
        console.error('处理开发商转移案件分配错误:', error);
        throw error;
    }
}
