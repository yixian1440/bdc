import { createRouter, createWebHistory } from 'vue-router'
import { useStore } from 'vuex'
import Login from './components/Login.vue'
import Layout from './components/Layout.vue'
import Dashboard from './views/Dashboard.vue'
import AdminDashboard from './views/AdminDashboard.vue'
import UserDashboard from './views/UserDashboard.vue'
import Cases from './views/Cases.vue'
import Users from './views/Users.vue'
import AllCases from './views/AllCases.vue'
import DeveloperCase from './views/DeveloperCase.vue'

// 路由配置
const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/login', component: Login },
  {
    path: '/',
    component: Layout,
    meta: { requireAuth: true },
    children: [
      // 主页面路由
      { path: 'dashboard', component: Dashboard, name: 'dashboard' },
      
      // 角色特定工作台
      { 
        path: 'admin-dashboard', 
        component: AdminDashboard, 
        name: 'admin-dashboard',
        meta: { role: '管理员' } 
      },
      { 
        path: 'user-dashboard', 
        component: UserDashboard, 
        name: 'user-dashboard' 
      },
      
      // 收件管理
      { path: 'cases', component: Cases, name: 'my-cases' },
      { path: 'cases/add', component: Cases, name: 'add-case', props: { isAddMode: true } },
      { 
        path: 'all-cases', 
        component: AllCases, 
        name: 'all-cases',
        meta: { role: '管理员' } 
      },
      { 
        path: 'developer-case', 
        component: DeveloperCase, 
        name: 'developer-case',
        meta: { role: '开发商' } 
      },
      
      // 用户管理
      {
        path: 'users', 
        component: Users, 
        name: 'users',
        meta: { role: '管理员' } 
      },
      // 开发商管理
      {
        path: 'developer-management', 
        component: () => import('./views/system/DeveloperManagement.vue'), 
        name: 'developer-management',
        meta: { role: '管理员' } 
      },
      // 统计分析
      { 
        path: 'statistics', 
        component: () => import('./views/Statistics.vue'), 
        name: 'statistics'
      },
      // 我的消息
      { 
        path: 'messages', 
        component: () => import('./views/Messages.vue'), 
        name: 'my-messages'
      }
    ]
  }
]

// 创建路由实例
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// 统一路由守卫
router.beforeEach((to, from, next) => {
  // 检查是否需要登录
  if (to.meta.requireAuth) {
    // 检查是否已登录 - 使用正确的authToken键名
    const authToken = localStorage.getItem('authToken')
    const userRole = localStorage.getItem('userRole')
    
    if (authToken) {
      // 检查角色权限
      if (to.meta.role) {
        // 支持多种角色名称格式
        // 管理员角色可以访问所有路由
        const isAllowed = 
          (userRole === '管理员' || userRole === 'admin') || // 管理员可以访问所有路由
          userRole === to.meta.role || 
          (userRole === 'admin' && to.meta.role === '管理员') ||
          (userRole === '管理员' && to.meta.role === 'admin') ||
          (userRole === '开发商' && to.meta.role === 'developer') ||
          (userRole === 'developer' && to.meta.role === '开发商') ||
          (userRole === '收件人' && to.meta.role === 'recipient') ||
          (userRole === 'recipient' && to.meta.role === '收件人') ||
          (userRole === '国资企业专窗' && to.meta.role === '国资企业专窗') // 添加国资企业专窗角色支持
          
        if (!isAllowed) {
          // 权限不足，根据角色重定向到对应工作台
          if (userRole === '管理员' || userRole === 'admin') {
            next('/admin-dashboard')
          } else if (userRole === '开发商' || userRole === 'developer') {
            next('/developer-case')
          } else {
            next('/user-dashboard')
          }
          return
        }
      }
      
      // 已登录且有权限，继续访问
      next()
    } else {
      // 未登录，重定向到登录页
      next('/login')
    }
  } else {
    // 不需要登录，继续访问
    next()
  }
})

export default router