<template>
  <div class="main-app">
    <el-container class="layout-container">
      <!-- 顶部导航栏 -->
      <el-header class="top-header">
        <div class="header-left">
          <h1 class="system-title">不动产登记收件统计系统</h1>
        </div>
        <div class="header-right">
          <el-dropdown>
            <span class="user-info">
              <el-avatar :size="32" :src="''">{{ $store.state.user?.real_name?.charAt(0) || '用' }}</el-avatar>
              <span class="user-name">{{ $store.state.user?.real_name || '未登录' }}</span>
              <el-icon class="dropdown-icon"><arrow-down /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item divided>
                  <el-icon><User /></el-icon>
                  <span>个人中心</span>
                </el-dropdown-item>
                <el-dropdown-item divided>
                  <el-icon><SwitchButton /></el-icon>
                  <span @click="handleLogout">退出登录</span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-container>
        <!-- 左侧菜单栏 -->
        <el-aside width="250px" class="sidebar">
          <el-menu
            :default-active="activeMenu"
            class="sidebar-menu"
            router
            @select="handleMenuSelect"
          >
            <!-- 工作台 - 所有用户都可以访问 -->
            <el-menu-item index="/dashboard">
              <el-icon><TrendCharts /></el-icon>
              <span>工作台</span>
            </el-menu-item>
            
            <!-- 开发商业务 -->
            <el-menu-item index="/developer-case" v-if="hasModuleAccess('开发商业务')">
              <el-icon><Document /></el-icon>
              <span>开发商业务</span>
            </el-menu-item>
            
            <!-- 国资企业业务 -->
            <el-menu-item index="/developer-case" v-if="hasModuleAccess('国资企业业务')">
              <el-icon><Document /></el-icon>
              <span>国资企业业务</span>
            </el-menu-item>
            
            <!-- 我的收件 - 只对非系统管理员显示 -->
            <el-menu-item index="/cases" v-if="hasModuleAccess('我的收件')">
              <el-icon><Document /></el-icon>
              <span>我的收件</span>
            </el-menu-item>
            
            <!-- 全部收件功能 - 与管理功能并列 -->
            <el-menu-item index="/all-cases" v-if="hasModuleAccess('全部收件管理')">
              <el-icon><Document /></el-icon>
              <span>全部收件管理</span>
            </el-menu-item>
            
            <!-- 统计报表 -->
            <el-menu-item index="/statistics" v-if="hasModuleAccess('统计报表')">
              <el-icon><TrendCharts /></el-icon>
              <span>统计报表</span>
            </el-menu-item>
            
            <!-- 我的消息 -->
            <el-menu-item index="/messages" v-if="hasModuleAccess('我的消息')">
              <el-icon><Message /></el-icon>
              <span>我的消息</span>
            </el-menu-item>
            
            <!-- 管理员菜单 -->
            <el-sub-menu index="admin" v-if="hasModuleAccess('用户管理')">
              <template #title>
                <el-icon><Setting /></el-icon>
                <span>管理功能</span>
              </template>
              <el-menu-item index="/users">用户管理</el-menu-item>
              <el-menu-item index="/developer-management">开发商管理</el-menu-item>
              <el-menu-item index="/system/logs">系统日志</el-menu-item>
              <el-menu-item index="/system/monitoring">系统监控</el-menu-item>
            </el-sub-menu>
          </el-menu>
        </el-aside>

        <!-- 主内容区 -->
        <el-main class="main-content">
          <div class="page-container">
            <router-view />
          </div>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useStore } from 'vuex'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Document,
  Setting,
  SwitchButton,
  TrendCharts,
  User,
  ArrowDown,
  Message
} from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const store = useStore()

const currentUser = ref({
  id: '',
  username: '',
  real_name: '',
  role: '',
  expertise_level: 1
})

const activeMenu = ref('/dashboard')

