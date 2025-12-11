<template>
  <div class="messages-container">
    <div class="messages-header">
      <h2 class="messages-title">
        <el-icon><Message /></el-icon>
        我的消息
        <el-badge v-if="unreadCount > 0" :value="unreadCount" type="danger" class="unread-badge" />
      </h2>
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { messageAPI } from '../services/api'
import { ElMessage } from 'element-plus'
import { Message, Reading, CircleClose, ArrowLeft } from '@element-plus/icons-vue'

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

// 计算过滤后的消息
const filteredMessages = computed(() => {
  return messages.value.filter(message => {
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

// 初始加载
onMounted(() => {
  fetchMessages()
})
</script>

<style scoped>
.messages-container {
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: calc(100vh - 64px);
}

/* 头部样式 */
.messages-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  background: rgba(255, 255, 255, 0.95);
  padding: 20px 30px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
}

.messages-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 24px;
  font-weight: 700;
  color: #303133;
  margin: 0;
}

.messages-title :deep(.el-icon) {
  font-size: 28px;
  color: #409eff;
}

.unread-badge {
  transform: translate(10px, -10px);
}

.mark-all-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.mark-all-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(64, 158, 255, 0.3);
}

.mark-all-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* 卡片样式 */
.messages-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  border: none;
  overflow: hidden;
}

/* 过滤区域样式 */
.messages-filter {
  display: flex;
  gap: 16px;
  padding: 24px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%);
  border-bottom: 1px solid #e4e7ed;
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
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

/* 消息详情容器 */
.message-detail-container {
  flex: 1;
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  max-height: calc(100vh - 350px);
  overflow-y: auto;
}

/* 详情头部 */
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid #f0f0f0;
}

.detail-title {
  font-size: 20px;
  font-weight: 700;
  color: #303133;
  margin: 0;
}

/* 详情元信息 */
.detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.meta-label {
  font-weight: 600;
  color: #606266;
}

/* 详情内容 */
.detail-content {
  margin-bottom: 24px;
  line-height: 1.8;
  color: #606266;
}

.detail-content h4 {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
}

/* 详情操作按钮 */
.detail-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 2px solid #f0f0f0;
}

/* 活跃消息项 */
.active-message {
  background: #ecf5ff;
  border-color: #409eff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.2);
}

.active-message:hover {
  background: #d9ecff;
  border-color: #66b1ff;
  box-shadow: 0 6px 20px rgba(64, 158, 255, 0.3);
}

/* 消息列表项 */
.message-item {
  cursor: pointer;
  transition: all 0.3s ease;
}

.message-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  border-color: #409eff;
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
  background: #c1c1c1;
  border-radius: 3px;
}

.message-list-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 消息项样式 */
.message-item {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.message-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  border-color: #409eff;
}

.unread-message {
  border-left: 4px solid #409eff;
  background: #f0f9ff;
}

.unread-message:hover {
  background: #ecf5ff;
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
}

.message-time {
  font-size: 12px;
  color: #909399;
  font-weight: 500;
}

/* 消息项内容 */
.message-item-content {
  margin-bottom: 16px;
}

.message-item-content .message-title {
  font-size: 16px;
  font-weight: 700;
  color: #303133;
  margin: 0 0 8px 0;
  transition: color 0.3s ease;
}

.unread-message .message-title {
  color: #409eff;
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
}

.mark-read-btn:hover {
  background: rgba(64, 158, 255, 0.1);
  color: #409eff;
}

.mark-read-btn:disabled {
  color: #c0c4cc;
  cursor: not-allowed;
  background: transparent;
}

/* 空状态样式 */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: #fafafa;
  border-radius: 12px;
  margin-top: 20px;
}

.empty-icon {
  font-size: 80px;
  color: #c0c4cc;
  margin-bottom: 16px;
}

.empty-state :deep(.el-empty__description) {
  font-size: 16px;
  color: #909399;
}

/* 加载状态样式 */
.loading-state {
  padding: 40px 20px;
}

/* 分页样式 */
.messages-pagination {
  padding: 20px 24px;
  background: #fafafa;
  border-top: 1px solid #e4e7ed;
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
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
}
</style>