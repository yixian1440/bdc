import db from '../config/database.js';
import { 
    rolePermissions, 
    getCreatableTypesByRole, 
    getReceivableTypesByRole, 
    canCreateCaseType, 
    isCaseTypeInCategoryStatic 
} from '../config/permissions.js';

/**
 * 验证用户是否有权限创建特定类型的案件
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express next函数
 */
export const verifyCaseCreationPermission = async (req, res, next) => {
    try {
        // 调试日志：输出请求体内容
        console.log('请求体内容:', req.body);
        
        // 获取案件类型，支持多种命名方式
        let caseType = req.body.caseType || req.body.case_type || req.body.type;
        const userRole = req.user.role;
        
        // 调试日志：输出案件类型和用户角色
        console.log('获取到的案件类型:', caseType);
        console.log('用户角色:', userRole);
        
        // 参数验证
        if (!caseType) {
            return res.status(400).json({
                success: false,
                message: '案件类型不能为空'
            });
        }
        
        // 调试日志：输出角色权限配置
        console.log('角色权限配置:', rolePermissions[userRole]);
        
        // 优先使用静态权限配置进行验证
        console.log(`使用静态权限配置验证用户 ${userRole} 是否可以创建 ${caseType} 类型案件`);
        
        // 直接检查角色是否为管理员，如果是管理员，则直接通过验证
        if (userRole === '管理员') {
            console.log('管理员角色，直接通过权限验证');
            return next();
        }
        
        // 检查用户是否有权限创建该类型的案件
        if (canCreateCaseType(userRole, caseType)) {
            console.log(`用户 ${userRole} 有权限创建 ${caseType} 类型案件`);
            return next();
        }
        
        // 可选：尝试从数据库获取更精确的权限（如果表存在）
        let hasDbPermission = false;
        try {
            const [rows] = await db.execute(
                'SELECT * FROM case_type_role_mapping WHERE case_type = ? AND role = ? AND can_create = TRUE',
                [caseType, userRole]
            );
            hasDbPermission = rows.length > 0;
        } catch (dbError) {
            console.warn('数据库权限验证跳过，使用静态配置:', dbError.message);
            // 静默忽略数据库错误，继续使用静态配置
        }
        
        if (hasDbPermission) {
            console.log(`从数据库获取到用户 ${userRole} 有权限创建 ${caseType} 类型案件`);
            return next();
        }
        
        // 调试日志：输出所有可创建的案件类型
        console.log(`用户 ${userRole} 可创建的案件类型:`, rolePermissions[userRole]?.creatableTypes);
        
        return res.status(403).json({
            success: false,
            message: `您没有权限创建${caseType}类型的案件`,
            debug: {
                userRole: userRole,
                caseType: caseType,
                creatableTypes: rolePermissions[userRole]?.creatableTypes
            }
        });
    } catch (error) {
        console.error('权限验证错误:', error);
        console.error('错误堆栈:', error.stack);
        res.status(500).json({
            success: false,
            message: '权限验证失败',
            error: error.message
        });
    }
};

/**
 * 验证用户是否有权限查看特定案件
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express next函数
 */
export const verifyCaseViewPermission = async (req, res, next) => {
    try {
        const caseId = req.params.id || req.query.caseId;
        const userId = req.user.id;
        const userRole = req.user.role;
        
        // 管理员可以查看所有案件
        if (userRole === '管理员') {
            return next();
        }
        
        // 检查案件是否属于当前用户或分配给当前用户
        const [rows] = await db.execute(
            'SELECT * FROM cases WHERE id = ? AND (user_id = ? OR receiver_id = ?)',
            [caseId, userId, userId]
        );
        
        if (rows.length === 0) {
            return res.status(403).json({
                success: false,
                message: '您无权访问此案件'
            });
        }
        
        next();
    } catch (error) {
        console.error('案件访问权限验证错误:', error);
        res.status(500).json({
            success: false,
            message: '权限验证失败',
            error: error.message
        });
    }
};

/**
 * 获取用户可创建的案件类型列表
 * @param {string} role - 用户角色
 * @returns {Promise<Array>} 可创建的案件类型列表
 */
export const getUserCreatableCaseTypes = async (role) => {
    // 确保角色参数存在
    if (!role) {
        console.error('获取用户可创建案件类型失败: 角色参数为空');
        return [];
    }
    
    // 优先使用静态配置获取权限
    console.log(`使用静态权限配置获取角色 ${role} 的可创建案件类型`);
    const staticPermissions = getCreatableTypesByRole(role);
    
    // 可选：尝试从数据库获取更精确的权限（如果表存在）
    try {
        const [rows] = await db.execute(
            'SELECT case_type FROM case_type_role_mapping WHERE role = ? AND can_create = TRUE',
            [role]
        );
        
        if (Array.isArray(rows) && rows.length > 0) {
            console.log(`从数据库获取到角色 ${role} 的可创建案件类型`);
            return rows.map(row => row.case_type).filter(Boolean);
        }
    } catch (error) {
        console.warn('数据库查询跳过，使用静态配置:', error.message);
        // 静默忽略数据库错误，继续使用静态配置
    }
    
    // 返回静态配置的权限
    return staticPermissions;
};

/**
 * 获取用户可接收的案件类型列表
 * @param {string} role - 用户角色
 * @returns {Promise<Array>} 可接收的案件类型列表
 */
export const getUserReceivableCaseTypes = async (role) => {
    // 确保角色参数存在
    if (!role) {
        console.error('获取用户可接收案件类型失败: 角色参数为空');
        return [];
    }
    
    // 优先使用静态配置获取权限
    console.log(`使用静态权限配置获取角色 ${role} 的可接收案件类型`);
    const staticPermissions = getReceivableTypesByRole(role);
    
    // 可选：尝试从数据库获取更精确的权限（如果表存在）
    try {
        const [rows] = await db.execute(
            'SELECT case_type FROM case_type_role_mapping WHERE role = ? AND can_receive = TRUE',
            [role]
        );
        
        if (Array.isArray(rows) && rows.length > 0) {
            console.log(`从数据库获取到角色 ${role} 的可接收案件类型`);
            return rows.map(row => row.case_type).filter(Boolean);
        }
    } catch (error) {
        console.warn('数据库查询跳过，使用静态配置:', error.message);
        // 静默忽略数据库错误，继续使用静态配置
    }
    
    // 返回静态配置的权限
    return staticPermissions;
};

/**
 * 检查案件类型是否属于特定类别
 * @param {string} caseType - 案件类型
 * @param {string} category - 类别名称
 * @returns {Promise<boolean>} 是否属于该类别
 */
export const isCaseTypeInCategory = async (caseType, category) => {
    // 参数验证
    if (!caseType || !category) {
        console.error('检查案件类型类别失败: 参数不完整');
        return false;
    }
    
    // 优先使用静态配置进行检查
    console.log(`使用静态配置检查案件类型 ${caseType} 是否属于类别 ${category}`);
    const staticResult = isCaseTypeInCategoryStatic(caseType, category);
    
    // 可选：尝试从数据库获取更精确的信息（如果表存在）
    try {
        const [rows] = await db.execute(
            'SELECT * FROM case_types WHERE name = ? AND category = ?',
            [caseType, category]
        );
        console.log(`从数据库获取到案件类型 ${caseType} 的类别信息`);
        return rows.length > 0;
    } catch (error) {
        console.warn('数据库查询跳过，使用静态配置:', error.message);
        // 静默忽略数据库错误，返回静态配置的结果
    }
    
    // 返回静态配置的结果
    return staticResult;
};
