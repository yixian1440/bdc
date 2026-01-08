<template>
  <div class="messages-container">
    <div class="messages-header">
      <h2 class="messages-title">
        <el-icon><Message /></el-icon>
        我的消息
        <el-badge v-if="unreadCount > 0" :value="unreadCount" type="danger" class="unread-badge" />
      </h2>
      <div class="header-actions">
        <el-button 
          type="primary" 
          size="large"
          @click="toggleSendMessage"
          class="send-message-btn"
        >
          <el-icon><ChatDotRound /></el-icon>
          发送消息
        </el-button>
        <el-button 
          type="primary" 
          size="large"
          @click="markAllAsRead"
          :disabled="unreadCount === 0"
          class="mark-all-btn"
        >
          <el-icon><Reading /></el-icon>
          全部标为已读
        </el-button>
      </div>
    </div>
    
    <!-- 发送消息弹窗 -->
    <el-dialog
      v-model="sendMessageVisible"
      title="发送消息"
      width="600px"
      custom-class="send-message-dialog"
    >
      <div class="send-message-form">
        <!-- 所有用户列表 -->
        <div class="form-item">
          <el-label>接收用户：</el-label>
          <el-select
            v-model="selectedUsers"
            multiple
            placeholder="选择接收消息的用户"
            size="large"
            class="user-select"
          >
            <el-option
              v-for="user in allUsers"
              :key="user.id"
              :label="user.real_name || user.username"
              :value="user.id"
            >
              <div class="user-option">
                <div class="user-info">
                  <span class="user-name">{{ user.real_name || user.username }}</span>
                  <span class="user-role">({{ user.role }})</span>
                </div>
                <el-tag 
                  :type="isUserOnline(user.id) ? 'success' : 'info'" 
                  size="small" 
                  class="online-tag"
                >
                  {{ isUserOnline(user.id) ? '在线' : '离线' }}
                </el-tag>
              </div>
            </el-option>
          </el-select>
        </div>
        
        <!-- 消息标题 -->
        <div class="form-item">
          <el-input
            v-model="messageForm.title"
            placeholder="消息标题"
            size="large"
            class="title-input"
          />
        </div>
        
        <!-- 消息内容 -->
        <div class="form-item">
          <el-input
            v-model="messageForm.content"
            type="textarea"
            :rows="4"
            placeholder="消息内容"
            size="large"
            class="content-input"
          />
        </div>
        
        <!-- 消息类型 -->
        <div class="form-item">
          <el-select
            v-model="messageForm.messageType"
            placeholder="消息类型"
            size="large"
            class="type-select"
          >
            <el-option label="系统通知" value="系统通知" />
            <el-option label="新任务通知" value="新任务通知" />
            <el-option label="统计通知" value="统计通知" />
          </el-select>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button size="large" @click="sendMessageVisible = false">取消</el-button>
          <el-button size="large" type="primary" @click="sendMessage" :loading="sendingMessage">
            {{ sendingMessage ? '发送中...' : '发送消息' }}
          </el-button>
        </span>
      </template>
    </el-dialog>
    
    <el-card shadow="hover" class="messages-card">
      <!-- 消息过滤和搜索 -->
      <div class="messages-filter">
        <div class="filter-item">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索消息标题或内容"
            prefix-icon="el-icon-search"
            clearable
            size="large"
            class="search-input"
          />
        </div>
        <div class="filter-item">
          <el-select
            v-model="selectedType"
            placeholder="消息类型"
            size="large"
            clearable
            class="type-select"
          >
            <el-option label="全部类型" value="" />
            <el-option label="新任务通知" value="新任务通知" />
            <el-option label="提交确认通知" value="提交确认通知" />
            <el-option label="统计通知" value="统计通知" />
            <el-option label="队列变更通知" value="队列变更通知" />
            <el-option label="轮询提醒" value="轮询提醒" />
            <el-option label="系统通知" value="系统通知" />
          </el-select>
        </div>
        <div class="filter-item">
          <el-select
            v-model="selectedStatus"
            placeholder="消息状态"
            size="large"
            clearable
            class="status-select"
          >
            <el-option label="全部状态" value="" />
            <el-option label="未读消息" value="unread" />
            <el-option label="已读消息" value="read" />
          </el-select>
        </div>
      </div>
      
      <div class="message-content-wrapper">
        <!-- 消息列表 -->
        <div class="message-list-container">
          <div 
            v-for="message in filteredMessages" 
            :key="message.id"
            :class="['message-item', { 'unread-message': !message.is_read, 'active-message': activeMessageId === message.id }]"
            @click="viewMessageDetail(message)"
          >
            <div class="message-item-header">
              <div class="message-type">
                <el-tag 
                  :type="getMessageTypeColor(message.message_type)"
                  class="message-type-tag"
                >
                  {{ message.message_type }}
                </el-tag>
                <el-tag v-if="!message.is_read" type="danger" size="small" class="unread-tag">未读</el-tag>
              </div>
              <div class="message-time">{{ formatRelativeTime(message.created_at) }}</div>
            </div>
            
            <div class="message-item-content">
              <h3 class="message-title">{{ message.title }}</h3>
              <p class="message-body">{{ message.content }}</p>
            </div>
            
            <div class="message-item-footer">
              <el-button 
                type="text" 
                size="small"
                @click.stop="markAsRead(message.id)"
                :disabled="message.is_read"
                class="mark-read-btn"
              >
                {{ message.is_read ? '已读' : '标为已读' }}
              </el-button>
            </div>
          </div>
          
          <!-- 空状态 -->
          <el-empty 
            v-if="!loading && filteredMessages.length === 0"
            description="暂无消息"
            class="empty-state"
          >
            <template #image>
              <el-icon class="empty-icon"><Message /></el-icon>
            </template>
            <el-button type="primary" @click="fetchMessages">刷新消息</el-button>
          </el-empty>
          
          <!-- 加载状态 -->
          <div v-if="loading" class="loading-state">
            <el-skeleton :rows="5" animated />
          </div>
        </div>
        
        <!-- 消息详情 -->
        <div class="message-detail-container" v-if="activeMessage">
          <div class="detail-header">
            <h3 class="detail-title">{{ activeMessage.title }}</h3>
            <el-button 
              type="primary" 
              size="small"
              @click="closeMessageDetail"
            >
              <el-icon><CircleClose /></el-icon>
              关闭
            </el-button>
          </div>
          
          <div class="detail-meta">
            <div class="meta-item">
              <span class="meta-label">消息类型：</span>
              <el-tag :type="getMessageTypeColor(activeMessage.message_type)">
                {{ activeMessage.message_type }}
              </el-tag>
            </div>
            <div class="meta-item">
              <span class="meta-label">状态：</span>
              <el-tag :type="activeMessage.is_read ? 'success' : 'danger'">
                {{ activeMessage.is_read ? '已读' : '未读' }}
              </el-tag>
            </div>
            <div class="meta-item">
              <span class="meta-label">时间：</span>
              <span>{{ formatDate(activeMessage.created_at) }}</span>
            </div>
          </div>
          
          <div class="detail-content">
            <h4>消息内容：</h4>
            <p>{{ activeMessage.content }}</p>
          </div>
          
          <div class="detail-actions">
            <el-button 
              type="primary" 
              @click="markAsRead(activeMessage.id)"
              :disabled="activeMessage.is_read"
            >
              <el-icon><Reading /></el-icon>
              {{ activeMessage.is_read ? '已读' : '标为已读' }}
            </el-button>
            <el-button @click="closeMessageDetail">
              <el-icon><ArrowLeft /></el-icon>
              返回列表
            </el-button>
          </div>
        </div>
      </div>
      
      <!-- 分页 -->
      <div class="messages-pagination">
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="pagination.total"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
          background
          class="pagination"
        />
      </div>
    </el-card>
    
    <!-- 聊天室区域 -->
    <el-card shadow="hover" class="chat-room-card">
      <template #header>
        <div class="chat-room-header">
          <h3 class="chat-room-title">
            <el-icon><ChatLineRound /></el-icon>
            聊天室
          </h3>
          <div class="online-count">
            <el-tag type="success" size="small">
              <el-icon><User /></el-icon>
              在线 {{ onlineUsers.length }} 人
            </el-tag>
          </div>
        </div>
      </template>
      
      <!-- 聊天室消息列表 -->
      <div class="chat-messages-container">
        <div 
          v-for="(chatMsg, index) in chatMessages" 
          :key="index"
          :class="['chat-message-item', { 'own-message': chatMsg.isOwn }]"
        >
          <div class="chat-message-header">
            <span class="chat-message-sender">{{ chatMsg.sender }}</span>
            <span class="chat-message-time">{{ formatRelativeTime(chatMsg.timestamp) }}</span>
          </div>
          <div class="chat-message-content">
            {{ chatMsg.content }}
          </div>
        </div>
        
        <!-- 空状态 -->
        <el-empty 
          v-if="chatMessages.length === 0"
          description="暂无聊天消息"
          class="chat-empty-state"
        >
          <template #image>
            <el-icon class="empty-icon"><ChatLineRound /></el-icon>
          </template>
        </el-empty>
      </div>
      
      <!-- 聊天输入区域 -->
      <div class="chat-input-container">
        <el-input
          v-model="chatInput"
          type="textarea"
          :rows="3"
          placeholder="输入消息..."
          resize="none"
          class="chat-input"
        />
        <div class="chat-actions">
          <el-button 
            type="primary" 
            size="large" 
            @click="sendChatMessage"
            :disabled="!chatInput.trim()"
            class="send-chat-btn"
          >
            <el-icon><Message /></el-icon>
            发送
          </el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { messageAPI } from '../services/api'
