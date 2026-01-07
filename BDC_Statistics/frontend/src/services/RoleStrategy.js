/**
 * 角色策略抽象类
 * 定义角色相关的公共接口
 */
class RoleStrategy {
    constructor() {
        this.caseAPI = null;
    }
    
    /**
     * 设置API服务
     * @param {object} api - API服务对象
     */
    setAPI(api) {
        this.caseAPI = api;
    }
    
    /**
     * 获取用户案件列表
     * @param {object} params - 查询参数
     * @returns {Promise<object>} 案件列表和分页信息
     */
    async getUserCases(params = {}) {
        // 安全默认实现
        return { cases: [], total: 0, pagination: { total: 0, page: 1, pageSize: 10, totalPages: 0 } };
    }
    
    /**
     * 获取统计数据
     * @param {object} params - 查询参数
     * @returns {Promise<object>} 统计数据
     */
    async getStatistics(params = {}) {
        // 安全默认实现
        return { totalCases: 0, completedCases: 0, pendingCases: 0, caseTypeDistribution: {} };
    }
    
    /**
     * 获取可用的案件类型
     * @returns {Array} 可用的案件类型列表
     */
    getAvailableCaseTypes() {
        // 安全默认实现
        return [];
    }
    
    /**
     * 检查是否有创建案件的权限
     * @returns {boolean} 是否有权限
     */
    hasCreatePermission() {
        // 安全默认实现
        return false;
    }
    
    /**
     * 检查是否是管理员
     * @returns {boolean} 是否是管理员
     */
    isAdmin() {
        return false;
    }
    
    /**
     * 检查是否是开发商
     * @returns {boolean} 是否是开发商
     */
    isDeveloper() {
        return false;
    }
}

/**
 * 管理员角色策略
 */
class AdminStrategy extends RoleStrategy {
    async getUserCases(params = {}) {
        if (!this.caseAPI || !this.caseAPI.getAllCases) {
            throw new Error('API服务不可用');
        }
        return this.caseAPI.getAllCases(params);
    }
    
    async getStatistics(params = {}) {
        if (!this.caseAPI || !this.caseAPI.getStatistics) {
            throw new Error('API服务不可用');
        }
        // 管理员可以获取所有统计数据
        params.timeFilter = 'all';
        return this.caseAPI.getStatistics(params);
    }
    
    getAvailableCaseTypes() {
        // 管理员可以创建所有类型的案件
        return [
            '一般件', '自建房', '分割转让', '其他', 
            '开发商转移', '开发商首次', '国资件', '企业件', '银行抵押'
        ];
    }
    
    hasCreatePermission() {
        // 管理员可以创建任何案件
        return true;
    }
    
    isAdmin() {
        return true;
    }
}

/**
 * 收件人角色策略
 */
class ReceiverStrategy extends RoleStrategy {
    async getUserCases(params = {}) {
        if (!this.caseAPI || !this.caseAPI.getMyCases) {
            throw new Error('API服务不可用');
        }
        params.viewMode = 'submitted';
        return this.caseAPI.getMyCases(params);
    }
    
    async getStatistics(params = {}) {
        if (!this.caseAPI || !this.caseAPI.getStatistics) {
            throw new Error('API服务不可用');
        }
        return this.caseAPI.getStatistics(params);
    }
    
    getAvailableCaseTypes() {
        // 收件人可以创建一般案件类型
        return ['一般件', '自建房', '分割转让', '其他', '银行抵押'];
    }
    
    hasCreatePermission() {
        return true;
    }
}

/**
 * 开发商角色策略
 */
class DeveloperStrategy extends RoleStrategy {
    async getUserCases(params = {}) {
        if (!this.caseAPI || !this.caseAPI.getMyCases) {
            throw new Error('API服务不可用');
        }
        params.viewMode = 'submitted';
        return this.caseAPI.getMyCases(params);
    }
    
    async getStatistics(params = {}) {
        if (!this.caseAPI || !this.caseAPI.getStatistics) {
            throw new Error('API服务不可用');
        }
        return this.caseAPI.getStatistics(params);
    }
    
    getAvailableCaseTypes() {
        // 开发商只能创建开发商相关案件
        return ['开发商首次', '开发商转移'];
    }
    
    hasCreatePermission() {
        return true;
    }
    
