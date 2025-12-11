/**
 * 数据服务层
 * 统一处理所有API调用，实现数据访问的高内聚低耦合
 */
import { caseAPI, authAPI, userAPI } from './api';
import { ElMessage } from 'element-plus';

/**
 * 基础数据服务类
 */
class BaseDataService {
  constructor(api) {
    this.api = api;
  }
  
  /**
   * 处理API响应
   * @param {Promise} promise - API请求Promise
   * @param {Object} options - 配置选项
   * @returns {Promise} 处理后的响应数据
   */
  async handleResponse(promise, options = {}) {
    try {
      const response = await promise;
      
      // 处理不同的响应格式
      if (response && response.success === false) {
        throw new Error(response.message || '请求失败');
      }
      
      // 返回响应数据
      return options.raw ? response : response.data || response;
    } catch (error) {
      console.error('API请求错误:', error);
      
      // 显示错误消息
      if (options.showError !== false) {
        ElMessage.error(error.response?.data?.message || error.message || '请求失败，请稍后重试');
      }
      
      // 重新抛出错误，便于上层处理
      throw error;
    }
  }
  
  /**
   * 获取API实例
   * @returns {Object} API实例
   */
  getAPI() {
    return this.api;
  }
}

/**
 * 案件数据服务
 */
export class CaseDataService extends BaseDataService {
  constructor() {
    super(caseAPI);
  }
  
  /**
   * 获取用户案件列表
   * @param {Object} params - 查询参数
   * @param {Object} options - 配置选项
   * @returns {Promise} 案件列表和分页信息
   */
  async getMyCases(params = {}, options = {}) {
    return this.handleResponse(this.api.getMyCases(params), options);
  }
  
  /**
   * 获取所有案件（管理员）
   * @param {Object} params - 查询参数
   * @param {Object} options - 配置选项
   * @returns {Promise} 案件列表和分页信息
   */
  async getAllCases(params = {}, options = {}) {
    return this.handleResponse(this.api.getAllCases(params), options);
  }
  
  /**
   * 获取案件详情
   * @param {number} caseId - 案件ID
   * @param {Object} options - 配置选项
   * @returns {Promise} 案件详情
   */
  async getCaseDetail(caseId, options = {}) {
    return this.handleResponse(this.api.getCaseDetail(caseId), options);
  }
  
  /**
   * 创建新案件
   * @param {Object} caseData - 案件数据
   * @param {Object} options - 配置选项
   * @returns {Promise} 创建的案件信息
   */
  async addCase(caseData, options = {}) {
    return this.handleResponse(this.api.addCase(caseData), options);
  }
  
  /**
   * 获取统计数据
   * @param {Object} params - 查询参数
   * @param {Object} options - 配置选项
   * @returns {Promise} 统计数据
   */
  async getStatistics(params = {}, options = {}) {
    return this.handleResponse(this.api.getStatistics(params), options);
  }
}

/**
 * 认证数据服务
 */
export class AuthDataService extends BaseDataService {
  constructor() {
    super(authAPI);
  }
  
  /**
   * 用户登录
   * @param {Object} credentials - 登录凭证
   * @param {Object} options - 配置选项
   * @returns {Promise} 登录结果
   */
  async login(credentials, options = {}) {
    return this.handleResponse(this.api.login(credentials), options);
  }
  
  /**
   * 获取当前用户信息
   * @param {Object} options - 配置选项
   * @returns {Promise} 用户信息
   */
  async getCurrentUser(options = {}) {
    return this.handleResponse(this.api.getCurrentUser(), options);
  }
}

/**
 * 用户数据服务
 */
export class UserDataService extends BaseDataService {
  constructor() {
    super(userAPI);
  }
  
  /**
   * 获取用户列表
   * @param {Object} params - 查询参数
   * @param {Object} options - 配置选项
   * @returns {Promise} 用户列表
   */
  async getUsers(params = {}, options = {}) {
    return this.handleResponse(this.api.getUsers(params), options);
  }
}

/**
 * 数据服务工厂
 * 用于获取不同类型的数据服务实例
 */
export const dataServiceFactory = {
  /**
   * 获取案件数据服务
   * @returns {CaseDataService} 案件数据服务实例
   */
  getCaseService() {
    return new CaseDataService();
  },
  
  /**
   * 获取认证数据服务
   * @returns {AuthDataService} 认证数据服务实例
   */
  getAuthService() {
    return new AuthDataService();
  },
  
  /**
   * 获取用户数据服务
   * @returns {UserDataService} 用户数据服务实例
   */
  getUserService() {
    return new UserDataService();
  }
};

// 导出默认实例
export const caseDataService = new CaseDataService();
export const authDataService = new AuthDataService();
export const userDataService = new UserDataService();

export default {
  case: caseDataService,
  auth: authDataService,
  user: userDataService
};