import { ElMessage, ElNotification } from 'element-plus'
import { Message, Reading, CircleClose, ArrowLeft, ChatDotRound, ChatLineRound, User } from '@element-plus/icons-vue'
import webSocketService from '../services/webSocketService'

// 状态管理
const loading = ref(false)
const searchKeyword = ref('')
const selectedType = ref('')
const selectedStatus = ref('')
const messages = ref([])
const unreadCount = ref(0)
const pagination = ref({
  currentPage: 1,
  pageSize: 20,
  total: 0
})
// 消息详情相关状态
const activeMessageId = ref(null)
const activeMessage = ref(null)

// 发送消息相关状态
const sendMessageVisible = ref(false)
const selectedUsers = ref([])
const messageForm = ref({
  title: '',
  content: '',
  messageType: '系统通知'
})
const allUsers = ref([])
const onlineUsers = ref([])
const sendingMessage = ref(false)

// 聊天室相关状态
const chatMessages = ref([])
const chatInput = ref('')
const currentUser = ref(JSON.parse(localStorage.getItem('userInfo')) || {})

// 计算过滤后的消息，确保系统通知置顶
const filteredMessages = computed(() => {
  return messages.value
    .filter(message => {
      // 关键词过滤
      const keywordMatch = !searchKeyword.value || 
        message.title.includes(searchKeyword.value) || 
        message.content.includes(searchKeyword.value)
      
      // 类型过滤
      const typeMatch = !selectedType.value || message.message_type === selectedType.value
      
      // 状态过滤
      const statusMatch = !selectedStatus.value || 
        (selectedStatus.value === 'unread' && !message.is_read) || 
        (selectedStatus.value === 'read' && message.is_read)
      
      return keywordMatch && typeMatch && statusMatch
    })
    .sort((a, b) => {
      // 系统通知永远置顶
      if (a.message_type === '系统通知' && b.message_type !== '系统通知') {
        return -1
      }
      if (a.message_type !== '系统通知' && b.message_type === '系统通知') {
        return 1
      }
      // 其他消息按时间倒序
      return new Date(b.created_at) - new Date(a.created_at)
    })
})