    isDeveloper() {
        return true;
    }
}

/**
 * 国资企业专窗角色策略
 */
class StateOwnedEnterpriseStrategy extends RoleStrategy {
    async getUserCases(params = {}) {
        if (!this.caseAPI || !this.caseAPI.getMyCases) {
            throw new Error('API服务不可用');
        }
        params.viewMode = 'submitted';
        return this.caseAPI.getMyCases(params);
    }
    
    async getStatistics(params = {}) {
        if (!this.caseAPI || !this.caseAPI.getStatistics) {
            throw new Error('API服务不可用');
        }
        return this.caseAPI.getStatistics(params);
    }
    
    getAvailableCaseTypes() {
        // 国资企业专窗只能创建国资相关案件
        return ['国资件', '企业件'];
    }
    
    hasCreatePermission() {
        return true;
    }
}

/**
 * 角色策略工厂类
 */
class RoleStrategyFactory {
    /**
     * 获取角色策略实例
     * @param {string} role - 角色名称
     * @param {object} api - API服务对象
     * @returns {RoleStrategy} 角色策略实例
     */
    static getStrategy(role, api = null) {
        let strategy;
        
        switch (role) {
            case '管理员':
                strategy = new AdminStrategy();
                break;
            case '收件人':
                strategy = new ReceiverStrategy();
                break;
            case '开发商':
                strategy = new DeveloperStrategy();
                break;
            case '国资企业专窗':
                strategy = new StateOwnedEnterpriseStrategy();
                break;
            default:
                throw new Error(`未知角色: ${role}`);
        }
        
        if (api) {
            strategy.setAPI(api);
        }
        
        return strategy;
    }
}

/**
 * 角色管理器单例类
 * 管理当前用户的角色策略
 */
class RoleManager {
    constructor() {
        this.currentStrategy = null;
        this.currentRole = null;
        this.caseAPI = null;
    }
    
    /**
     * 设置API服务
     * @param {object} api - API服务对象
     */
    setAPI(api) {
        this.caseAPI = api;
        // 如果已有策略，也为策略设置API
        if (this.currentStrategy) {
            this.currentStrategy.setAPI(api);
        }
    }
    
    /**
     * 初始化角色管理器
     * @param {string} role - 角色名称
     * @param {object} api - API服务对象
     */
    init(role, api) {
        this.currentRole = role;
        this.caseAPI = api;
        this.currentStrategy = RoleStrategyFactory.getStrategy(role, api);
    }
    
    /**
     * 获取当前角色策略
     * @returns {RoleStrategy} 当前角色策略实例
     */
    getStrategy() {
        if (!this.currentStrategy) {
            // 尝试从localStorage获取角色信息并初始化
            try {
                const userInfoStr = localStorage.getItem('userInfo');
                if (userInfoStr) {
                    const userInfo = JSON.parse(userInfoStr);
                    if (userInfo.role) {
                        this.currentRole = userInfo.role;
                        this.currentStrategy = RoleStrategyFactory.getStrategy(userInfo.role, this.caseAPI);
                        console.log('角色策略已自动初始化，角色:', userInfo.role);
                    }
                }
            } catch (e) {
                console.error('自动初始化角色策略失败:', e);
            }
            
            // 如果仍然没有策略，返回一个默认策略
            if (!this.currentStrategy) {
                console.warn('使用默认角色策略');
                this.currentStrategy = new RoleStrategy();
                // 为默认策略设置API
                if (this.caseAPI) {
                    this.currentStrategy.setAPI(this.caseAPI);
                }
            }
        }
        return this.currentStrategy;
    }
    
    /**
     * 获取当前角色
     * @returns {string} 当前角色名称
     */
    getCurrentRole() {
        return this.currentRole;
    }
    
    /**
     * 检查是否是管理员
     * @returns {boolean} 是否是管理员
     */
    isAdmin() {
        return this.currentStrategy && this.currentStrategy.isAdmin();
    }
    
    /**
     * 检查是否是开发商
     * @returns {boolean} 是否是开发商
     */
    isDeveloper() {
        return this.currentStrategy && this.currentStrategy.isDeveloper();
    }
}

// 导出单例实例
export const roleManager = new RoleManager();

// 导出工厂类和策略类
export { RoleStrategyFactory, RoleStrategy };
