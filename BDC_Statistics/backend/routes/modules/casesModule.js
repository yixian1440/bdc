/**
 * 案件管理模块 - 包含案件的基本CRUD操作
 */
import { getNextCaseReceiver, handleDeveloperTransferAllocation } from './allocationModule.js';
import NotificationService from '../../services/notificationService.js';

/**
 * 获取用户案件列表 - 支持查看分配给自己的案件
 * @param {number} userId - 用户ID
 * @param {object} queryParams - 查询参数
 * @returns {Promise<object>} 案件列表和分页信息
 */
export async function getUserCases(db, userId, queryParams) {
    try {
        const { page = 1, pageSize = 10, caseType, startDate, endDate, role = '', assignedTo, viewMode } = queryParams;
        const offset = (page - 1) * pageSize;
        
        // 构建查询条件
        let whereClause = '';
        const params = [];
        
        // 获取用户信息以获取real_name
        let userInfo;
        try {
            const [userRows] = await db.execute('SELECT real_name, role FROM users WHERE id = ?', [userId]);
            userInfo = userRows[0] || {};
        } catch (userError) {
            console.error('获取用户信息错误:', userError);
            userInfo = {};
        }
        
        const userRealName = userInfo.real_name || '';
        const userRole = userInfo.role || role;
        
        // 处理assignedTo参数（仅管理员可用）
        if (assignedTo) {
            // 只有管理员可以使用assignedTo参数查看其他用户的案件
            if (userRole === '管理员') {
                whereClause = 'WHERE receiver = ?';
                params.push(assignedTo);
            } else {
                // 非管理员用户使用默认权限过滤
                whereClause = 'WHERE user_id = ?';
                params.push(userId);
            }
        } else if (userRole !== '管理员') {
            // 根据角色确定查询范围
            if (userRole === '收件人' || userRole === '国资企业专窗') {
                // 收件人和国资企业专窗查看分配给自己的案件
                whereClause = 'WHERE receiver_id = ?';
                params.push(userId);
            } else {
                // 其他角色查看自己创建的案件
                whereClause = 'WHERE user_id = ?';
                params.push(userId);
            }
        }
        
        // 添加案件类型过滤
        if (caseType) {
            whereClause = whereClause ? whereClause + ' AND case_type = ?' : 'WHERE case_type = ?';
            params.push(caseType);
        }
        
        // 添加日期范围过滤
        if (startDate && endDate) {
            whereClause = whereClause ? whereClause + ' AND case_date BETWEEN ? AND ?' : 'WHERE case_date BETWEEN ? AND ?';
            params.push(startDate, endDate);
        }
        
        // 构建查询语句
        const selectQuery = `
            SELECT c.*, c.receiver as receiver_name 
            FROM cases c
            ${whereClause}
            ORDER BY c.created_at DESC
            LIMIT ? OFFSET ?
        `;
        
        // 构建总数查询语句
        const countQuery = `
            SELECT COUNT(*) as total 
            FROM cases 
            ${whereClause}
        `;
        
        // 执行查询
        const [cases] = await db.execute(selectQuery, [...params, pageSize, offset]);
        const [countResult] = await db.execute(countQuery, params);
        const totalCount = countResult[0].total;
        
        return {
            cases,
            pagination: {
                total: totalCount,
                page: parseInt(page),
                pageSize: parseInt(pageSize),
                totalPages: Math.ceil(totalCount / pageSize)
            }
        };
    } catch (error) {
        console.error('获取用户案件列表错误:', error);
        throw error;
    }
}

/**
 * 创建新案件
 */
