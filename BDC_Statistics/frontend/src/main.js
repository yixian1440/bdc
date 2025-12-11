import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
// 导入Element Plus中文语言包
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
// 导入Element Plus消息组件
import { ElMessage } from 'element-plus'
import App from './App.vue'
import router from './router.js'
import store from './store/index.js'
import './assets/style.css'
import { caseAPI } from './services/api'
import { roleManager } from './services/RoleStrategy'
import { getUserInfo } from './utils/common'
// 导入WebSocket服务
import webSocketService from './services/webSocketService.js'

const app = createApp(App)

// 添加全局错误处理
app.config.errorHandler = (err, instance, info) => {
  // 捕获并处理DOM操作相关的错误
  if (err.message && err.message.includes('insertBefore')) {
    console.error('DOM操作错误 - 可能是组件卸载后仍尝试更新DOM:', err)
    console.error('错误信息:', info)
    return
  }
  
  // 其他类型的错误
  console.error('全局错误:', err)
  console.error('错误信息:', info)
}

// 配置Element Plus使用中文语言
app.use(ElementPlus, { 
  locale: zhCn 
})
app.use(router)
app.use(store)

// 在应用挂载前恢复用户状态
store.dispatch('restoreUser').finally(() => {
  // 初始化角色管理器
  const userInfo = getUserInfo()
  if (userInfo.role) {
    roleManager.init(userInfo.role, caseAPI)
    console.log('角色管理器初始化成功，当前角色:', userInfo.role)
  }
  
  // 挂载应用
  app.mount('#app')
  
  // 全局监听轮询提醒
  webSocketService.on('pollingReminder', (reminderData) => {
    console.log('收到轮询提醒:', reminderData)
    
    // 显示轮询提醒消息
    ElMessage({
      type: 'info',
      message: reminderData.message || `请 ${reminderData.nextReceiver?.real_name} 准备接收下一个案件`,
      duration: 5000,
      showClose: true
    })
  })
})