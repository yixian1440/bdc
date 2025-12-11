import { createStore } from 'vuex'
import { authAPI, caseAPI } from '../services/api'
import { roleManager } from '../services/RoleStrategy'

const store = createStore({
  state: {
    // 用户状态
    user: null,
    token: null,
    isAuthenticated: false,
    // 加载状态
    loading: false,
    // 错误信息
    error: null,
    // 角色权限映射
    permissions: {
      '管理员': ['Users', 'AllCases', 'Dashboard'],
      '收件人': ['Cases', 'Dashboard'],
      '开发商': ['DeveloperCase', 'Dashboard'],
      '国资企业专窗': ['Cases', 'Dashboard']
    }
  },
  
  mutations: {
    // 设置用户信息和token
    SET_USER(state, { user, token }) {
      state.user = user
      state.token = token
      state.isAuthenticated = !!token
      state.error = null
      
      // 保存到localStorage
      if (token) {
        localStorage.setItem('authToken', token)
        localStorage.setItem('userInfo', JSON.stringify(user))
        // 保存用户角色，供路由守卫使用
        if (user.role) {
          localStorage.setItem('userRole', user.role)
        }
        // 初始化角色管理器
        if (user.role) {
          roleManager.init(user.role, caseAPI)
        }
      }
    },
    
    // 清除用户信息（登出）
    CLEAR_USER(state) {
      state.user = null
      state.token = null
      state.isAuthenticated = false
      
      // 清除localStorage
      localStorage.removeItem('authToken')
      localStorage.removeItem('userInfo')
      localStorage.removeItem('userRole')
      
      // 重置角色管理器
      roleManager.currentStrategy = null
      roleManager.currentRole = null
    },
    
    // 设置加载状态
    SET_LOADING(state, loading) {
      state.loading = loading
    },
    
    // 设置错误信息
    SET_ERROR(state, error) {
      state.error = error
      state.loading = false
    },
    
    // 清除错误信息
    CLEAR_ERROR(state) {
      state.error = null
    }
  },
  
  actions: {
    // 登录操作
    async login({ commit }, credentials) {
      commit('SET_LOADING', true)
      commit('CLEAR_ERROR')
      
      try {
        // 由于api.js中的响应拦截器已经处理了response.data
        // 所以authAPI.login直接返回了data对象
        const response = await authAPI.login(credentials)
        const { user, token } = response
        
        commit('SET_USER', { user, token })
        return response
      } catch (error) {
        const errorMessage = error.response?.data?.message || '登录失败，请重试'
        commit('SET_ERROR', errorMessage)
        throw new Error(errorMessage)
      } finally {
        commit('SET_LOADING', false)
      }
    },
    
    // 登出操作
    logout({ commit }) {
      commit('CLEAR_USER')
    },
    
    // 从localStorage恢复用户状态
    async restoreUser({ commit }) {
      const token = localStorage.getItem('authToken')
      const userInfoStr = localStorage.getItem('userInfo')
      
      if (token && userInfoStr) {
        try {
          const user = JSON.parse(userInfoStr)
          
          // 验证token是否有效
          const response = await authAPI.getCurrentUser()
          // 由于api.js中的响应拦截器已经处理了response.data
          // 所以authAPI.getCurrentUser直接返回了data对象
          if (response && response.user) {
            commit('SET_USER', { user: response.user, token })
          } else {
            commit('CLEAR_USER')
          }
        } catch (error) {
          // Token无效或其他错误，清除用户信息
          console.error('恢复用户状态失败:', error)
          commit('CLEAR_USER')
        }
      }
    }
  },
  
  getters: {
    // 获取当前用户
    currentUser: (state) => state.user,
    
    // 获取用户角色
    userRole: (state) => state.user?.role || null,
    
    // 检查是否已认证
    isAuthenticated: (state) => state.isAuthenticated,
    
    // 检查加载状态
    isLoading: (state) => state.loading,
    
    // 获取错误信息
    errorMessage: (state) => state.error,
    
    // 检查用户是否有权限访问指定页面
    hasPermission: (state) => (routeName) => {
      if (!state.user || !state.user.role) return false
      
      const userPermissions = state.permissions[state.user.role] || []
      return userPermissions.includes(routeName)
    },
    
    // 获取用户可访问的所有路由
    accessibleRoutes: (state) => {
      if (!state.user || !state.user.role) return []
      
      return state.permissions[state.user.role] || []
    }
  }
})

export default store