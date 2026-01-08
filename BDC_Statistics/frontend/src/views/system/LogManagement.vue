<template>
  <div class="log-management-container">
    <div class="log-management-header">
      <h2 class="log-management-title">
        <el-icon><Document /></el-icon>
        系统日志管理
      </h2>
      <div class="header-actions">
        <el-button 
          type="primary" 
          size="large"
          @click="refreshLogs"
          :loading="loading"
          class="refresh-btn"
        >
          <el-icon><Refresh /></el-icon>
          刷新日志
        </el-button>
        <el-button 
          type="warning" 
          size="large"
          @click="cleanOldLogs"
          :loading="cleaning"
          class="clean-btn"
        >
          <el-icon><Delete /></el-icon>
          清理旧日志
        </el-button>
      </div>
    </div>
    
    <!-- 日志筛选和搜索 -->
    <el-card shadow="hover" class="log-filter-card">
      <div class="log-filter">
        <div class="filter-row">
          <div class="filter-item">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索用户名或操作描述"
              prefix-icon="el-icon-search"
              clearable
              size="large"
              class="search-input"
              @keyup.enter="fetchLogs"
            />
          </div>
          <div class="filter-item">
            <el-select
              v-model="selectedAction"
              placeholder="操作类型"
              size="large"
              clearable
              class="action-select"
              @change="fetchLogs"
            >
              <el-option label="全部操作" value="" />
              <el-option label="登录成功" value="login_success" />
              <el-option label="登录失败" value="login_failed" />
              <el-option label="创建案件" value="create_case" />
              <el-option label="发送消息" value="send_message" />
            </el-select>
          </div>
          <div class="filter-item">
            <el-select
              v-model="selectedLevel"
              placeholder="日志级别"
              size="large"
              clearable
              class="level-select"
              @change="fetchLogs"
            >
              <el-option label="全部级别" value="" />
              <el-option label="信息" value="info" />
              <el-option label="警告" value="warning" />
              <el-option label="错误" value="error" />
            </el-select>
          </div>
        </div>
        <div class="filter-row">
          <div class="filter-item">
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              size="large"
              class="date-picker"
              @change="fetchLogs"
            />
          </div>
          <div class="filter-item buttons-container">
            <div class="buttons-wrapper">
              <el-button 
                type="primary" 
                size="large"
                @click="fetchLogs"
                :loading="loading"
                class="search-btn"
              >
                <el-icon><Search /></el-icon>
                搜索
              </el-button>
              <el-button 
                size="large"
                @click="resetFilters"
                class="reset-btn"
              >
                <el-icon><RefreshLeft /></el-icon>
                重置
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </el-card>
    
    <!-- 日志统计图表 -->
    <el-card shadow="hover" class="log-stats-card">
      <div class="log-stats">
        <div class="stats-item">
          <h3 class="stats-title">
            <el-icon><DataAnalysis /></el-icon>
            日志级别分布
          </h3>
          <div class="chart-container">
            <div ref="levelChartRef" class="level-chart"></div>
          </div>
        </div>
        <div class="stats-item">
          <h3 class="stats-title">
            <el-icon><Operation /></el-icon>
            操作类型分布
          </h3>
          <div class="chart-container">
            <div ref="actionChartRef" class="action-chart"></div>
          </div>
        </div>
      </div>
    </el-card>
    
    <!-- 日志列表 -->
    <el-card shadow="hover" class="log-list-card">
      <div class="log-list">
        <!-- 日志列表 -->
        <div class="log-items">
          <div 
            v-for="log in logs" 
            :key="log.id"
            :class="['log-item', `log-level-${log.level}`]"
            @click="viewLogDetail(log)"
          >
            <div class="log-item-header">
              <div class="log-item-info">
                <el-tag 
                  :type="getLevelType(log.level)"
                  class="log-level-tag"
                >
                  {{ getLevelText(log.level) }}
                </el-tag>
                <span class="log-username">{{ log.displayName }}</span>
                <span class="log-action">{{ getActionText(log.action) }}</span>
              </div>
              <div class="log-item-time">{{ formatDate(log.created_at) }}</div>
            </div>
            <div class="log-item-content">
              <p class="log-description">{{ log.description }}</p>
              <div class="log-meta">
                <span class="log-ip">{{ log.ip_address }}</span>
                <span class="log-user-agent">{{ truncateUserAgent(log.user_agent) }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 空状态 -->
        <el-empty 
          v-if="!loading && logs.length === 0"
          description="暂无日志记录"
          class="empty-state"
        >
          <template #image>
            <el-icon class="empty-icon"><Document /></el-icon>
          </template>
          <el-button type="primary" @click="fetchLogs">刷新日志</el-button>
        </el-empty>
        
        <!-- 加载状态 -->
        <div v-if="loading" class="loading-state">
          <el-skeleton :rows="5" animated />
        </div>
      </div>
      
      <!-- 分页 -->
      <div class="log-pagination">
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="pagination.total"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
          background
          class="pagination"
        />
      </div>
    </el-card>
    
    <!-- 日志详情弹窗 -->
    <el-dialog
      v-model="detailVisible"
      title="日志详情"
      width="800px"
      custom-class="log-detail-dialog"
    >
      <div class="log-detail" v-if="currentLog">
        <div class="detail-row">
          <span class="detail-label">日志ID：</span>
          <span class="detail-value">{{ currentLog.id }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">用户ID：</span>
          <span class="detail-value">{{ currentLog.user_id || 'N/A' }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">用户名：</span>
          <span class="detail-value">{{ currentLog.displayName }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">操作类型：</span>
          <span class="detail-value">{{ getActionText(currentLog.action) }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">日志级别：</span>
          <span class="detail-value">
            <el-tag :type="getLevelType(currentLog.level)">
              {{ getLevelText(currentLog.level) }}
            </el-tag>
          </span>
        </div>
        <div class="detail-row">
          <span class="detail-label">操作描述：</span>
          <span class="detail-value detail-description">{{ currentLog.description }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">客户端IP：</span>
          <span class="detail-value">{{ currentLog.ip_address || 'N/A' }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">用户代理：</span>
          <span class="detail-value detail-user-agent">{{ currentLog.user_agent || 'N/A' }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">记录时间：</span>
          <span class="detail-value">{{ formatDate(currentLog.created_at) }}</span>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button size="large" @click="detailVisible = false">关闭</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage, ElNotification, ElMessageBox } from 'element-plus'
import { Document, Refresh, Delete, Search, RefreshLeft, DataAnalysis, Operation } from '@element-plus/icons-vue'
import * as echarts from 'echarts'

// 状态管理
const loading = ref(false)
const cleaning = ref(false)
const logs = ref([])
const currentLog = ref(null)
const detailVisible = ref(false)
const searchKeyword = ref('')
const selectedAction = ref('')
const selectedLevel = ref('')
const dateRange = ref([])

// 分页状态
const pagination = ref({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

// 图表引用
const levelChartRef = ref(null)
const actionChartRef = ref(null)

// ECharts实例
let levelChart = null
let actionChart = null

// 统计数据
const logStats = ref({})
const levelChartOption = ref({})
const actionChartOption = ref({})

// 计算属性
const startDate = computed(() => {
  return dateRange.value[0] ? dateRange.value[0] : ''
})

const endDate = computed(() => {
  return dateRange.value[1] ? dateRange.value[1] : ''
})

// 获取日志级别对应的标签类型
const getLevelType = (level) => {
  const typeMap = {
    info: 'info',
    warning: 'warning',
    error: 'danger'
  }
  return typeMap[level] || 'default'
}

// 获取日志级别的中文显示
const getLevelText = (level) => {
  const levelMap = {
    info: '通知',
    warning: '警告',
    error: '错误'
  }
  return levelMap[level] || level
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 截断用户代理字符串
const truncateUserAgent = (userAgent) => {
  if (!userAgent) return ''
  return userAgent.length > 50 ? userAgent.substring(0, 50) + '...' : userAgent
}

// 转换操作类型为中文
const getActionText = (action) => {
  const actionMap = {
    'login_success': '登录成功',
    'login_failed': '登录失败',
    'create_case': '创建案件',
    'send_message': '发送消息'
  }
  return actionMap[action] || action
}

// 刷新日志列表
const refreshLogs = () => {
  pagination.value.currentPage = 1
  fetchLogs()
  fetchLogStats()
}

// 获取日志列表
const fetchLogs = async () => {
  loading.value = true
  try {
    const response = await logAPI.getLogs({
      page: pagination.value.currentPage,
      limit: pagination.value.pageSize,
      username: searchKeyword.value,
      action: selectedAction.value,
      level: selectedLevel.value,
      startDate: startDate.value,
      endDate: endDate.value
    })
    
    if (response.success) {
      logs.value = response.data.logs
      pagination.value.total = response.data.pagination.total
    } else {
      ElMessage.error('获取日志列表失败')
    }
  } catch (error) {
    console.error('获取日志列表错误:', error)
    ElMessage.error('获取日志列表失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 获取日志统计数据
const fetchLogStats = async () => {
  try {
    const response = await logAPI.getLogStats({
      startDate: startDate.value,
      endDate: endDate.value
    })
    
    if (response.success) {
      logStats.value = response.data
      updateCharts()
    } else {
      ElMessage.error('获取日志统计数据失败')
    }
  } catch (error) {
    console.error('获取日志统计数据错误:', error)
  }
}

// 更新图表
const updateCharts = () => {
  // 更新级别分布图表
  const levelData = Object.entries(logStats.value.levelStats || {}).map(([level, count]) => ({
    name: getLevelText(level),
    value: count
  }))
  
  const levelOption = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [
      {
        name: '日志级别',
        type: 'pie',
        radius: '70%',
        data: levelData,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  }
  if (levelChart) {
    levelChart.setOption(levelOption)
  }
  
  // 更新操作类型分布图表
  const actionData = Object.entries(logStats.value.actionStats || {}).map(([action, count]) => ({
    name: getActionText(action),
    value: count
  }))
  
  const actionOption = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [
      {
        name: '操作类型',
        type: 'pie',
        radius: '70%',
        data: actionData,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  }
  if (actionChart) {
    actionChart.setOption(actionOption)
  }
}

// 查看日志详情
const viewLogDetail = (log) => {
  currentLog.value = log
  detailVisible.value = true
}

// 清理旧日志
const cleanOldLogs = async () => {
  try {
    const { value: days } = await ElMessageBox.prompt(
      '请输入要保留的日志天数：',
      '清理旧日志',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPattern: /^\d+$/,
        inputErrorMessage: '请输入有效的天数',
        inputValue: '30'
      }
    )
    
    cleaning.value = true
    const response = await logAPI.cleanOldLogs({
      days: parseInt(days)
    })
    
    if (response.success) {
      ElMessage.success(response.message)
      fetchLogs()
      fetchLogStats()
    } else {
      ElMessage.error('清理旧日志失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('清理旧日志错误:', error)
      ElMessage.error('清理旧日志失败，请稍后重试')
    }
  } finally {
    cleaning.value = false
  }
}

// 重置筛选条件
const resetFilters = () => {
  searchKeyword.value = ''
  selectedAction.value = ''
  selectedLevel.value = ''
  dateRange.value = []
  pagination.value.currentPage = 1
  fetchLogs()
}

// 分页处理
const handleSizeChange = (size) => {
  pagination.value.pageSize = size
  fetchLogs()
}

const handleCurrentChange = (current) => {
  pagination.value.currentPage = current
  fetchLogs()
}

// 初始加载
onMounted(() => {
  fetchLogs()
  fetchLogStats()
  
  // 初始化图表
  setTimeout(() => {
    initCharts()
    updateCharts()
  }, 100)
  
  // 添加窗口大小变化监听
  window.addEventListener('resize', resizeCharts)
})

// 组件卸载
onUnmounted(() => {
  // 销毁图表
  destroyCharts()
  // 移除事件监听
  window.removeEventListener('resize', resizeCharts)
})

// 初始化图表
const initCharts = () => {
  if (levelChartRef.value) {
    levelChart = echarts.init(levelChartRef.value)
  }
  if (actionChartRef.value) {
    actionChart = echarts.init(actionChartRef.value)
  }
}

// 调整图表大小
const resizeCharts = () => {
  levelChart?.resize()
  actionChart?.resize()
}

// 销毁图表
const destroyCharts = () => {
  levelChart?.dispose()
  actionChart?.dispose()
}

// 导入API
import { logAPI } from '../../services/api'
</script>

<style scoped>
.log-management-container {
  padding: 24px;
  background: linear-gradient(135deg, #f0f9ff 0%, #e6f7ff 100%);
  min-height: calc(100vh - 64px);
}

/* 头部样式 */
.log-management-header {
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

.log-management-title {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 28px;
  font-weight: 600;
  color: #597ef7;
  margin: 0;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.05);
}

.log-management-title :deep(.el-icon) {
  font-size: 32px;
  color: #91d5ff;
}

.header-actions {
  display: flex;
  gap: 16px;
  align-items: center;
}

.refresh-btn,
.clean-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.refresh-btn {
  background: linear-gradient(135deg, #95de64 0%, #52c41a 100%);
  border: none;
  color: white;
}

.refresh-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(149, 222, 100, 0.3);
  background: linear-gradient(135deg, #73d13d 0%, #389e0d 100%);
}

.clean-btn {
  background: linear-gradient(135deg, #fa8c16 0%, #d46b08 100%);
  border: none;
  color: white;
}

.clean-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(250, 140, 22, 0.3);
  background: linear-gradient(135deg, #d46b08 0%, #ad5a06 100%);
}

/* 筛选卡样式 */
.log-filter-card {
  margin-bottom: 24px;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #e6f7ff;
}

.log-filter {
  padding: 24px;
  background: #f0f9ff;
}

.filter-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  align-items: center;
}

.filter-row:last-child {
  margin-bottom: 0;
}

.filter-item {
  flex: 1;
  min-width: 200px;
}

.buttons-container {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.buttons-wrapper {
  display: flex;
  gap: 16px;
  align-items: center;
}

.search-input,
.action-select,
.level-select,
.date-picker {
  width: 100%;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.search-btn,
.reset-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.search-btn {
  background: linear-gradient(135deg, #597ef7 0%, #2f54eb 100%);
  border: none;
  color: white;
}

.search-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(89, 126, 247, 0.3);
  background: linear-gradient(135deg, #2f54eb 0%, #1d39c4 100%);
}

.reset-btn {
  background: white;
  border: 1px solid #d9d9d9;
  color: #606266;
}

.reset-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #91d5ff;
  color: #597ef7;
}

/* 统计卡样式 */
.log-stats-card {
  margin-bottom: 24px;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #e6f7ff;
}

.log-stats {
  padding: 24px;
  background: #f0f9ff;
}

.stats-item {
  margin-bottom: 24px;
}

.stats-item:last-child {
  margin-bottom: 0;
}

.stats-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 18px;
  font-weight: 600;
  color: #597ef7;
  margin-bottom: 16px;
}

.stats-title :deep(.el-icon) {
  font-size: 20px;
  color: #91d5ff;
}

.chart-container {
  height: 300px;
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.level-chart,
.action-chart {
  width: 100%;
  height: 100%;
}

/* 日志列表卡样式 */
.log-list-card {
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #e6f7ff;
}

.log-list {
  padding: 24px;
}

.log-items {
  margin-bottom: 24px;
}

.log-item {
  background: white;
  border: 1px solid #e6f7ff;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.log-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  border-color: #91d5ff;
}

.log-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e6f7ff;
}

.log-item-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  min-width: 0;
}

.log-level-tag {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 20px;
}

.log-username {
  font-weight: 600;
  color: #597ef7;
}

.log-action {
  font-size: 14px;
  color: #606266;
  background: #f0f9ff;
  padding: 4px 12px;
  border-radius: 12px;
}

.log-item-time {
  font-size: 14px;
  color: #909399;
}

.log-item-content {
  margin-top: 12px;
}

.log-description {
  font-size: 14px;
  line-height: 1.6;
  color: #606266;
  margin: 0 0 12px 0;
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
}

.log-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
  color: #909399;
}

.log-ip {
  background: #f0f9ff;
  padding: 4px 12px;
  border-radius: 12px;
}

.log-user-agent {
  background: #f6ffed;
  padding: 4px 12px;
  border-radius: 12px;
  max-width: 400px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 日志级别样式 */
.log-level-info {
  border-left: 4px solid #91d5ff;
}

.log-level-warning {
  border-left: 4px solid #faad14;
}

.log-level-error {
  border-left: 4px solid #f5222d;
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
.log-pagination {
  padding: 20px 0;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  border-top: 1px solid #e6f7ff;
  margin-top: 24px;
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

/* 日志详情弹窗样式 */
.log-detail-dialog :deep(.el-dialog__header) {
  background: linear-gradient(135deg, #91d5ff 0%, #b37feb 100%);
  padding: 24px;
  border-radius: 16px 16px 0 0;
}

.log-detail-dialog :deep(.el-dialog__title) {
  font-size: 20px;
  font-weight: 600;
  color: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
}

.log-detail-dialog :deep(.el-dialog__body) {
  padding: 32px 24px;
  background: #f6ffed;
  max-height: 600px;
  overflow-y: auto;
}

.log-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-start;
}

.detail-label {
  font-weight: 600;
  font-size: 14px;
  color: #597ef7;
  min-width: 100px;
}

.detail-value {
  flex: 1;
  font-size: 14px;
  line-height: 1.5;
  color: #606266;
}

.detail-description {
  white-space: pre-wrap;
  background: white;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #e6f7ff;
}

.detail-user-agent {
  white-space: pre-wrap;
  background: white;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #e6f7ff;
  font-family: monospace;
  font-size: 12px;
}

.log-detail-dialog :deep(.el-dialog__footer) {
  background: #f6ffed;
  padding: 24px;
  border-radius: 0 0 16px 16px;
  border-top: 2px solid #d9f7be;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .filter-row {
    flex-wrap: wrap;
  }
  
  .filter-item {
    flex: 1;
    min-width: calc(50% - 8px);
  }
}

@media (max-width: 768px) {
  .log-management-container {
    padding: 10px;
  }
  
  .log-management-header {
    flex-direction: column;
    gap: 16px;
    padding: 16px;
  }
  
  .log-management-title {
    font-size: 20px;
  }
  
  .filter-item {
    min-width: 100%;
  }
  
  .log-stats {
    padding: 16px;
  }
  
  .chart-container {
    height: 250px;
  }
  
  .log-list {
    padding: 16px;
  }
  
  .log-item {
    padding: 16px;
  }
  
  .log-meta {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
