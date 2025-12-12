/**
 * 公共工具函数集合
 * 包含常用的工具函数，如日期格式化、数据验证、错误处理等
 */

/**
 * 格式化日期为中文格式，如：2024年12月4日
 * @param {string|Date} date - 需要格式化的日期
 * @returns {string} 格式化后的日期字符串
 */
export const formatDate = (date) => {
  if (!date) return '-';
  
  // 检查是否已经是YYYY-MM-DD格式的字符串
  const dateRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
  const match = dateRegex.test(date) ? date.match(dateRegex) : null;
  
  if (match) {
    // 已经是正确格式，直接提取年、月、日，避免时区转换问题
    const year = parseInt(match[1]);
    const month = parseInt(match[2]);
    const day = parseInt(match[3]);
    
    return `${year}年${month}月${day}日`;
  } else {
    // 对于其他格式，使用Date对象解析
    const d = new Date(date);
    
    // 确保日期有效
    if (isNaN(d.getTime())) {
      return '-';
    }
    
    // 使用本地日期格式化，并指定时区，避免时区转换问题
    return d.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      timeZone: 'Asia/Shanghai'
    });
  }
};

/**
 * 格式化日期时间为中文格式，如：2024-12-04 14:30:00
 * @param {string|Date} date - 需要格式化的日期时间
 * @returns {string} 格式化后的日期时间字符串
 */
export const formatDateTime = (date) => {
  if (!date) return '-';
  
  const d = new Date(date);
  
  // 确保日期有效
  if (isNaN(d.getTime())) {
    return '-';
  }
  
  // 使用本地日期时间格式化，并指定时区，避免时区转换问题
  return d.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai'
  });
};

/**
 * 安全解析JSON字符串
 * @param {string} jsonStr - JSON字符串
 * @param {*} defaultValue - 默认值
 * @returns {*} 解析后的JSON对象或默认值
 */
export const safeParseJSON = (jsonStr, defaultValue = {}) => {
  try {
    return JSON.parse(jsonStr) || defaultValue;
  } catch (e) {
    console.error('解析JSON失败:', e);
    return defaultValue;
  }
};

/**
 * 防抖函数
 * @param {Function} func - 需要防抖的函数
 * @param {number} wait - 等待时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
export const debounce = (func, wait) => {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * 节流函数
 * @param {Function} func - 需要节流的函数
 * @param {number} limit - 时间限制（毫秒）
 * @returns {Function} 节流后的函数
 */
export const throttle = (func, limit) => {
  let inThrottle;
  
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * 获取用户信息
 * @returns {object} 用户信息对象
 */
export const getUserInfo = () => {
  try {
    const userInfoStr = localStorage.getItem('userInfo');
    return userInfoStr ? JSON.parse(userInfoStr) : {};
  } catch (e) {
    console.error('获取用户信息失败:', e);
    return {};
  }
};

/**
 * 确保用户信息完整
 * @returns {object} 用户信息对象
 */
export const ensureUserInfo = () => {
  const userInfo = getUserInfo();
  
  if (!userInfo.id || !userInfo.role) {
    console.error('用户信息不完整，重新登录');
    localStorage.removeItem('authToken');
    localStorage.removeItem('userInfo');
    window.location.href = '/login';
  }
  
  return userInfo;
};

/**
 * 获取认证令牌
 * @returns {string|null} 认证令牌
 */
export const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

/**
 * 清除认证信息
 */
export const clearAuthInfo = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('userInfo');
  localStorage.removeItem('userRole');
};

/**
 * 检查是否为管理员
 * @returns {boolean} 是否为管理员
 */
export const isAdmin = () => {
  const userInfo = getUserInfo();
  return userInfo.role === '管理员';
};

/**
 * 检查是否为开发商
 * @returns {boolean} 是否为开发商
 */
export const isDeveloper = () => {
  const userInfo = getUserInfo();
  return userInfo.role === '开发商';
};

/**
 * 格式化案件类型，确保能正确显示
 * @param {string} caseType - 案件类型
 * @returns {string} 格式化后的案件类型
 */
export const formatCaseType = (caseType) => {
  if (!caseType) return '-';
  
  // 案件类型映射
  const typeMapping = {
    '一般件': '一般件',
    '自建房': '自建房',
    '分割转让': '分割转让',
    '其他': '其他',
    '开发商转移': '开发商转移',
    '开发商首次': '开发商首次',
    '国资件': '国资件',
    '企业件': '企业件'
  };
  
  // 将案件类型转换为字符串并清理
  let caseTypeStr = String(caseType);
  
  // 替换英文状态的"???”为友好的默认值
  if (caseTypeStr === '???') {
    return '未知类型';
  }
  
  // 替换可能导致显示问题的特殊字符
  const sanitizedType = caseTypeStr.replace(/[\x00-\x1F\x7F]/g, '');
  
  // 检查是否有映射，没有则返回处理后的类型或默认值
  return typeMapping[sanitizedType] || sanitizedType || '未知类型';
};

/**
 * 验证案件数据
 * @param {object} caseData - 案件数据对象
 * @returns {Array} 错误信息数组
 */
export const validateCaseData = (caseData) => {
  const errors = [];
  
  if (!caseData) {
    errors.push('案件数据不能为空');
    return errors;
  }
  
  if (!caseData.applicant) {
    errors.push('请输入申请人');
  }
  
  if (!caseData.caseType) {
    errors.push('请选择案件类型');
  }
  
  if (!caseData.case_date) {
    errors.push('请选择案件日期');
  }
  
  return errors;
};

/**
 * 生成唯一ID
 * @returns {string} 唯一ID字符串
 */
export const generateUniqueId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

/**
 * 确保数组类型
 * @param {*} data - 需要确保为数组的数据
 * @returns {Array} 确保为数组的数据
 */
export const ensureArray = (data) => {
  return Array.isArray(data) ? data : [];
};

/**
 * 确保对象类型
 * @param {*} data - 需要确保为对象的数据
 * @returns {Object} 确保为对象的数据
 */
export const ensureObject = (data) => {
  return typeof data === 'object' && data !== null ? data : {};
};

/**
 * 处理API响应数据
 * @param {*} response - API响应数据
 * @returns {Object} 处理后的响应数据
 */
export const handleApiResponse = (response) => {
  const result = {
    cases: [],
    total: 0,
    pagination: {
      total: 0,
      page: 1,
      pageSize: 10,
      totalPages: 0
    }
  };
  
  if (!response) {
    return result;
  }
  
  if (Array.isArray(response.cases)) {
    // 情况1: 响应包含cases数组和total字段
    result.cases = response.cases;
    result.total = response.total || response.pagination?.total || response.cases.length;
    result.pagination = response.pagination || {
      total: result.total,
      page: 1,
      pageSize: 10,
      totalPages: Math.ceil(result.total / 10)
    };
  } else if (Array.isArray(response)) {
    // 情况2: 响应直接是一个数组
    result.cases = response;
    result.total = response.length;
    result.pagination.total = response.length;
    result.pagination.totalPages = Math.ceil(response.length / 10);
  } else if (typeof response === 'object') {
    // 情况3: 响应是一个对象，可能包含其他字段
    result.cases = ensureArray(response.items || response.cases);
    result.total = response.total || response.pagination?.total || result.cases.length;
    result.pagination = response.pagination || {
      total: result.total,
      page: 1,
      pageSize: 10,
      totalPages: Math.ceil(result.total / 10)
    };
  }
  
  return result;
};
