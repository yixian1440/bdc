/**
 * 角色策略抽象类
 * 定义角色相关的公共接口
 */
class RoleStrategy {
    constructor(db) {
        this.db = db;
    }
    
    /**
     * 获取用户案件列表
     * @param {number} userId - 用户ID
     * @param {object} queryParams - 查询参数
     * @returns {Promise<object>} 案件列表和分页信息
     */
    async getUserCases(userId, queryParams) {
        throw new Error('必须实现getUserCases方法');
    }
    
    /**
     * 获取统计数据
     * @param {number} userId - 用户ID
     * @param {object} queryParams - 查询参数
     * @returns {Promise<object>} 统计数据
     */
    async getStatistics(userId, queryParams) {
        throw new Error('必须实现getStatistics方法');
    }
    
    /**
     * 检查案件创建权限
     * @param {number} userId - 用户ID
     * @param {object} caseData - 案件数据
     * @returns {Promise<boolean>} 是否有权限
     */
    async checkCaseCreationPermission(userId, caseData) {
        throw new Error('必须实现checkCaseCreationPermission方法');
    }
    
    /**
     * 检查案件查看权限
     * @param {number} userId - 用户ID
     * @param {number} caseId - 案件ID
     * @returns {Promise<boolean>} 是否有权限
     */
    async checkCaseViewPermission(userId, caseId) {
        throw new Error('必须实现checkCaseViewPermission方法');
    }
}

/**
 * 管理员角色策略
 */
class AdminStrategy extends RoleStrategy {
    async getUserCases(userId, queryParams) {
        // 管理员可以查看所有案件
        const sql = `
            SELECT c.*, u.real_name as user_name, c.receiver as receiver_name 
            FROM cases c
            LEFT JOIN users u ON c.user_id = u.id
            ORDER BY c.created_at DESC
            LIMIT ? OFFSET ?
        `;
        
        const page = parseInt(queryParams.page) || 1;
        const pageSize = parseInt(queryParams.pageSize) || 10;
        const offset = (page - 1) * pageSize;
        
        const [cases] = await this.db.execute(sql, [pageSize, offset]);
        const [countResult] = await this.db.execute('SELECT COUNT(*) as total FROM cases');
        
        return {
            cases,
            pagination: {
                total: countResult[0].total,
                page,
                pageSize,
                totalPages: Math.ceil(countResult[0].total / pageSize)
            }
        };
    }
    
    async getStatistics(userId, queryParams) {
        // 管理员可以查看所有统计数据
        // 这里可以调用现有的统计函数，不需要额外过滤
        return {
            // 管理员统计数据实现
        };
    }
    
    async checkCaseCreationPermission(userId, caseData) {
        // 管理员可以创建任何类型的案件
        return true;
    }
    
    async checkCaseViewPermission(userId, caseId) {
        // 管理员可以查看任何案件
        return true;
    }
}

/**
 * 收件人角色策略
 */
class ReceiverStrategy extends RoleStrategy {
    async getUserCases(userId, queryParams) {
        // 收件人只能查看自己创建的案件
        const sql = `
            SELECT c.*, u.real_name as user_name, c.receiver as receiver_name 
            FROM cases c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.user_id = ?
            ORDER BY c.created_at DESC
            LIMIT ? OFFSET ?
        `;
        
        const page = parseInt(queryParams.page) || 1;
        const pageSize = parseInt(queryParams.pageSize) || 10;
        const offset = (page - 1) * pageSize;
        
        const [cases] = await this.db.execute(sql, [userId, pageSize, offset]);
        const [countResult] = await this.db.execute('SELECT COUNT(*) as total FROM cases WHERE user_id = ?', [userId]);
        
        return {
            cases,
            pagination: {
                total: countResult[0].total,
                page,
                pageSize,
                totalPages: Math.ceil(countResult[0].total / pageSize)
            }
        };
    }
    
    async getStatistics(userId, queryParams) {
        // 收件人只能查看自己创建的统计数据
        return {
            // 收件人统计数据实现
        };
    }
    
    async checkCaseCreationPermission(userId, caseData) {
        // 收件人可以创建一般案件类型
        const allowedTypes = ['一般件', '自建房', '分割转让', '其他'];
        return allowedTypes.includes(caseData.caseType);
    }
    
