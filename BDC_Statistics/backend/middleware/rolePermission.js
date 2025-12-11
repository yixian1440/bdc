import { rolePermissions } from '../config/permissions.js';

/**
 * 验证用户是否有权限访问特定模块
 * @param {string} moduleName - 模块名称
 * @returns {Function} Express中间件函数
 */
export const verifyModuleAccess = (moduleName) => {
    return (req, res, next) => {
        try {
            const userRole = req.user.role;
            
            // 管理员可以访问所有模块
            if (userRole === '管理员') {
                return next();
            }
            
            // 检查用户角色是否有对应的权限配置
            if (!rolePermissions[userRole]) {
                return res.status(403).json({
                    success: false,
                    message: '用户角色没有配置权限'
                });
            }
            
            // 检查用户是否有权限访问该模块
            const hasAccess = rolePermissions[userRole].modules[moduleName] === true;
            
            if (!hasAccess) {
                return res.status(403).json({
                    success: false,
                    message: `您没有权限访问${moduleName}模块`,
                    debug: {
                        userRole: userRole,
                        moduleName: moduleName,
                        moduleAccess: rolePermissions[userRole].modules
                    }
                });
            }
            
            next();
        } catch (error) {
            console.error('模块访问权限验证错误:', error);
            res.status(500).json({
                success: false,
                message: '模块访问权限验证失败',
                error: error.message
            });
        }
    };
};

/**
 * 获取用户可访问的模块列表
 * @param {string} userRole - 用户角色
 * @returns {Array<string>} 可访问的模块列表
 */
export const getAccessibleModules = (userRole) => {
    // 管理员可以访问所有模块
    if (userRole === '管理员') {
        return Object.keys(rolePermissions[userRole].modules);
    }
    
    // 检查用户角色是否有对应的权限配置
    if (!rolePermissions[userRole]) {
        return [];
    }
    
    // 获取用户可访问的模块列表
    return Object.keys(rolePermissions[userRole].modules)
        .filter(moduleName => rolePermissions[userRole].modules[moduleName] === true);
};

/**
 * 检查用户是否有权限创建特定类型的案件
 * @param {string} role - 用户角色
 * @param {string} caseType - 案件类型
 * @returns {boolean} 是否有权限
 */
export const canCreateCaseType = (role, caseType) => {
    if (!role || !caseType || !rolePermissions[role]) {
        return false;
    }
    
    // 管理员可以创建所有类型的案件
    if (role === '管理员') {
        return true;
    }
    
    return rolePermissions[role].creatableTypes.includes(caseType);
};

/**
 * 检查用户是否有权限接收特定类型的案件
 * @param {string} role - 用户角色
 * @param {string} caseType - 案件类型
 * @returns {boolean} 是否有权限
 */
export const canReceiveCaseType = (role, caseType) => {
    if (!role || !caseType || !rolePermissions[role]) {
        return false;
    }
    
    // 管理员可以接收所有类型的案件
    if (role === '管理员') {
        return true;
    }
    
    return rolePermissions[role].receivableTypes.includes(caseType);
};