export async function createCase(db, caseData) {
    const startTime = Date.now();
    const operationId = `create_case_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    let connection = null;
    
    try {
        console.log(`[${operationId}] 开始创建案件，用户ID: ${caseData?.user_id || '未知'}`);
        
        // 添加输入验证，确保关键参数存在且不为undefined
        if (!caseData || typeof caseData !== 'object') {
            console.error(`[${operationId}] 验证失败: 案件数据为空或不是对象`);
            throw new Error('案件数据不能为空或不是有效的对象');
        }
        
        // 支持多种命名方式获取案件类型
        const caseType = caseData.caseType || caseData.case_type || caseData.type;
        
        const { 
            case_number: caseNumberFromUnderline,
            caseNumber: caseNumberFromCamel,
            case_date: caseDateFromUnderline,
            caseDate: caseDateFromCamel,
            applicant,
            agent,
            contact_phone: contactPhoneFromUnderline,
            contactPhone: contactPhoneFromCamel,
            developer,
            user_id,
            is_allocated = false,
            receiver,
            allocated_at = null,
            complexity = '中',
            priority = '中'
        } = caseData;
        
        // 兼容前端发送的caseDate（驼峰命名）和case_date（下划线命名）
        // 如果没有提供日期，使用当前日期作为默认值
        let caseDate = caseDateFromUnderline || caseDateFromCamel;
        if (caseDate === undefined || caseDate === null || caseDate === '') {
            caseDate = new Date().toISOString().slice(0, 10); // 使用当前日期作为默认值，格式：YYYY-MM-DD
            console.warn(`[${operationId}] 案件日期为空，使用当前日期作为默认值: ${caseDate}`);
        } else {
            // 处理前端发送的Date对象，确保日期格式正确，不受时区影响
            if (typeof caseDate === 'string') {
                // 如果是字符串，尝试解析为Date对象，然后转换为YYYY-MM-DD格式
                try {
                    const dateObj = new Date(caseDate);
                    if (!isNaN(dateObj.getTime())) {
                        // 使用Date.UTC()确保时区一致，避免日期减少一天
                        const utcDate = new Date(Date.UTC(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()));
                        caseDate = utcDate.toISOString().slice(0, 10);
                        console.log(`[${operationId}] 日期字符串处理后: ${caseDate}`);
                    }
                } catch (error) {
                    console.error(`[${operationId}] 日期字符串解析失败:`, error);
                    // 如果解析失败，使用当前日期作为默认值
                    caseDate = new Date().toISOString().slice(0, 10);
                    console.warn(`[${operationId}] 日期解析失败，使用当前日期作为默认值: ${caseDate}`);
                }
            } else if (caseDate instanceof Date) {
                // 如果是Date对象，转换为YYYY-MM-DD格式，使用UTC时间避免时区问题
                const utcDate = new Date(Date.UTC(caseDate.getFullYear(), caseDate.getMonth(), caseDate.getDate()));
                caseDate = utcDate.toISOString().slice(0, 10);
                console.log(`[${operationId}] Date对象处理后: ${caseDate}`);
            }
        }
        
        // 兼容前端发送的caseNumber（驼峰命名）和case_number（下划线命名）
        let caseNumber = caseNumberFromUnderline || caseNumberFromCamel;
        
        // 兼容前端发送的contactPhone（驼峰命名）和contact_phone（下划线命名）
        let contactPhone = contactPhoneFromUnderline || contactPhoneFromCamel;
        
        // 确保所有必需参数不为undefined，避免数据库错误
        if (user_id === undefined) {
            console.error(`[${operationId}] 验证失败: user_id为undefined`);
            throw new Error('用户ID不能为空');
        }
        
        // 当案件编号为空、null或undefined时，自动生成一个唯一的案件编号
        let finalCaseNumber = caseNumber;
        if (caseNumber === undefined || caseNumber === null || caseNumber === '') {
            console.warn(`[${operationId}] 案件编号为空，自动生成唯一编号`);
            // 生成格式：年月日+随机数
            const dateStr = caseDate.replace(/-/g, '');
            finalCaseNumber = `${dateStr}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
            console.log(`[${operationId}] 自动生成的案件编号: ${finalCaseNumber}`);
        } else {
            console.log(`[${operationId}] 使用用户提供的案件编号: ${finalCaseNumber}`);
        }
        if (!caseType) {
            console.error(`[${operationId}] 验证失败: caseType为undefined或空`);
            throw new Error('案件类型不能为空');
        }
        
        // 检查创建人角色，确定必填字段
        let creatorRole = '';
        try {
            const [creatorRows] = await db.execute('SELECT role FROM users WHERE id = ?', [user_id]);
            if (creatorRows.length > 0) {
                creatorRole = creatorRows[0].role;
            }
        } catch (roleError) {
            console.error(`[${operationId}] 获取创建人角色失败:`, roleError);
        }
        
        // 申请人字段验证规则：
        // 1. 开发商转移案件必须填写申请人，无论创建人角色
        // 2. 非开发商角色必须填写申请人
        // 3. 开发商角色的非转移案件可以不填写申请人
        if (
            (caseType === '开发商转移' && (!applicant || applicant === '')) ||
            (creatorRole !== '开发商' && applicant === undefined)
        ) {
            console.error(`[${operationId}] 验证失败: 申请人不能为空`);
            throw new Error('申请人不能为空');
        }
        
        // 确保所有参数都不会传递undefined给数据库
        // 将undefined值转换为null，这是SQL中表示空值的正确方式
        const safeCaseNumber = finalCaseNumber !== undefined ? finalCaseNumber : null;
        const safeCaseType = caseType;
        const safeCaseDate = caseDate !== undefined ? caseDate : null;
        const safeApplicant = applicant !== undefined ? applicant : null;
        const safeAgent = agent !== undefined ? agent : null;
        const safeContactPhone = contactPhone !== undefined ? contactPhone : null;
        const safeDeveloper = developer !== undefined ? developer : null;
        const safeUserId = user_id !== undefined ? user_id : null;
        
        // 检查创建权限：开发商首次案件只能由国资企业专窗创建
        if (safeCaseType === '开发商首次') {
            const [creatorInfo] = await db.execute('SELECT real_name, role FROM users WHERE id = ?', [safeUserId]);
            if (creatorInfo.length === 0 || creatorInfo[0].role !== '国资企业专窗') {
                console.error(`[${operationId}] 验证失败: 只有国资企业专窗可以创建开发商首次案件`);
                throw new Error('只有国资企业专窗可以创建开发商首次案件');
            }
        }
        
        // 复杂度转换：将中文转换为整数
        const complexityMap = {
            '低': 1,
            '中': 2,
            '高': 3
        };
        const complexityText = complexity !== undefined ? complexity : '中';
        const safeComplexity = complexityMap[complexityText] || complexityMap['中'];
        
        // 优先级转换：将中文转换为整数
        const priorityMap = {
            '低': 1,
            '中': 2,
            '高': 3
        };
        const priorityText = priority !== undefined ? priority : '中';
        const safePriority = priorityMap[priorityText] || priorityMap['中'];
        
        const safeIsAllocated = is_allocated !== undefined ? is_allocated : false;
        
        // 获取创建人角色信息
        const [creatorInfo] = await db.execute('SELECT real_name, role FROM users WHERE id = ?', [safeUserId]);
        if (creatorInfo.length === 0) {
            throw new Error('创建人信息不存在');
        }
        creatorRole = creatorInfo[0].role;
        const creatorRealName = creatorInfo[0].real_name;
        
        // 确保receiver不为null，因为数据库字段不允许NULL，默认为创建人的真实姓名
        const safeReceiver = receiver !== undefined && receiver !== null && receiver !== '' ? receiver : creatorRealName;
        
        // 根据创建人角色和案件类型决定分配策略
        // 除开发商转移案件外，收件人录入的案件应自动分配给自己
        let finalReceiver = safeReceiver;
        let finalReceiverId = safeUserId; // 默认使用创建人ID
        let finalIsAllocated = is_allocated;
        
        // 检查是否需要自动分配：开发商转移案件自动分配给收件人和国资企业专窗
        const needAutoAssign = ['开发商转移', '开发商转移登记'].includes(safeCaseType);
        
        if (needAutoAssign) {
            // 开发商转移案件，使用独立的分配模块进行分配
            const allocatedReceiver = await handleDeveloperTransferAllocation(db, safeUserId, safeCaseType);
            
            if (allocatedReceiver) {
                finalReceiver = allocatedReceiver.real_name;
                finalReceiverId = allocatedReceiver.id;
                finalIsAllocated = true;
            } else {
                // 如果没有可用收件人，分配给自己
                finalReceiver = creatorRealName;
                finalReceiverId = safeUserId;
                finalIsAllocated = true;
            }
        } else if (creatorRole === '收件人') {
            // 收件人录入的非开发商转移案件，自动分配给自己
            finalReceiver = creatorRealName;
            finalReceiverId = safeUserId;
            finalIsAllocated = true;
        } else if (creatorRole === '国资企业专窗') {
            // 国资企业专窗录入的非开发商转移案件，自动分配给自己
            finalReceiver = creatorRealName;
            finalReceiverId = safeUserId;
            finalIsAllocated = true;
        } else {
            // 其他情况，自动分配给自己
            finalReceiver = creatorRealName;
            finalReceiverId = safeUserId;
            finalIsAllocated = true;
        }
        
        const safeAllocatedAt = finalIsAllocated ? new Date() : null;
        
        console.log(`[${operationId}] 参数验证通过，准备开始数据库事务，案件类型: ${safeCaseType}`);
        
        // 从连接池获取一个连接
        connection = await db.getConnection();
        
        // 开始事务以确保数据一致性
        await connection.beginTransaction();
        
        // 插入案件数据，默认状态为已完成
        console.log(`[${operationId}] 执行数据库插入操作，案件编号: ${safeCaseNumber}`);
        const [result] = await connection.execute(
            `INSERT INTO cases 
            (case_number, case_type, case_date, user_id, 
             receiver, receiver_id, assigned_to, assigned_to_id,
             completed_at, status, case_description, developer, applicant, agent, contact_phone) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            
            [safeCaseNumber, safeCaseType, safeCaseDate, safeUserId,
             finalReceiver, finalReceiverId, finalReceiver, finalReceiverId,
             new Date(), '已完成', caseData.description || caseData.case_description || caseData.content || '',
             safeDeveloper, safeApplicant, safeAgent, safeContactPhone]
        );
        
        // 记录分配历史
        if (finalIsAllocated) {
            await connection.execute(
                `INSERT INTO allocation_history 
                (case_id, previous_receiver_id, new_receiver_id, allocated_by, reason) 
                VALUES (?, ?, ?, ?, ?)`,
                [result.insertId, null, finalReceiverId, creatorRealName, '案件创建自动分配']
            );
        }
        
        // 提交事务
        await connection.commit();
        console.log(`[${operationId}] 数据库事务提交成功，创建案件ID: ${result.insertId}`);
        
        // 释放连接回连接池
        if (connection) {
            connection.release();
        }
        
        // 返回创建的案件信息
        const createdCase = {
            id: result.insertId,
            case_number: safeCaseNumber,
            case_type: safeCaseType,
            case_date: safeCaseDate,
            user_id: safeUserId,
            receiver: finalReceiver,
            receiver_id: finalReceiverId,
            assigned_to: finalReceiver,
            assigned_to_id: finalReceiverId,
            status: '已完成',
            completed_at: new Date()
        };
        
        // 发送案件分配通知
        if (finalIsAllocated && finalReceiverId !== safeUserId) {
            try {
                // 根据创建人角色和案件类型选择合适的通知方法
                if (creatorRole === '开发商') {
                    // 开发商角色创建的案件，获取申请人信息
                    await NotificationService.sendDeveloperAllocationNotification(
                        finalReceiverId,
                        safeCaseType,
                        safeApplicant
                    );
                    console.log(`[${operationId}] 已发送开发商案件分配通知给收件人ID: ${finalReceiverId}`);
                } else {
                    // 收件人之间的案件分配，获取案件类型
                    await NotificationService.sendReceiverAllocationNotification(
                        finalReceiverId,
                        safeCaseType
                    );
                    console.log(`[${operationId}] 已发送收件人之间案件分配通知给收件人ID: ${finalReceiverId}`);
                }
            } catch (notificationError) {
                console.error(`[${operationId}] 发送案件分配通知失败:`, notificationError);
                // 通知发送失败不影响案件创建流程，继续执行
            }
        }
        
        // 发送轮到下一个收件人收件的通知
        // 只有收件人之间创建的案件才需要提醒下一个收件人，开发商转移的案件不需要
        if (creatorRole !== '开发商') {
            try {
                // 获取下一个收件人信息
                const nextReceiver = await getNextCaseReceiver(db, finalReceiverId, safeCaseType);
                if (nextReceiver && nextReceiver.id !== finalReceiverId) {
                    // 发送轮到收件通知
                    await NotificationService.sendNextReceiverNotification(
                        nextReceiver.id,
                        finalReceiver, // 当前收件人姓名
                        safeCaseType,
                        safeApplicant
                    );
                    console.log(`[${operationId}] 已发送轮到收件通知给收件人ID: ${nextReceiver.id}`);
                }
            } catch (nextReceiverError) {
                console.error(`[${operationId}] 发送轮到收件通知失败:`, nextReceiverError);
                // 通知发送失败不影响案件创建流程，继续执行
            }
        }
        
        const endTime = Date.now();
        console.log(`[${operationId}] 案件创建成功，耗时: ${endTime - startTime}ms`);
        
        return createdCase;
    } catch (error) {
        // 回滚事务
        if (connection) {
            try {
                await connection.rollback();
                console.error(`[${operationId}] 数据库事务已回滚`);
            } catch (rollbackError) {
                console.error(`[${operationId}] 事务回滚失败:`, rollbackError);
            }
        }
        
        // 释放连接回连接池
        if (connection) {
            connection.release();
        }
        
        const endTime = Date.now();
        console.error(`[${operationId}] 案件创建失败，耗时: ${endTime - startTime}ms`);
        console.error(`[${operationId}] 错误详情:`, error);
        
        // 重新抛出错误，保留原始错误信息
        throw error;
    }
}

/**
 * 获取案件详情
 */
export async function getCaseById(db, caseId) {
    try {
        const [cases] = await db.execute(
            'SELECT c.*, c.receiver as receiver_name FROM cases c WHERE c.id = ?',
            [caseId]
        );
        
        if (cases.length === 0) {
            return null;
        }
        
        return cases[0];
    } catch (error) {
        console.error('获取案件详情错误:', error);
        throw error;
    }
}

/**
 * 获取所有案件（管理员用）
 */
export async function getAllCases(db, queryParams) {
    try {
        // 安全地解析查询参数，确保数值类型正确
        const page = parseInt(queryParams.page) || 1;
        const pageSize = parseInt(queryParams.pageSize) || 20;
        const caseType = queryParams.caseType;
        const startDate = queryParams.startDate;
        const endDate = queryParams.endDate;
        // 安全地获取receiver参数，使用字符串而不是ID
        const receiver = queryParams.receiver;
        
        const offset = (page - 1) * pageSize;
        
        // 构建查询条件
        let whereClause = '';
        const params = [];
        
        // 添加过滤条件 - 只添加有效的非空参数
        const conditions = [];
        
        if (caseType && caseType.trim()) {
            conditions.push('case_type = ?');
            params.push(caseType);
        }
        
        if (receiver && receiver.trim()) {
            conditions.push('receiver = ?');
            params.push(receiver);
        }
        
        if (startDate && endDate) {
            conditions.push('case_date BETWEEN ? AND ?');
            params.push(startDate, endDate);
        }
        
        if (conditions.length > 0) {
            whereClause = 'WHERE ' + conditions.join(' AND ');
        }
        
        // 构建查询语句
        const selectQuery = `
            SELECT c.*, u.real_name as user_name, c.receiver as receiver_name 
            FROM cases c
            LEFT JOIN users u ON c.user_id = u.id
            ${whereClause}
            ORDER BY c.created_at DESC
            LIMIT ? OFFSET ?
        `;
        
        const countQuery = `
            SELECT COUNT(*) as total 
            FROM cases 
            ${whereClause}
        `;
        
        // 执行查询
        const [cases] = await db.execute(selectQuery, [...params, pageSize, offset]);
        const [countResult] = await db.execute(countQuery, params);
        const totalCount = countResult[0].total;
        
        return {
            cases,
            pagination: {
                total: totalCount,
                page: parseInt(page),
                pageSize: parseInt(pageSize),
                totalPages: Math.ceil(totalCount / pageSize)
            }
        };
    } catch (error) {
        console.error('获取所有案件列表错误:', error);
        throw error;
    }
}

/**
 * 更新案件 - 用于分配等操作
 */
export async function updateCase(db, caseId, caseData, userId, isAdmin = false) {
    try {
        // 先获取现有案件信息
        const [existingCases] = await db.execute('SELECT * FROM cases WHERE id = ?', [caseId]);
        
        if (!existingCases || existingCases.length === 0) {
            throw new Error('案件不存在');
        }
        
        const existingCase = existingCases[0];
        
        // 检查权限：用户只能更新自己创建的案件，管理员可以更新任何案件
        if (!isAdmin && existingCase.user_id !== userId) {
            throw new Error('无权更新此案件');
        }
        
        // 构建更新查询和参数
        let updateFields = [];
        let updateParams = [];
        
        const allowedFields = ['case_number', 'case_type', 'case_date', 'applicant', 'agent', 
                              'developer', 'complexity_level', 'priority_level', 'is_allocated', 
                              'receiver', 'allocated_at', 'status', 'completed_at'];
        
        // 处理输入数据，将驼峰命名转换为下划线命名
        const caseDataWithUnderscore = {};
        for (const [key, value] of Object.entries(caseData)) {
            if (key.includes('caseNumber')) caseDataWithUnderscore['case_number'] = value;
            else if (key.includes('caseType')) caseDataWithUnderscore['case_type'] = value;
            else if (key.includes('caseDate')) caseDataWithUnderscore['case_date'] = value;
            else if (key === 'complexity') caseDataWithUnderscore['complexity_level'] = value;
            else if (key === 'priority') caseDataWithUnderscore['priority_level'] = value;
            // 保持receiver字段不变
            else caseDataWithUnderscore[key] = value;
        }
        
        // 如果案件被分配，默认将状态设置为已完成
        if (caseDataWithUnderscore.is_allocated === true || caseDataWithUnderscore.receiver) {
            caseDataWithUnderscore.status = '已完成';
            caseDataWithUnderscore.completed_at = new Date();
        }
        
        // 复杂度转换：将中文转换为整数
        const complexityMap = {
            '低': 1,
            '中': 2,
            '高': 3
        };
        // 优先级转换：将中文转换为整数
        const priorityMap = {
            '低': 1,
            '中': 2,
            '高': 3
        };
        
        for (const field of allowedFields) {
            if (caseDataWithUnderscore[field] !== undefined) {
                let value = caseDataWithUnderscore[field];
                
                // 对复杂度和优先级字段进行中文到整数的转换
                if (field === 'complexity_level' && typeof value === 'string') {
                    value = complexityMap[value] || complexityMap['中'];
                } else if (field === 'priority_level' && typeof value === 'string') {
                    value = priorityMap[value] || priorityMap['中'];
                }
                // 确保receiver字段不为null，因为数据库字段不允许NULL，默认为当前用户ID
                else if (field === 'receiver' && (value === null || value === '')) {
                    value = userId;
                }
                
                updateFields.push(`${field} = ?`);
                updateParams.push(value);
            }
        }
        
        updateFields.push('updated_at = NOW()');
        updateParams.push(caseId);
        
        const query = `UPDATE cases SET ${updateFields.join(', ')} WHERE id = ?`;
        
        await db.execute(query, updateParams);
        
        // 获取更新后的案件信息
        const [updatedCases] = await db.execute(
            'SELECT c.*, r.real_name as receiver_name FROM cases c LEFT JOIN users r ON c.receiver = r.id WHERE c.id = ?', 
            [caseId]
        );
        return updatedCases[0];
    } catch (error) {
        console.error('更新案件错误:', error);
        throw error;
    }
}