// 获取消息类型对应的颜色
const getMessageTypeColor = (type) => {
  const colorMap = {
    '新任务通知': 'warning',
    '提交确认通知': 'success',
    '统计通知': 'info',
    '队列变更通知': 'danger',
    '轮询提醒': 'primary'
  }
  return colorMap[type] || 'default'
}

// 格式化相对时间
const formatRelativeTime = (dateString) => {
  if (!dateString) return ''
  
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffMins < 1) {
    return '刚刚'
  } else if (diffMins < 60) {
    return `${diffMins}分钟前`
  } else if (diffHours < 24) {
    return `${diffHours}小时前`
  } else if (diffDays < 7) {
    return `${diffDays}天前`
  } else {
    return date.toLocaleDateString('zh-CN')
  }
}

// 格式化完整日期
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 判断用户是否在线
const isUserOnline = (userId) => {
  return onlineUsers.value.some(user => user.id === userId)
}

// 获取消息列表
const fetchMessages = async () => {
  loading.value = true
  try {
    const response = await messageAPI.getMessages({
      page: pagination.value.currentPage,
      limit: pagination.value.pageSize,
      messageType: selectedType.value || undefined
    })
    
    if (response.success) {
      messages.value = response.data.messages
      pagination.value.total = response.data.pagination.total
      
      // 更新未读数量
      fetchUnreadCount()
    } else {
      ElMessage.error('获取消息列表失败')
    }
  } catch (error) {
    console.error('获取消息列表错误:', error)
    ElMessage.error('获取消息列表失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 获取未读消息数量
const fetchUnreadCount = async () => {
  try {
    const response = await messageAPI.getUnreadCount()
    if (response.success) {
      unreadCount.value = response.data.unreadCount
    }
  } catch (error) {
    console.error('获取未读消息数量错误:', error)
  }
}

// 查看消息详情
const viewMessageDetail = (message) => {
  activeMessageId.value = message.id
  activeMessage.value = message
  
  // 查看消息时自动标记为已读
  if (!message.is_read) {
    markAsRead(message.id)
  }
}

// 关闭消息详情
const closeMessageDetail = () => {
  activeMessageId.value = null
  activeMessage.value = null
}

// 标记消息为已读
const markAsRead = async (messageId) => {
  try {
    const response = await messageAPI.markAsRead(messageId)
    if (response.success) {
      // 更新本地消息状态
      const message = messages.value.find(m => m.id === messageId)
      if (message) {
        message.is_read = true
        unreadCount.value--
      }
      
      // 更新当前查看的消息状态
      if (activeMessage.value && activeMessage.value.id === messageId) {
        activeMessage.value.is_read = true
      }
      
      ElMessage.success('消息已标记为已读')
    } else {
      ElMessage.error('标记已读失败')
    }
  } catch (error) {
    console.error('标记消息已读错误:', error)
    ElMessage.error('标记已读失败，请稍后重试')
  }
}

// 标记所有消息为已读
const markAllAsRead = async () => {
  try {
    const response = await messageAPI.markAllAsRead()
    if (response.success) {
      // 更新本地消息状态
      messages.value.forEach(message => {
        message.is_read = true
      })
      unreadCount.value = 0
      ElMessage.success('所有消息已标记为已读')
    } else {
      ElMessage.error('标记全部已读失败')
    }
  } catch (error) {
    console.error('标记所有消息已读错误:', error)
    ElMessage.error('标记全部已读失败，请稍后重试')
  }
}

// 处理分页大小变化
const handleSizeChange = (size) => {
  pagination.value.pageSize = size
  pagination.value.currentPage = 1
  fetchMessages()
}

// 处理当前页变化
const handleCurrentChange = (currentPage) => {
  pagination.value.currentPage = currentPage
  fetchMessages()
}

// 切换发送消息弹窗
const toggleSendMessage = async () => {
  // 获取所有用户列表
  await getAllUsers()
  // 获取在线用户列表
  await getOnlineUsers()
  sendMessageVisible.value = true
}

// 获取所有用户列表
const getAllUsers = async () => {
  try {
    const response = await messageAPI.getAllUsers()
    if (response.success) {
      allUsers.value = response.data.users
    } else {
      ElMessage.error('获取用户列表失败')
    }
  } catch (error) {
    console.error('获取用户列表错误:', error)
    ElMessage.error('获取用户列表失败，请稍后重试')
  }
}

// 获取在线用户列表
const getOnlineUsers = async () => {
  try {
    const response = await messageAPI.getOnlineUsers()
    if (response.success) {
      onlineUsers.value = response.data.users
    } else {
      ElMessage.error('获取在线用户列表失败')
    }
  } catch (error) {
    console.error('获取在线用户列表错误:', error)
    ElMessage.error('获取在线用户列表失败，请稍后重试')
  }
}

// 发送消息
const sendMessage = async () => {
  if (!selectedUsers.value || selectedUsers.value.length === 0) {
    ElMessage.warning('请选择至少一个接收用户')
    return
  }
  
  if (!messageForm.value.title) {
    ElMessage.warning('请输入消息标题')
    return
  }
  
  if (!messageForm.value.content) {
    ElMessage.warning('请输入消息内容')
    return
  }
  
  sendingMessage.value = true
  try {
    const response = await messageAPI.sendMessage({
      userIds: selectedUsers.value,
      title: messageForm.value.title,
      content: messageForm.value.content,
      messageType: messageForm.value.messageType
    })
    
    if (response.success) {
      ElMessage.success('消息发送成功')
      sendMessageVisible.value = false
      // 重置表单
      selectedUsers.value = []
      messageForm.value = {
        title: '',
        content: '',
        messageType: '系统通知'
      }
    } else {
      ElMessage.error('消息发送失败')
    }
  } catch (error) {
    console.error('发送消息错误:', error)
    ElMessage.error('消息发送失败，请稍后重试')
  } finally {
    sendingMessage.value = false
  }
}

// 发送聊天消息
const sendChatMessage = async () => {
  if (!chatInput.value.trim()) {
    return
  }
  
  try {
    const chatMessage = {
      type: 'chatMessage',
      sender: currentUser.value.real_name || currentUser.value.username || '未知用户',
      senderId: currentUser.value.id,
      content: chatInput.value.trim(),
      timestamp: new Date().toISOString()
    }
    
    // 发送WebSocket消息
    webSocketService.send(chatMessage)
    
    // 添加到本地聊天记录
    chatMessages.value.push({
      ...chatMessage,
      isOwn: true
    })
    
    // 清空输入框
    chatInput.value = ''
  } catch (error) {
    console.error('发送聊天消息错误:', error)
    ElMessage.error('发送消息失败，请稍后重试')
  }
}

// 初始加载
onMounted(() => {
  fetchMessages()
  
  // 监听WebSocket消息通知
  setupWebSocketListeners()
})

// 清理WebSocket监听器
onUnmounted(() => {
  if (messageNotificationListener) {
    messageNotificationListener()
  }
  if (chatMessageListener) {
    chatMessageListener()
  }
})

// WebSocket监听器引用
let messageNotificationListener = null
let chatMessageListener = null

// 设置WebSocket监听器
const setupWebSocketListeners = () => {
  // 监听消息通知
  messageNotificationListener = webSocketService.on('messageNotification', (notification) => {
    const { title, content, messageType } = notification
    
    // 显示通知
    ElNotification({
      title: '新消息',
      message: content,
      type: 'info',
      duration: 5000,
      showClose: true
    })
    
    // 更新未读消息数量
    fetchUnreadCount()
    
    // 刷新消息列表
    fetchMessages()
  })
  
  // 监听聊天消息
  chatMessageListener = webSocketService.on('chatMessage', (chatMessage) => {
    // 只添加来自其他用户的消息
    if (chatMessage.senderId !== currentUser.value.id) {
      chatMessages.value.push({
        ...chatMessage,
        isOwn: false
      })
    }
  })
}
</script>

<style scoped>
.messages-container {
  padding: 24px;
  background: linear-gradient(135deg, #f0f9ff 0%, #e6f7ff 100%);
  min-height: calc(100vh - 64px);
}

/* 头部样式 */
.messages-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  background: white;
  padding: 24px 32px;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid #e6f7ff;
}

.messages-title {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 28px;
  font-weight: 600;
  color: #597ef7;
  margin: 0;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.05);
}

.messages-title :deep(.el-icon) {
  font-size: 32px;
  color: #91d5ff;
}

.unread-badge {
  transform: translate(10px, -10px);
  background: #ff7875;
}

.header-actions {
  display: flex;
  gap: 16px;
  align-items: center;
}

.send-message-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.3s ease;
  background: linear-gradient(135deg, #95de64 0%, #52c41a 100%);
  border: none;
  color: white;
}

.send-message-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(149, 222, 100, 0.3);
  background: linear-gradient(135deg, #73d13d 0%, #389e0d 100%);
}

.mark-all-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.3s ease;
  background: linear-gradient(135deg, #91d5ff 0%, #b37feb 100%);
  border: none;
  color: white;
}

.mark-all-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(145, 213, 255, 0.3);
  background: linear-gradient(135deg, #69c0ff 0%, #9254de 100%);
}

.mark-all-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
  background: linear-gradient(135deg, #91d5ff 0%, #b37feb 100%);
}

/* 发送消息弹窗样式 */
.send-message-dialog :deep(.el-dialog__header) {
  background: linear-gradient(135deg, #91d5ff 0%, #b37feb 100%);
  padding: 24px;
  border-radius: 16px 16px 0 0;
}

.send-message-dialog :deep(.el-dialog__title) {
  font-size: 20px;
  font-weight: 600;
  color: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
}

.send-message-dialog :deep(.el-dialog__body) {
  padding: 32px 24px;
  background: #f6ffed;
}

.send-message-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.user-select {
  width: 100%;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.user-select:focus {
  box-shadow: 0 0 0 2px rgba(149, 222, 100, 0.2);
}

.title-input {
  width: 100%;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.title-input:focus {
  box-shadow: 0 0 0 2px rgba(149, 222, 100, 0.2);
}

.content-input {
  width: 100%;
  border-radius: 8px;
  transition: all 0.3s ease;
  resize: vertical;
}

.content-input:focus {
  box-shadow: 0 0 0 2px rgba(149, 222, 100, 0.2);
}

.type-select {
  width: 100%;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.type-select:focus {
  box-shadow: 0 0 0 2px rgba(149, 222, 100, 0.2);
}

.user-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-name {
  font-weight: 600;
  color: #597ef7;
}

.user-role {
  font-size: 12px;
  color: #909399;
}

.online-tag {
  font-size: 10px;
  font-weight: 600;
}

.send-message-dialog :deep(.el-dialog__footer) {
  background: #f6ffed;
  padding: 24px;
  border-radius: 0 0 16px 16px;
  border-top: 2px solid #d9f7be;
}

/* 卡片样式 */
.messages-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid #e6f7ff;
  overflow: hidden;
  transition: all 0.3s ease;
}

.messages-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

/* 过滤区域样式 */
.messages-filter {
  display: flex;
  gap: 16px;
  padding: 24px;
  background: linear-gradient(135deg, #f0f9ff 0%, #e6f7ff 100%);
  border-bottom: 1px solid #e6f7ff;
  border-radius: 16px 16px 0 0;
}

.filter-item {
  flex: 1;
  min-width: 200px;
}

.search-input {
  width: 100%;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.search-input:focus {
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.type-select,
.status-select {
  width: 100%;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.type-select:focus,
.status-select:focus {
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

/* 消息内容容器 - 分栏布局 */
.message-content-wrapper {
  display: flex;
  gap: 20px;
  padding: 24px;
  min-height: 600px;
}

/* 消息列表容器 */
.message-list-container {
  flex: 1;
  max-height: calc(100vh - 350px);
  overflow-y: auto;
  background: #f6ffed;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid #b7eb8f;
}

/* 消息详情容器 */
.message-detail-container {
  flex: 1;
  background: #f6ffed;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  max-height: calc(100vh - 350px);
  overflow-y: auto;
  border: 1px solid #b7eb8f;
}

/* 详情头部 */
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid #d9f7be;
}

.detail-title {
  font-size: 20px;
  font-weight: 700;
  color: #389e0d;
  margin: 0;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.05);
}

/* 详情元信息 */
.detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
  padding: 16px;
  background: #f0f9ff;
  border-radius: 8px;
  border: 1px solid #e6f7ff;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.meta-label {
  font-weight: 600;
  color: #597ef7;
}

/* 详情内容 */
.detail-content {
  margin-bottom: 24px;
  line-height: 1.8;
  color: #606266;
  padding: 16px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e6f7ff;
}

.detail-content h4 {
  font-size: 16px;
  font-weight: 600;
  color: #597ef7;
  margin-bottom: 12px;
}

/* 详情操作按钮 */
.detail-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 2px solid #d9f7be;
}

.detail-actions .el-button {
  border-radius: 8px;
  transition: all 0.3s ease;
}

.detail-actions .el-button--primary {
  background: linear-gradient(135deg, #95de64 0%, #52c41a 100%);
  border: none;
  color: white;
}

.detail-actions .el-button--primary:hover {
  background: linear-gradient(135deg, #73d13d 0%, #389e0d 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(82, 196, 26, 0.3);
}

.detail-actions .el-button {
  background: white;
  border: 1px solid #d9f7be;
  color: #52c41a;
}

.detail-actions .el-button:hover {
  background: #f6ffed;
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(82, 196, 26, 0.2);
}

/* 活跃消息项 */
.active-message {
  background: #f0f9ff;
  border-color: #91d5ff;
  box-shadow: 0 4px 12px rgba(145, 213, 255, 0.2);
}

.active-message:hover {
  background: #e6f7ff;
  border-color: #69c0ff;
  box-shadow: 0 6px 20px rgba(145, 213, 255, 0.3);
}

/* 消息列表项 */
.message-item {
  cursor: pointer;
  transition: all 0.3s ease;
}

.message-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
  border-color: #91d5ff;
}

/* 响应式设计 - 小屏幕下堆叠显示 */
@media (max-width: 768px) {
  .message-content-wrapper {
    flex-direction: column;
  }
  
  .message-list-container,
  .message-detail-container {
    flex: none;
    max-height: none;
  }
  
  .message-detail-container {
    margin-top: 20px;
  }
  
  .detail-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .detail-meta {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .detail-actions {
    flex-direction: column;
  }
}

.message-list-container::-webkit-scrollbar {
  width: 6px;
}

.message-list-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.message-list-container::-webkit-scrollbar-thumb {
  background: #b7eb8f;
  border-radius: 3px;
}

.message-list-container::-webkit-scrollbar-thumb:hover {
  background: #95de64;
}

/* 消息项样式 */
.message-item {
  background: white;
  border: 1px solid #e6f7ff;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.message-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  border-color: #91d5ff;
}

.unread-message {
  border-left: 4px solid #91d5ff;
  background: #f0f9ff;
}

.unread-message:hover {
  background: #e6f7ff;
}

/* 消息项头部 */
.message-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.message-type {
  display: flex;
  align-items: center;
  gap: 8px;
}

.message-type-tag {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 20px;
}

.unread-tag {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
  background: #ff7875;
  color: white;
}

.message-time {
  font-size: 12px;
  color: #91d5ff;
  font-weight: 500;
}

/* 消息项内容 */
.message-item-content {
  margin-bottom: 16px;
}

.message-item-content .message-title {
  font-size: 16px;
  font-weight: 700;
  color: #597ef7;
  margin: 0 0 8px 0;
  transition: color 0.3s ease;
}

.unread-message .message-title {
  color: #91d5ff;
}

.message-body {
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
  margin: 0;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  padding: 8px;
  background: #fafafa;
  border-radius: 6px;
  border: 1px solid #f0f0f0;
}

/* 消息项底部 */
.message-item-footer {
  display: flex;
  justify-content: flex-end;
}

.mark-read-btn {
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 6px;
  transition: all 0.3s ease;
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  color: #52c41a;
}

.mark-read-btn:hover {
  background: #d9f7be;
  color: #389e0d;
  transform: translateY(-1px);
}

.mark-read-btn:disabled {
  color: #c0c4cc;
  cursor: not-allowed;
  background: #fafafa;
  border: 1px solid #f0f0f0;
}

/* 空状态样式 */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: #f6ffed;
  border-radius: 12px;
  margin-top: 20px;
  border: 1px solid #b7eb8f;
}

.empty-icon {
  font-size: 80px;
  color: #95de64;
  margin-bottom: 16px;
}

.empty-state :deep(.el-empty__description) {
  font-size: 16px;
  color: #52c41a;
}

.empty-state :deep(.el-button) {
  background: linear-gradient(135deg, #95de64 0%, #52c41a 100%);
  border: none;
  color: white;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.empty-state :deep(.el-button:hover) {
  background: linear-gradient(135deg, #73d13d 0%, #389e0d 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(82, 196, 26, 0.3);
}

/* 加载状态样式 */
.loading-state {
  padding: 40px 20px;
}

.loading-state :deep(.el-skeleton__item) {
  background: linear-gradient(135deg, #f0f9ff 0%, #e6f7ff 100%);
  border-radius: 8px;
}

/* 分页样式 */
.messages-pagination {
  padding: 20px 24px;
  background: linear-gradient(135deg, #f0f9ff 0%, #e6f7ff 100%);
  border-top: 1px solid #e6f7ff;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  border-radius: 0 0 16px 16px;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.pagination :deep(.el-pagination__button:hover) {
  color: #91d5ff;
  border-color: #91d5ff;
}

.pagination :deep(.el-pagination__button--active) {
  background-color: #91d5ff;
  border-color: #91d5ff;
  color: white;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .messages-filter {
    flex-wrap: wrap;
  }
  
  .filter-item {
    flex: 1;
    min-width: calc(50% - 8px);
  }
}

/* 聊天室相关样式 */
.chat-room-card {
  margin-top: 24px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid #e6f7ff;
  overflow: hidden;
  transition: all 0.3s ease;
}

.chat-room-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.chat-room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 0;
}

.chat-room-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 20px;
  font-weight: 600;
  color: #597ef7;
  margin: 0;
}

.chat-room-title :deep(.el-icon) {
  font-size: 24px;
  color: #91d5ff;
}

.online-count {
  display: flex;
  align-items: center;
}

.chat-messages-container {
  max-height: 400px;
  overflow-y: auto;
  background: #f6ffed;
  border-radius: 12px;
  padding: 20px;
  margin: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid #b7eb8f;
}

.chat-message-item {
  margin-bottom: 16px;
  padding: 12px 16px;
  border-radius: 12px;
  max-width: 80%;
  transition: all 0.3s ease;
}

.chat-message-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.chat-message-item:not(.own-message) {
  align-self: flex-start;
  background: white;
  border: 1px solid #e6f7ff;
  margin-right: auto;
}

.chat-message-item.own-message {
  align-self: flex-end;
  background: #e6f7ff;
  border: 1px solid #91d5ff;
  margin-left: auto;
}

.chat-message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.chat-message-sender {
  font-weight: 600;
  font-size: 14px;
  color: #597ef7;
}

.chat-message-time {
  font-size: 12px;
  color: #909399;
}

.chat-message-content {
  font-size: 14px;
  line-height: 1.5;
  color: #606266;
  word-wrap: break-word;
}

.chat-empty-state {
  text-align: center;
  padding: 40px 20px;
  background: #f6ffed;
  border-radius: 12px;
  margin-top: 20px;
  border: 1px solid #b7eb8f;
}

.chat-empty-state :deep(.el-empty__description) {
  font-size: 14px;
  color: #52c41a;
}

.chat-input-container {
  padding: 20px;
  background: #f6ffed;
  border-top: 1px solid #b7eb8f;
  border-radius: 0 0 16px 16px;
}

.chat-input {
  width: 100%;
  border-radius: 8px;
  margin-bottom: 12px;
  resize: vertical;
  min-height: 80px;
}

.chat-input:focus {
  box-shadow: 0 0 0 2px rgba(149, 222, 100, 0.2);
}

.chat-actions {
  display: flex;
  justify-content: flex-end;
}

.send-chat-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.3s ease;
  background: linear-gradient(135deg, #95de64 0%, #52c41a 100%);
  border: none;
  color: white;
}

.send-chat-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(149, 222, 100, 0.3);
  background: linear-gradient(135deg, #73d13d 0%, #389e0d 100%);
}

.send-chat-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
  background: linear-gradient(135deg, #95de64 0%, #52c41a 100%);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .messages-container {
    padding: 10px;
  }
  
  .messages-header {
    flex-direction: column;
    gap: 16px;
    padding: 16px;
  }
  
  .messages-title {
    font-size: 20px;
  }
  
  .messages-filter {
    flex-direction: column;
    gap: 12px;
    padding: 16px;
  }
  
  .filter-item {
    width: 100%;
    min-width: auto;
  }
  
  .message-list-container {
    padding: 16px;
  }
  
  .message-item {
    padding: 16px;
  }
  
  .message-item-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .chat-room-card {
    margin-top: 16px;
  }
  
  .chat-messages-container {
    margin: 10px;
    padding: 12px;
    max-height: 300px;
  }
  
  .chat-message-item {
    max-width: 90%;
  }
  
  .chat-input-container {
    padding: 12px;
  }
  
  .chat-input {
    min-height: 60px;
  }
}
</style>