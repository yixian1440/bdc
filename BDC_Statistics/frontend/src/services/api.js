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
  }),
  // 添加用户
  addUser: wrapApiMethod(async (userData) => {
    return await api.post('/users', userData);
  }),
  // 更新用户
  updateUser: wrapApiMethod(async (userId, userData) => {
    return await api.put(`/users/${userId}`, userData);
  }),
  // 删除用户
  deleteUser: wrapApiMethod(async (userId) => {
    return await api.delete(`/users/${userId}`);
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
  }),
  
  // 获取在线用户列表
  getOnlineUsers: wrapApiMethod(async () => {
    return await api.get('/users/online');
  }),
  
  // 获取所有用户列表
  getAllUsers: wrapApiMethod(async () => {
    return await api.get('/users/all');
  }),
  
  // 发送消息
  sendMessage: wrapApiMethod(async (messageData) => {
    return await api.post('/messages/send', messageData);
  })
};

// 开发商管理相关API
export const developerAPI = {
  // 获取开发商列表
  getDevelopers: wrapApiMethod(async (params) => {
    return await api.get('/developers', { params });
  }),
  
  // 同步开发商信息
  syncDevelopers: wrapApiMethod(async () => {
    return await api.post('/developers/sync');
  })
};

// 日志管理相关API
export const logAPI = {
  // 获取日志列表
  getLogs: wrapApiMethod(async (params) => {
    return await api.get('/admin/logs', { params });
  }),
  // 获取日志统计数据
  getLogStats: wrapApiMethod(async (params) => {
    return await api.get('/admin/logs/stats', { params });
  }),
  // 获取日志详情
  getLogById: wrapApiMethod(async (logId) => {
    return await api.get(`/admin/logs/${logId}`);
  }),
  // 清理旧日志
  cleanOldLogs: wrapApiMethod(async (params) => {
    return await api.delete('/admin/logs/clean', { params });
  })
};

// 系统监控相关API
export const monitoringAPI = {
  // 获取监控数据列表
  getMonitoringData: wrapApiMethod(async (params) => {
    return await api.get('/admin/monitoring', { params });
  }),
  // 获取监控统计数据
  getMonitoringStats: wrapApiMethod(async (params) => {
    return await api.get('/admin/monitoring/stats', { params });
  }),
  // 获取最新监控数据
  getLatestMonitoringData: wrapApiMethod(async () => {
    return await api.get('/admin/monitoring/latest');
  }),
  // 手动收集监控数据
  collectMonitoringData: wrapApiMethod(async () => {
    return await api.post('/admin/monitoring/collect');
  }),
  // 清理旧监控数据
  cleanOldMonitoringData: wrapApiMethod(async (params) => {
    return await api.delete('/admin/monitoring/clean', { params });
  })
};

export default api;