    async checkCaseViewPermission(userId, caseId) {
        // 收件人只能查看自己创建的案件
        const [cases] = await this.db.execute('SELECT * FROM cases WHERE id = ? AND user_id = ?', [caseId, userId]);
        return cases.length > 0;
    }
}

/**
 * 开发商角色策略
 */
class DeveloperStrategy extends RoleStrategy {
    async getUserCases(userId, queryParams) {
        // 开发商只能查看自己创建的案件
        const sql = `
            SELECT c.*, u.real_name as user_name, c.receiver as receiver_name 
            FROM cases c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.user_id = ?
            ORDER BY c.created_at DESC
            LIMIT ? OFFSET ?
        `;
        
        const page = parseInt(queryParams.page) || 1;
        const pageSize = parseInt(queryParams.pageSize) || 10;
        const offset = (page - 1) * pageSize;
        
        const [cases] = await this.db.execute(sql, [userId, pageSize, offset]);
        const [countResult] = await this.db.execute('SELECT COUNT(*) as total FROM cases WHERE user_id = ?', [userId]);
        
        return {
            cases,
            pagination: {
                total: countResult[0].total,
                page,
                pageSize,
                totalPages: Math.ceil(countResult[0].total / pageSize)
            }
        };
    }
    
    async getStatistics(userId, queryParams) {
        // 开发商只能查看自己创建的统计数据
        return {
            // 开发商统计数据实现
        };
    }
    
    async checkCaseCreationPermission(userId, caseData) {
        // 开发商只能创建开发商相关案件
        const allowedTypes = ['开发商首次', '开发商转移'];
        return allowedTypes.includes(caseData.caseType);
    }
    
    async checkCaseViewPermission(userId, caseId) {
        // 开发商只能查看自己创建的案件
        const [cases] = await this.db.execute('SELECT * FROM cases WHERE id = ? AND user_id = ?', [caseId, userId]);
        return cases.length > 0;
    }
}

/**
 * 国资企业专窗角色策略
 */
class StateOwnedEnterpriseStrategy extends RoleStrategy {
    async getUserCases(userId, queryParams) {
        // 国资企业专窗只能查看自己创建的案件
        const sql = `
            SELECT c.*, u.real_name as user_name, c.receiver as receiver_name 
            FROM cases c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.user_id = ?
            ORDER BY c.created_at DESC
            LIMIT ? OFFSET ?
        `;
        
        const page = parseInt(queryParams.page) || 1;
        const pageSize = parseInt(queryParams.pageSize) || 10;
        const offset = (page - 1) * pageSize;
        
        const [cases] = await this.db.execute(sql, [userId, pageSize, offset]);
        const [countResult] = await this.db.execute('SELECT COUNT(*) as total FROM cases WHERE user_id = ?', [userId]);
        
        return {
            cases,
            pagination: {
                total: countResult[0].total,
                page,
                pageSize,
                totalPages: Math.ceil(countResult[0].total / pageSize)
            }
        };
    }
    
    async getStatistics(userId, queryParams) {
        // 国资企业专窗只能查看自己创建的统计数据
        return {
            // 国资企业专窗统计数据实现
        };
    }
    
    async checkCaseCreationPermission(userId, caseData) {
        // 国资企业专窗只能创建国资相关案件
        const allowedTypes = ['国资件', '企业件'];
        return allowedTypes.includes(caseData.caseType);
    }
    
    async checkCaseViewPermission(userId, caseId) {
        // 国资企业专窗只能查看自己创建的案件
        const [cases] = await this.db.execute('SELECT * FROM cases WHERE id = ? AND user_id = ?', [caseId, userId]);
        return cases.length > 0;
    }
}

/**
 * 角色策略工厂类
 */
export class RoleStrategyFactory {
    static getStrategy(role, db) {
        switch (role) {
            case '管理员':
                return new AdminStrategy(db);
            case '收件人':
                return new ReceiverStrategy(db);
            case '开发商':
                return new DeveloperStrategy(db);
            case '国资企业专窗':
                return new StateOwnedEnterpriseStrategy(db);
            default:
                throw new Error(`未知角色: ${role}`);
        }
    }
}

export default RoleStrategy;
