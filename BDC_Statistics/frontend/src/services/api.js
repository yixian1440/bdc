import axios from 'axios';

const baseURL = '/api';

// 创建axios实例
const api = axios.create({
  baseURL,
  timeout: 30000,
});

// 请求拦截器
api.interceptors.request.use(
  config => {
    // 从localStorage获取token
    const token = localStorage.getItem('authToken');
    
    // 如果有token，添加到请求头
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  response => {
    return response.data;
  },
  error => {
    // 处理错误响应
    if (error.response) {
      // 服务器返回错误状态码
      switch (error.response.status) {
        case 401:
          // 未授权，清除token并跳转到登录页
          localStorage.removeItem('authToken');
          localStorage.removeItem('userInfo');
          // 避免重复跳转
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
          break;
      }
    }
    
    return Promise.reject(error);
  }
);

// 简单包装API方法
const wrapApiMethod = (method) => {
  return (...args) => {
    return method(...args);
  };
};

// 导出API对象
export const caseAPI = {
  // 获取我的案件列表
  getMyCases: wrapApiMethod((params) => api.get('/my-cases', { params })),
  
  // 获取所有案件（管理员）
  getAllCases: wrapApiMethod((params) => api.get('/all-cases', { params })),
  
  // 获取案件详情
  getCaseDetail: wrapApiMethod((caseId) => api.get(`/cases/${caseId}`)),
  
  // 创建新案件
  addCase: wrapApiMethod((caseData) => api.post('/cases', caseData)),
  
  // 获取统计数据
  getStatistics: wrapApiMethod((params) => api.get('/statistics', { params }))
};

// 认证相关API
export const authAPI = {
  // 登录接口
  login: wrapApiMethod(async (data) => {
    return await api.post('/auth/login', data);
  }),
  // 获取当前用户信息
  getCurrentUser: wrapApiMethod(async () => {
    return await api.get('/auth/me');
  })
};

// 用户管理相关API
export const userAPI = {
  // 获取用户列表
  getUsers: wrapApiMethod(async (params) => {
    return await api.get('/users', { params });
  })
};

// 消息相关API
export const messageAPI = {
  // 获取消息列表
  getMessages: wrapApiMethod(async (params) => {
    return await api.get('/messages', { params });
  }),
  
  // 获取未读消息数量
  getUnreadCount: wrapApiMethod(async () => {
    return await api.get('/users/unread-count');
  }),
  
  // 标记消息为已读
  markAsRead: wrapApiMethod(async (messageId) => {
    return await api.put(`/messages/${messageId}/read`);
  }),
  
  // 标记所有消息为已读
  markAllAsRead: wrapApiMethod(async () => {
    return await api.put('/messages/read-all');
  })
};

export default api;