/**
 * 统计数据模块 - 包含所有与统计相关的函数
 */

/**
 * 获取不同类型案件的统计数据
 * 使用case_types表进行分类统计，确保数据一致性
 * 返回具体的案件类型名称（case_types.name）
 */
export async function getCasesByType(db, userId, timeCondition, timeParams, userRole = null) {
    try {
        // 使用case_types表进行统计，按具体案件类型名称分组
        let query = `
            SELECT 
                ct.name as case_type,
                COUNT(*) as total_count,
                SUM(CASE WHEN c.status = '已完成' THEN 1 ELSE 0 END) as completed_count,
                SUM(CASE WHEN c.status = '处理中' THEN 1 ELSE 0 END) as in_progress_count,
                SUM(CASE WHEN c.status = '待处理' THEN 1 ELSE 0 END) as pending_count
            FROM cases c
            INNER JOIN case_types ct ON c.case_type = ct.name
            WHERE ct.is_active = 1
        `;
        
        // 为当前查询创建独立的参数数组，避免修改全局timeParams
        const queryParams = [...(Array.isArray(timeParams) ? timeParams : [])];
        
        // 添加用户过滤条件
        if (!userRole || userRole !== '管理员') {
            if (userRole === '收件人' || userRole === '国资企业专窗') {
                // 收件人和国资企业专窗可以查看所有收件人的统计数据
                // 不需要添加过滤条件，允许查看所有收件人
            } else {
                // 其他非管理员用户只能查看自己创建的案件
                query += ' AND c.user_id = ?';
                queryParams.unshift(userId);
            }
        }
        
        // 添加时间过滤条件
        if (timeCondition) {
            query += ` ${timeCondition}`;
        }
        
        // 按具体案件类型名称分组，确保每个案件类型独立统计
        query += ' GROUP BY ct.name';
        query += ' ORDER BY total_count DESC';
        
        const [results] = await db.execute(query, queryParams);
        
        console.log('getCasesByType查询结果:', results);
        
        // 格式化数据
        return results;
    } catch (error) {
        console.error('获取案件类型统计数据错误:', error);
        return [];
    }
}

/**
 * 获取分角色统计数据
 */
export async function getRoleStatistics(db, userId, userRole, timeCondition, timeParams) {
    try {
        // 简化查询，只返回角色和案件数量
        let query = `
            SELECT 
                u.role,
                COUNT(*) as total_count,
                SUM(CASE WHEN c.status = '已完成' THEN 1 ELSE 0 END) as completed_count,
                SUM(CASE WHEN c.status = '处理中' THEN 1 ELSE 0 END) as in_progress_count
            FROM cases c
            JOIN users u ON c.receiver = u.real_name
            WHERE 1=1
        `;
        
        // 为当前查询创建独立的参数数组，避免修改全局timeParams
        const queryParams = [...(Array.isArray(timeParams) ? timeParams : [])];
        
        // 添加用户过滤条件
        if (!userRole || userRole !== '管理员') {
            if (userRole === '收件人' || userRole === '国资企业专窗') {
                // 收件人和国资企业专窗可以查看所有收件人的统计数据
                // 不需要添加过滤条件，允许查看所有收件人
            } else {
                // 其他非管理员用户只能查看自己创建的案件
                query += ' AND c.user_id = ?';
                queryParams.unshift(userId);
            }
        }
        
        // 添加时间过滤条件
        if (timeCondition) {
            query += ` ${timeCondition}`;
        }
        
        query += ' GROUP BY u.role';
        
        const [results] = await db.execute(query, queryParams);
        
        console.log('getRoleStatistics查询结果:', results);
        
        // 格式化数据
        return results;
    } catch (error) {
        console.error('获取分角色统计数据错误:', error);
        return [];
    }
}

/**
 * 获取开发商统计数据
 * 统计各个楼盘的开发商转移件数量
 */
