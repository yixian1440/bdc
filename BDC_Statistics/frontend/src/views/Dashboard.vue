<template>
  <div class="dashboard-container">
    <div v-if="!isLoggedIn" class="login-required">
      <div class="login-required-content">
        <el-icon class="login-icon"><User /></el-icon>
        <h3>需要登录</h3>
        <p>请先登录系统以查看工作台数据</p>
        <el-button type="primary" @click="goToLogin">立即登录</el-button>
      </div>
    </div>
    
    <div v-else class="loading-content" v-loading.fullscreen="true" element-loading-text="正在跳转到工作台..."></div>
  </div>
</template>

<script>
import { useRouter } from 'vue-router'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useStore } from 'vuex'
import { User } from '@element-plus/icons-vue'
import { roleManager } from '../services/RoleStrategy'
import { getUserInfo } from '../utils/common'

export default {
  name: 'Dashboard',
  components: {
    User
  },
  setup() {
    const router = useRouter()
    const store = useStore()
    const isMounted = ref(true)

    // 计算属性 - 从store中获取认证状态
    const isLoggedIn = computed(() => store.getters.isAuthenticated)
    
    // 使用角色管理器获取重定向路径
    const getRedirectPath = () => {
      // 从localStorage获取用户信息，确保角色信息可靠
      const userInfo = getUserInfo()
      const userRole = userInfo.role || ''
      
      // 根据角色返回不同的重定向路径
    switch (userRole) {
      case '管理员':
        return '/admin-dashboard'
      case '开发商':
        return '/developer-case'
      case '国资企业专窗':
        return '/cases'
      case '收件人':
        return '/cases'
      default:
        return '/cases'
    }
    }

    // 方法
    const goToLogin = () => {
      router.push('/login')
    }

    // 增强的重定向函数
    const redirectToRoleDashboard = () => {
      // 确保组件仍挂载
      if (!isMounted.value) return
      
      // 双重检查：同时使用store和localStorage确保角色信息可靠
      if (isLoggedIn.value || localStorage.getItem('authToken')) {
        // 获取重定向路径
        const redirectPath = getRedirectPath()
        
        console.log('重定向路径:', redirectPath)
        
        // 执行重定向
        setTimeout(() => {
          if (isMounted.value) {
            router.replace(redirectPath)
          }
        }, 300) // 短暂延迟确保页面过渡平滑
      }
    }

    // 生命周期
    onMounted(() => {
      // 确保store状态已恢复后再进行重定向
      if (store.state.user === null && localStorage.getItem('authToken')) {
        // 如果store中没有用户信息但localStorage有token，尝试恢复用户状态
        store.dispatch('restoreUser').finally(() => {
          if (isMounted.value) {
            redirectToRoleDashboard()
          }
        })
      } else {
        // 立即进行重定向
        redirectToRoleDashboard()
      }
    })
    
    // 组件卸载时清理
    onUnmounted(() => {
      isMounted.value = false
    })

    return {
      isLoggedIn,
      goToLogin,
      User
    }
  }
}
</script>

<style scoped>
.dashboard-container {
  padding: 24px;
  min-height: 100vh;
  background: linear-gradient(135deg, #f0f9ff 0%, #e6f7ff 100%);
}

.login-required {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 600px;
}

.login-required-content {
  text-align: center;
  padding: 48px;
  border-radius: 16px;
  background: white;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  border: 1px solid #e6f7ff;
  max-width: 480px;
  width: 100%;
}

.login-icon {
  font-size: 64px;
  color: #91d5ff;
  margin-bottom: 24px;
  background: linear-gradient(135deg, #f0f9ff 0%, #e6f7ff 100%);
  width: 120px;
  height: 120px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0 auto 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.login-required-content h3 {
  margin: 0 0 16px 0;
  color: #597ef7;
  font-size: 24px;
  font-weight: 600;
}

.login-required-content p {
  margin: 0 0 24px 0;
  color: #91d5ff;
  font-size: 16px;
}

.loading-content {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 600px;
  background: linear-gradient(135deg, #f0f9ff 0%, #e6f7ff 100%);
}
</style>
