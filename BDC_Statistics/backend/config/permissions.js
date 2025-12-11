// 角色权限映射配置 - 用于替代case_type_role_mapping表
export const rolePermissions = {
    // 收件人角色权限
    '收件人': {
        creatableTypes: ['一般件', '复杂件', '特殊件', '分割转让', '自建房', '开发商首次', '开发商转移', '国资件', '企业件'],
        receivableTypes: ['一般件', '复杂件', '特殊件', '分割转让', '自建房', '开发商首次', '开发商转移', '国资件', '企业件'],
        canCreate: true,
        canReceive: true,
        modules: {
            '全部收件管理': false,
            '用户管理': false,
            '统计报表': true,
            '我的收件': true,
            '开发商业务': false,
            '国资企业业务': false
        }
    },
    
    // 开发商角色权限
    '开发商': {
        creatableTypes: ['一般件', '复杂件', '分割转让', '自建房', '开发商首次', '开发商转移'],
        receivableTypes: ['一般件', '复杂件', '分割转让', '自建房', '开发商首次', '开发商转移'],
        canCreate: true,
        canReceive: true,
        modules: {
            '全部收件管理': false,
            '用户管理': false,
            '统计报表': false,
            '我的收件': true,
            '开发商业务': true,
            '国资企业业务': false
        }
    },
    
    // 国资企业专窗角色权限
    '国资企业专窗': {
        creatableTypes: ['国资件', '企业件'],
        receivableTypes: ['国资件', '企业件'],
        canCreate: true,
        canReceive: true,
        modules: {
            '全部收件管理': false,
            '用户管理': false,
            '统计报表': true,
            '我的收件': true,
            '开发商业务': false,
            '国资企业业务': true
        }
    },
    
    // 管理员角色权限
    '管理员': {
        creatableTypes: ['一般件', '复杂件', '特殊件', '分割转让', '自建房', '开发商首次', '开发商转移', '国资件', '企业件'],
        receivableTypes: ['一般件', '复杂件', '特殊件', '分割转让', '自建房', '开发商首次', '开发商转移', '国资件', '企业件'],
        canCreate: true,
        canReceive: true,
        modules: {
            '全部收件管理': true,
            '用户管理': true,
            '统计报表': true,
            '我的收件': true,
            '开发商业务': true,
            '国资企业业务': true
        }
    }
};

/**
 * 案件类型类别映射
 * 用于替代case_types表
 */
export const caseTypeCategories = {
    '一般件': '常规',
    '复杂件': '复杂',
    '特殊件': '特殊'
};

/**
 * 获取用户可创建的案件类型
 * @param {string} role - 用户角色
 * @returns {Array} 可创建的案件类型数组
 */
export const getCreatableTypesByRole = (role) => {
    if (!role || !rolePermissions[role]) {
        return [];
    }
    return rolePermissions[role].creatableTypes || [];
};

/**
 * 获取用户可接收的案件类型
 * @param {string} role - 用户角色
 * @returns {Array} 可接收的案件类型数组
 */
export const getReceivableTypesByRole = (role) => {
    if (!role || !rolePermissions[role]) {
        return [];
    }
    return rolePermissions[role].receivableTypes || [];
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
    return rolePermissions[role].creatableTypes.includes(caseType);
};

/**
 * 检查案件类型是否属于特定类别
 * @param {string} caseType - 案件类型
 * @param {string} category - 类别名称
 * @returns {boolean} 是否属于该类别
 */
export const isCaseTypeInCategoryStatic = (caseType, category) => {
    if (!caseType || !category) {
        return false;
    }
    return caseTypeCategories[caseType] === category;
};