export async function getDeveloperStatistics(db, userId, userRole, timeCondition, timeParams) {
    // 统计各个楼盘的开发商转移件数量，显示所有项目，包括没有案件的项目
    // 移除"未知开发商"显示，只显示实际楼盘名称
    
    // 构建WHERE条件，包含所有过滤条件
    let whereCondition = `
        c.case_type = '开发商转移' -- 只统计开发商转移案件
    `;
    
    // 添加角色过滤条件
    if (userRole === '开发商') {
        whereCondition += ` AND c.user_id = ? `;
    }
    
    // 添加时间过滤条件
    if (timeCondition && typeof timeCondition === 'string') {
        const condition = timeCondition.trim();
        if (condition.startsWith('AND')) {
            whereCondition += ` ${condition} `;
        } else {
            whereCondition += ` AND ${condition} `;
        }
    }
    
    // 主查询：显示所有11个楼盘，包括没有案件的项目
    let query = `
        SELECT 
            dp.project_name as developer_name, -- 使用developer_projects表中的project_name作为开发商名称
            COUNT(c.id) as total_count -- 统计案件数量
        FROM developer_projects dp
        LEFT JOIN cases c ON dp.project_name = c.developer
        AND ${whereCondition}
        GROUP BY dp.project_name -- 按开发商名称分组
        ORDER BY total_count DESC -- 按案件数量降序排列
    `;
    
    let queryParams = [];
    
    // 添加角色过滤条件参数
    if (userRole === '开发商') {
        queryParams.push(userId);
    }
    
    // 添加时间过滤条件参数
    if (timeCondition && typeof timeCondition === 'string' && Array.isArray(timeParams)) {
        queryParams = [...queryParams, ...timeParams];
    }
    
    try {
        const [results] = await db.execute(query, queryParams);
        
        console.log('getDeveloperStatistics查询结果:', results);
        
        // 格式化数据，确保没有null值
        return results;
    } catch (error) {
        console.error('获取开发商统计失败:', error);
        return [];
    }
}

/**
 * 获取收件人详细统计数据，包含case_type维度
 * 关联cases和case_types表，确保只返回case_types表中定义的案件类型
 */
export async function getReceiverDetailStatistics(db, userId, userRole, timeCondition, timeParams) {
    try {
        // 收件人详细统计查询，按收件人和案件类型分组
        // 使用INNER JOIN确保只统计case_types表中定义的案件类型
        let query = `
            SELECT 
                c.receiver as real_name,
                ct.name as case_type,
                COUNT(*) as total_count,
                SUM(CASE WHEN c.status = '已完成' THEN 1 ELSE 0 END) as completed_count,
                SUM(CASE WHEN c.status = '处理中' THEN 1 ELSE 0 END) as in_progress_count,
                SUM(CASE WHEN c.status = '待处理' THEN 1 ELSE 0 END) as pending_count
            FROM cases c
            INNER JOIN case_types ct ON c.case_type = ct.name
            WHERE ct.is_active = 1
        `;
        
        // 为当前查询创建独立的参数数组，避免修改全局timeParams
        const queryParams = [...(Array.isArray(timeParams) ? timeParams : [])];
        
        // 添加用户过滤条件
        if (!userRole || userRole !== '管理员') {
            if (userRole === '收件人' || userRole === '国资企业专窗') {
                // 收件人和国资企业专窗可以查看所有收件人的统计数据
                // 不需要添加过滤条件，允许查看所有收件人
            } else {
                // 其他非管理员用户只能查看自己创建的案件
                query += ' AND c.user_id = ?';
                queryParams.unshift(userId);
            }
        }
        
        // 添加时间过滤条件
        if (timeCondition) {
            query += ` ${timeCondition}`;
        }
        
        // 按收件人和案件类型分组
        query += ' GROUP BY c.receiver, ct.name';
        query += ' ORDER BY c.receiver, total_count DESC';
        
        const [results] = await db.execute(query, queryParams);
        
        console.log('getReceiverDetailStatistics查询结果:', results);
        
        // 格式化数据
        return results;
    } catch (error) {
        console.error('获取收件人详细统计数据错误:', error);
        return [];
    }
}



/**
 * 获取案件来源渠道统计
 * 统计不同来源渠道的案件数量
 * 来源渠道包括：开发商提交、国资企业提交、其他渠道等
 */