// 检查用户是否有权限访问特定模块
const hasModuleAccess = (moduleName) => {
  const user = store.state.user
  if (!user) return false
  
  // 管理员可以访问所有模块
  if (['管理员', 'admin', 'administrator', '系统管理员'].includes(user.role)) {
    return true
  }
  
  // 根据用户角色返回对应的模块访问权限
    const roleModuleAccess = {
      '收件人': {
        '全部收件管理': false,
        '用户管理': false,
        '统计报表': true,
        '我的收件': true,
        '开发商业务': false,
        '国资企业业务': false,
        '我的消息': true
      },
      '开发商': {
        '全部收件管理': false,
        '用户管理': false,
        '统计报表': false,
        '我的收件': false,
        '开发商业务': true,
        '国资企业业务': false,
        '我的消息': true
      },
      '国资企业专窗': {
        '全部收件管理': false,
        '用户管理': false,
        '统计报表': true,
        '我的收件': true,
        '开发商业务': false,
        '国资企业业务': true,
        '我的消息': true
      }
    }
  
  return roleModuleAccess[user.role]?.[moduleName] === true
}

// 生命周期
onMounted(() => {
  checkAuthStatus()
  // 根据用户角色设置默认活动菜单
  if (hasModuleAccess('统计报表')) {
    activeMenu.value = '/dashboard'
    // 如果当前路由是首页，重定向到工作台
    if (route.path === '/') {
      router.push('/dashboard')
    }
  } else if (hasModuleAccess('开发商业务')) {
    activeMenu.value = '/developer-case'
  } else if (hasModuleAccess('我的收件')) {
    activeMenu.value = '/cases'
  } else if (hasModuleAccess('全部收件管理')) {
    activeMenu.value = '/all-cases'
  } else if (hasModuleAccess('用户管理')) {
    activeMenu.value = '/users'
  } else {
    activeMenu.value = route.path
  }
})

// 方法
const checkAuthStatus = () => {
  const userInfo = localStorage.getItem('userInfo')
  if (userInfo && userInfo !== 'undefined' && userInfo.trim() !== '') {
    try {
        currentUser.value = JSON.parse(userInfo)
        // 用户信息已经在store初始化时通过restoreUser action处理
        // 这里只需要更新组件本地状态即可
      } catch (error) {
        console.error('解析用户信息失败:', error)
        // 清除无效的用户信息
        store.dispatch('logout')
      }
  } else {
    // 如果没有用户信息，重定向到登录页
    store.dispatch('logout')
  }
}

const handleMenuSelect = (index) => {
  activeMenu.value = index
  // 使用router.push进行跳转，确保路由变化
  router.push(index)
}

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    // 使用Vuex的logout action处理退出登录
    await store.dispatch('logout')
    ElMessage.success('已退出登录')
    router.push('/login')
  } catch (error) {
    // 用户取消退出或发生错误
  }
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 顶部导航栏样式 */
.top-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #409eff;
  color: white;
  padding: 0 20px;
  height: 60px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.system-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.user-info:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.user-name {
  margin-left: 8px;
  margin-right: 4px;
}

.dropdown-icon {
  font-size: 12px;
  transition: transform 0.3s;
}

.el-dropdown-menu__item span {
  cursor: pointer;
}

/* 左侧菜单栏样式 */
.sidebar {
  background-color: #001529;
  color: white;
  height: calc(100vh - 60px);
  overflow-y: auto;
}

.sidebar-menu {
  border: none;
  background-color: transparent;
  height: 100%;
}

.sidebar-menu .el-menu-item,
.sidebar-menu .el-sub-menu__title {
  color: #bfbfbf;
  height: 50px;
  line-height: 50px;
}

.sidebar-menu .el-menu-item:hover,
.sidebar-menu .el-sub-menu__title:hover {
  background-color: #1890ff;
  color: white;
}

.sidebar-menu .el-menu-item.is-active {
  background-color: #1890ff;
  color: white;
}

/* 主内容区样式 */
.main-content {
  padding: 0;
  background-color: #f0f2f5;
  height: calc(100vh - 60px);
  overflow-y: auto;
}

.page-container {
  padding: 20px;
  background-color: white;
  min-height: calc(100% - 40px);
  margin: 20px;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .system-title {
    font-size: 16px;
  }
  
  .sidebar {
    width: 200px;
  }
  
  .page-container {
    margin: 10px;
    padding: 15px;
  }
}
</style>