export async function getCaseSourceStatistics(db, userId, userRole, timeCondition, timeParams) {
    try {
        // 案件来源渠道统计查询
        // 使用CASE语句根据case_type和相关字段区分来源渠道
        let query = `
            SELECT 
                CASE 
                    WHEN c.case_type LIKE '%开发商%' OR c.developer_id IS NOT NULL THEN '开发商提交' 
                    WHEN c.case_type LIKE '%国资%' THEN '国资企业提交' 
                    WHEN c.case_type LIKE '%企业%' THEN '企业提交' 
                    ELSE '其他渠道' 
                END as source_channel,
                COUNT(*) as count,
                SUM(CASE WHEN c.status = '已完成' THEN 1 ELSE 0 END) as completed_count
            FROM cases c
            WHERE 1=1
        `;
        
        // 为当前查询创建独立的参数数组，避免修改全局timeParams
        const queryParams = [...(Array.isArray(timeParams) ? timeParams : [])];
        
        // 添加用户过滤条件
        if (!userRole || userRole !== '管理员') {
            if (userRole === '收件人' || userRole === '国资企业专窗') {
                // 收件人和国资企业专窗可以查看所有收件人的统计数据
                // 不需要添加过滤条件，允许查看所有收件人
            } else {
                // 其他非管理员用户只能查看自己创建的案件
                query += ' AND c.user_id = ?';
                queryParams.unshift(userId);
            }
        }
        
        // 添加时间过滤条件
        if (timeCondition) {
            query += ` ${timeCondition}`;
        }
        
        // 按案件来源渠道分组
        query += ' GROUP BY source_channel';
        query += ' ORDER BY count DESC';
        
        const [results] = await db.execute(query, queryParams);
        
        console.log('getCaseSourceStatistics查询结果:', results);
        
        // 格式化数据
        return results;
    } catch (error) {
        console.error('获取案件来源统计数据错误:', error);
        return [];
    }
}

/**
 * 统计数据处理主函数
 */
export async function getStatisticsHandler(req, res) {
    try {
        const userId = req.user.id;
        const { timeFilter = 'month', year, month, startDate, endDate } = req.query;
        const userRole = req.user.role;
        
        console.log('统计分析请求:', { userId, userRole, timeFilter, year, month, startDate, endDate });

        // 构建时间筛选条件
        let timeCondition = '';
        let timeParams = [];

        // 优先使用startDate和endDate参数（如果提供）
        if (startDate && endDate) {
            console.log('使用自定义日期范围:', { startDate, endDate });
            timeCondition = 'AND case_date >= ? AND case_date <= ?';
            timeParams = [startDate, endDate];
        } else if (timeFilter === 'week') {
            timeCondition = 'AND case_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
        } else if (timeFilter === 'month') {
            timeCondition = 'AND case_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
        } else if (timeFilter === 'year') {
            if (year) {
                timeCondition = 'AND YEAR(case_date) = ?';
                timeParams = [parseInt(year)];
            } else {
                timeCondition = 'AND YEAR(case_date) = YEAR(NOW())';
            }
        } else if (timeFilter === 'custom' && year && month) {
            timeCondition = 'AND YEAR(case_date) = ? AND MONTH(case_date) = ?';
            timeParams = [parseInt(year), parseInt(month)];
        }
        
        // 获取用户基本信息
        let userInfo = [];
        try {
            [userInfo] = await db.execute('SELECT real_name, expertise_level FROM users WHERE id = ?', [userId]);
        } catch (userError) {
            console.error('获取用户信息错误:', userError);
            userInfo = [{ real_name: '未知用户', expertise_level: '未知' }];
        }
        
        // 初始化所有统计数据为默认值，确保即使查询失败也能返回有效结构
        let typeStats = [];
        let users = [];
        let receiverStats = [];
        let roleStatistics = [];
        let developerStatistics = [];
        
        // 这里简化处理，具体实现会在主路由文件中通过导入其他模块来完成
        res.json({
            success: true,
            userInfo: userInfo[0] || {},
            typeStats,
            users,
            receiverStats,
            roleStatistics,
            developerStatistics
        });
    } catch (error) {
        console.error('统计数据处理错误:', error);
        res.status(500).json({ success: false, message: '获取统计数据失败', error: error.message });
    }
}

