<template>
  <div class="system-monitoring-container">
    <div class="monitoring-header">
      <div class="title-container">
        <h2 class="monitoring-title">
          <el-icon><Monitor /></el-icon>
          <span class="title-text">系统状态监控</span>
        </h2>
      </div>
      <div class="header-actions">
        <div class="auto-refresh-controls">
          <div class="auto-refresh-wrapper" :class="{ 'auto-refresh-active': autoRefresh }">
            <el-checkbox v-model="autoRefresh" @change="toggleAutoRefresh" size="large" class="auto-refresh-checkbox">
              自动刷新
            </el-checkbox>
            <div class="auto-refresh-indicator" v-if="autoRefresh">
              <div class="refresh-dot"></div>
              <span class="refresh-text">每10秒</span>
            </div>
          </div>
        </div>
        <el-button 
          type="primary" 
          size="large"
          @click="collectData"
          :loading="collecting"
          class="collect-btn"
        >
          <el-icon><Monitor /></el-icon>
          手动收集
        </el-button>
        <el-button 
          type="warning" 
          size="large"
          @click="cleanOldData"
          :loading="cleaning"
          class="clean-btn"
        >
          <el-icon><Delete /></el-icon>
          清理旧数据
        </el-button>
      </div>
    </div>
    
    <!-- 监控概览卡片 -->
    <el-card shadow="hover" class="overview-card">
      <div class="overview-grid">
        <div class="overview-item cpu-item">
          <div class="item-header">
            <el-icon><Monitor /></el-icon>
            <span>CPU使用率</span>
          </div>
          <div class="item-value">{{ latestData?.cpu_usage || 0 }}%</div>
          <div class="item-status" :class="getStatusClass('cpu', latestData?.cpu_usage || 0)">
            {{ getStatusText('cpu', latestData?.cpu_usage || 0) }}
          </div>
        </div>
        
        <div class="overview-item memory-item">
          <div class="item-header">
            <el-icon><Monitor /></el-icon>
            <span>内存使用率</span>
          </div>
          <div class="item-value">{{ latestData?.memory_usage || 0 }}%</div>
          <div class="item-status" :class="getStatusClass('memory', latestData?.memory_usage || 0)">
            {{ getStatusText('memory', latestData?.memory_usage || 0) }}
          </div>
        </div>
        
        <div class="overview-item disk-item">
          <div class="item-header">
            <el-icon><Monitor /></el-icon>
            <span>磁盘使用率</span>
          </div>
          <div class="item-value">{{ latestData?.disk_usage || 0 }}%</div>
          <div class="item-status" :class="getStatusClass('disk', latestData?.disk_usage || 0)">
            {{ getStatusText('disk', latestData?.disk_usage || 0) }}
          </div>
        </div>
        
        <div class="overview-item network-item">
          <div class="item-header">
            <el-icon><Monitor /></el-icon>
            <span>网络流量</span>
          </div>
          <div class="item-value">
            <div class="network-values">
              <span>入: {{ formatBytes(latestData?.network_in || 0) }}</span>
              <span>出: {{ formatBytes(latestData?.network_out || 0) }}</span>
            </div>
          </div>
          <div class="item-status normal">正常</div>
        </div>
        
        <div class="overview-item process-item">
          <div class="item-header">
            <el-icon><Monitor /></el-icon>
            <span>进程数量</span>
          </div>
          <div class="item-value">{{ latestData?.process_count || 0 }}</div>
          <div class="item-status normal">正常</div>
        </div>
        
        <div class="overview-item connection-item">
          <div class="item-header">
            <el-icon><Monitor /></el-icon>
            <span>活跃连接</span>
          </div>
          <div class="item-value">{{ latestData?.active_connections || 0 }}</div>
          <div class="item-status normal">正常</div>
        </div>
        
        <div class="overview-item user-item">
          <div class="item-header">
            <el-icon><Monitor /></el-icon>
            <span>操作用户</span>
          </div>
          <div class="item-value">{{ latestData?.username || 'N/A' }}</div>
          <div class="item-status normal">正常</div>
        </div>
        
        <div class="overview-item ip-item">
          <div class="item-header">
            <el-icon><Monitor /></el-icon>
            <span>IP地址</span>
          </div>
          <div class="item-value">{{ latestData?.ip_address || 'N/A' }}</div>
          <div class="item-status normal">正常</div>
        </div>
        
        <!-- 用户行为指标 -->
        <div class="overview-item user-activity-item">
          <div class="item-header">
            <el-icon><User /></el-icon>
            <span>活跃用户</span>
          </div>
          <div class="item-value">{{ userActivityData?.activeUsers || 0 }}</div>
          <div class="item-status normal">正常</div>
        </div>
        
        <div class="overview-item request-item">
          <div class="item-header">
            <el-icon><Connection /></el-icon>
            <span>请求次数</span>
          </div>
          <div class="item-value">{{ userActivityData?.requestCount || 0 }}</div>
          <div class="item-status normal">正常</div>
        </div>
      </div>
    </el-card>
    
    <!-- 用户行为监控卡片 -->
    <el-card shadow="hover" class="user-activity-card">
      <div class="user-activity-header">
        <h3 class="user-activity-title">
          <el-icon><User /></el-icon>
          用户行为监控
        </h3>
      </div>
      <div class="user-activity-content">
        <div class="activity-chart-container">
          <div ref="activityChartRef" class="user-activity-chart"></div>
        </div>
      </div>
    </el-card>
    
    <!-- 监控图表 -->
    <el-card shadow="hover" class="charts-card">
      <div class="charts-grid">
        <div class="chart-item">
          <h3 class="chart-title">
            <el-icon><Monitor /></el-icon>
            CPU使用率趋势
          </h3>
          <div class="chart-container">
            <div ref="cpuChartRef" class="monitoring-chart"></div>
          </div>
        </div>
        
        <div class="chart-item">
          <h3 class="chart-title">
            <el-icon><Monitor /></el-icon>
            内存使用率趋势
          </h3>
          <div class="chart-container">
            <div ref="memoryChartRef" class="monitoring-chart"></div>
          </div>
        </div>
        
        <div class="chart-item">
          <h3 class="chart-title">
            <el-icon><Monitor /></el-icon>
            磁盘使用率趋势
          </h3>
          <div class="chart-container">
            <div ref="diskChartRef" class="monitoring-chart"></div>
          </div>
        </div>
        
        <div class="chart-item">
          <h3 class="chart-title">
            <el-icon><Monitor /></el-icon>
            网络流量趋势
          </h3>
          <div class="chart-container">
            <div ref="networkChartRef" class="monitoring-chart"></div>
          </div>
        </div>
      </div>
    </el-card>
    
    <!-- 监控数据列表 -->
    <el-card shadow="hover" class="data-list-card">
      <div class="data-list-header">
        <h3 class="data-list-title">
          <el-icon><Monitor /></el-icon>
          监控数据记录
        </h3>
        <div class="data-list-actions">
          <el-select
            v-model="timeRange"
            placeholder="时间范围"
            size="large"
            @change="fetchMonitoringData"
            class="time-range-select"
          >
            <el-option label="最近1小时" value="1h" />
            <el-option label="最近6小时" value="6h" />
            <el-option label="最近24小时" value="24h" />
            <el-option label="最近7天" value="7d" />
          </el-select>
        </div>
      </div>
      
      <div class="data-list">
        <!-- 数据列表 -->
        <div class="monitoring-items">
          <div 
            v-for="item in monitoringData" 
            :key="item.id"
            class="monitoring-item"
          >
            <div class="item-meta">
              <span class="item-time">{{ formatDate(item.created_at) }}</span>
            </div>
            <div class="item-details">
              <div class="detail-row">
                <span class="detail-label">CPU:</span>
                <span class="detail-value">{{ item.cpu_usage }}%</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">内存:</span>
                <span class="detail-value">{{ item.memory_usage }}%</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">磁盘:</span>
                <span class="detail-value">{{ item.disk_usage }}%</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">网络:</span>
                <span class="detail-value">
                  入: {{ formatBytes(item.network_in) }}, 
                  出: {{ formatBytes(item.network_out) }}
                </span>
              </div>
              <div class="detail-row">
                <span class="detail-label">进程:</span>
                <span class="detail-value">{{ item.process_count }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">连接:</span>
                <span class="detail-value">{{ item.active_connections }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">用户:</span>
                <span class="detail-value">{{ item.username || 'N/A' }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">IP地址:</span>
                <span class="detail-value">{{ item.ip_address || 'N/A' }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">MAC地址:</span>
                <span class="detail-value">{{ item.mac_address || 'N/A' }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 空状态 -->
        <el-empty 
          v-if="!loading && monitoringData.length === 0"
          description="暂无监控数据"
          class="empty-state"
        >
          <template #image>
            <el-icon class="empty-icon"><Monitor /></el-icon>
          </template>
          <el-button type="primary" @click="collectData">手动收集数据</el-button>
        </el-empty>
        
        <!-- 加载状态 -->
        <div v-if="loading" class="loading-state">
          <el-skeleton :rows="5" animated />
        </div>
      </div>
      
      <!-- 分页 -->
      <div class="data-pagination">
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage, ElNotification, ElMessageBox } from 'element-plus'
import { Monitor, Refresh, Delete, User, Connection } from '@element-plus/icons-vue'
import * as echarts from 'echarts'

// 状态管理
const loading = ref(false)
const collecting = ref(false)
const cleaning = ref(false)
const latestData = ref(null)
const monitoringData = ref([])
const userActivityData = ref({
  activeUsers: 0,
  requestCount: 0,
  recentActivities: []
})
const timeRange = ref('24h')
const autoRefresh = ref(true) // 默认启用自动刷新
const refreshInterval = ref(10000) // 默认10秒
let refreshTimer = null

// 分页状态
const pagination = ref({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

// 图表引用
const cpuChartRef = ref(null)
const memoryChartRef = ref(null)
const diskChartRef = ref(null)
const networkChartRef = ref(null)
const activityChartRef = ref(null)

// ECharts实例
let cpuChart = null
let memoryChart = null
let diskChart = null
let networkChart = null
let activityChart = null

// 图表配置
const cpuChartOption = ref({})
const memoryChartOption = ref({})
const diskChartOption = ref({})
const networkChartOption = ref({})

// 获取状态类名
const getStatusClass = (type, value) => {
  switch (type) {
    case 'cpu':
    case 'memory':
    case 'disk':
      if (value < 60) return 'normal'
      if (value < 80) return 'warning'
      return 'danger'
    default:
      return 'normal'
  }
}

// 获取状态文本
const getStatusText = (type, value) => {
  switch (type) {
    case 'cpu':
    case 'memory':
    case 'disk':
      if (value < 60) return '正常'
      if (value < 80) return '警告'
      return '危险'
    default:
      return '正常'
  }
}

// 格式化字节
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 格式化日期（完整格式）
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

// 格式化日期（图表标签用，短格式）
const formatDateShort = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 刷新监控数据
const refreshMonitoringData = () => {
  pagination.value.currentPage = 1
  fetchLatestData()
  fetchMonitoringData()
}

// 获取最新监控数据
const fetchLatestData = async () => {
  try {
    const response = await monitoringAPI.getLatestMonitoringData()
    if (response.success) {
      latestData.value = response.data
    }
  } catch (error) {
    console.error('获取最新监控数据失败:', error)
    ElMessage.error('获取最新监控数据失败')
  }
}

// 获取监控数据列表
const fetchMonitoringData = async () => {
  loading.value = true
  try {
    const response = await monitoringAPI.getMonitoringData({
      page: pagination.value.currentPage,
      limit: pagination.value.pageSize
    })
    
    if (response.success) {
      monitoringData.value = response.data.data
      pagination.value.total = response.data.pagination.total
      updateCharts()
    } else {
      ElMessage.error('获取监控数据失败')
    }
  } catch (error) {
    console.error('获取监控数据失败:', error)
    ElMessage.error('获取监控数据失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 手动收集监控数据
const collectData = async () => {
  collecting.value = true
  try {
    const response = await monitoringAPI.collectMonitoringData()
    if (response.success) {
      ElMessage.success('监控数据收集成功')
      fetchLatestData()
      fetchMonitoringData()
    } else {
      ElMessage.error('监控数据收集失败')
    }
  } catch (error) {
    console.error('收集监控数据失败:', error)
    ElMessage.error('收集监控数据失败，请稍后重试')
  } finally {
    collecting.value = false
  }
}

// 清理旧监控数据
const cleanOldData = async () => {
  try {
    const { value: days } = await ElMessageBox.prompt(
      '请输入要保留的监控数据天数：',
      '清理旧数据',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPattern: /^\d+$/,
        inputErrorMessage: '请输入有效的天数',
        inputValue: '7'
      }
    )
    
    cleaning.value = true
    const response = await monitoringAPI.cleanOldMonitoringData({
      days: parseInt(days)
    })
    
    if (response.success) {
      ElMessage.success(response.message)
      fetchMonitoringData()
    } else {
      ElMessage.error('清理旧监控数据失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('清理旧监控数据错误:', error)
      ElMessage.error('清理旧监控数据失败，请稍后重试')
    }
  } finally {
    cleaning.value = false
  }
}

// 初始化图表
const initCharts = () => {
  if (cpuChartRef.value) {
    cpuChart = echarts.init(cpuChartRef.value)
  }
  if (memoryChartRef.value) {
    memoryChart = echarts.init(memoryChartRef.value)
  }
  if (diskChartRef.value) {
    diskChart = echarts.init(diskChartRef.value)
  }
  if (networkChartRef.value) {
    networkChart = echarts.init(networkChartRef.value)
  }
  if (activityChartRef.value) {
    activityChart = echarts.init(activityChartRef.value)
    initActivityChart()
  }
}

// 初始化用户行为图表
const initActivityChart = () => {
  if (!activityChart) return
  
  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: function(params) {
        let result = params[0].name + '<br/>'
        params.forEach(param => {
          result += param.marker + param.seriesName + ': ' + param.value + '<br/>'
        })
        return result
      }
    },
    legend: {
      data: ['活跃用户', '请求次数']
    },
    xAxis: {
      type: 'category',
      data: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00']
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '活跃用户',
        data: [5, 8, 12, 20, 25, 30, 22, 15],
        type: 'line',
        smooth: true,
        lineStyle: {
          color: '#52c41a'
        }
      },
      {
        name: '请求次数',
        data: [100, 150, 200, 350, 400, 450, 380, 250],
        type: 'line',
        smooth: true,
        lineStyle: {
          color: '#91d5ff'
        }
      }
    ]
  }
  
  activityChart.setOption(option)
}

// 更新图表
const updateCharts = () => {
  if (monitoringData.value.length === 0) return
  
  const data = monitoringData.value.slice().reverse()
  const times = data.map(item => formatDateShort(item.created_at))
  
  // CPU使用率图表
  const cpuOption = {
    tooltip: {
      trigger: 'axis',
      formatter: '{b}<br/>CPU使用率: {c}%'
    },
    xAxis: {
      type: 'category',
      data: times,
      axisLabel: {
        rotate: 45,
        fontSize: 10
      }
    },
    yAxis: {
      type: 'value',
      name: '使用率 (%)',
      min: 0,
      max: 100
    },
    series: [{
      data: data.map(item => item.cpu_usage),
      type: 'line',
      smooth: true,
      lineStyle: {
        color: '#91d5ff'
      },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(145, 213, 255, 0.5)' },
          { offset: 1, color: 'rgba(145, 213, 255, 0.1)' }
        ])
      }
    }]
  }
  if (cpuChart) {
    cpuChart.setOption(cpuOption)
  }
  
  // 内存使用率图表
  const memoryOption = {
    tooltip: {
      trigger: 'axis',
      formatter: '{b}<br/>内存使用率: {c}%'
    },
    xAxis: {
      type: 'category',
      data: times,
      axisLabel: {
        rotate: 45,
        fontSize: 10
      }
    },
    yAxis: {
      type: 'value',
      name: '使用率 (%)',
      min: 0,
      max: 100
    },
    series: [{
      data: data.map(item => item.memory_usage),
      type: 'line',
      smooth: true,
      lineStyle: {
        color: '#52c41a'
      },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(82, 196, 26, 0.5)' },
          { offset: 1, color: 'rgba(82, 196, 26, 0.1)' }
        ])
      }
    }]
  }
  if (memoryChart) {
    memoryChart.setOption(memoryOption)
  }
  
  // 磁盘使用率图表
  const diskOption = {
    tooltip: {
      trigger: 'axis',
      formatter: '{b}<br/>磁盘使用率: {c}%'
    },
    xAxis: {
      type: 'category',
      data: times,
      axisLabel: {
        rotate: 45,
        fontSize: 10
      }
    },
    yAxis: {
      type: 'value',
      name: '使用率 (%)',
      min: 0,
      max: 100
    },
    series: [{
      data: data.map(item => item.disk_usage),
      type: 'line',
      smooth: true,
      lineStyle: {
        color: '#faad14'
      },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(250, 173, 20, 0.5)' },
          { offset: 1, color: 'rgba(250, 173, 20, 0.1)' }
        ])
      }
    }]
  }
  if (diskChart) {
    diskChart.setOption(diskOption)
  }
  
  // 网络流量图表
  const networkOption = {
    tooltip: {
      trigger: 'axis',
      formatter: function(params) {
        let result = params[0].name + '<br/>'
        params.forEach(param => {
          result += param.marker + param.seriesName + ': ' + formatBytes(param.value) + '<br/>'
        })
        return result
      }
    },
    xAxis: {
      type: 'category',
      data: times,
      axisLabel: {
        rotate: 45,
        fontSize: 10
      }
    },
    yAxis: {
      type: 'value',
      name: '流量'
    },
    series: [
      {
        name: '入流量',
        data: data.map(item => item.network_in),
        type: 'line',
        smooth: true,
        lineStyle: {
          color: '#52c41a'
        }
      },
      {
        name: '出流量',
        data: data.map(item => item.network_out),
        type: 'line',
        smooth: true,
        lineStyle: {
          color: '#91d5ff'
        }
      }
    ]
  }
  if (networkChart) {
    networkChart.setOption(networkOption)
  }
}

// 调整图表大小
const resizeCharts = () => {
  cpuChart?.resize()
  memoryChart?.resize()
  diskChart?.resize()
  networkChart?.resize()
  activityChart?.resize()
}

// 销毁图表
const destroyCharts = () => {
  cpuChart?.dispose()
  memoryChart?.dispose()
  diskChart?.dispose()
  networkChart?.dispose()
  activityChart?.dispose()
}

// 分页处理
const handleSizeChange = (size) => {
  pagination.value.pageSize = size
  fetchMonitoringData()
}

const handleCurrentChange = (current) => {
  pagination.value.currentPage = current
  fetchMonitoringData()
}

// 初始加载
onMounted(() => {
  fetchLatestData()
  fetchMonitoringData()
  
  // 初始化自动刷新
  if (autoRefresh.value) {
    startAutoRefresh()
  }
  
  // 初始化图表
  setTimeout(() => {
    initCharts()
    updateCharts()
  }, 100)
  
  // 添加窗口大小变化监听
  window.addEventListener('resize', resizeCharts)
})

// 开始自动刷新
const startAutoRefresh = () => {
  if (autoRefresh.value) {
    stopAutoRefresh() // 先停止之前的定时器
    refreshTimer = setInterval(() => {
      fetchLatestData()
      fetchMonitoringData()
    }, refreshInterval.value)
  }
}

// 停止自动刷新
const stopAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

// 切换自动刷新
const toggleAutoRefresh = () => {
  if (autoRefresh.value) {
    startAutoRefresh()
  } else {
    stopAutoRefresh()
  }
}

// 组件卸载
onUnmounted(() => {
  // 停止自动刷新
  stopAutoRefresh()
  // 销毁图表
  destroyCharts()
  // 移除事件监听
  window.removeEventListener('resize', resizeCharts)
})

// 导入API
import { monitoringAPI } from '../../services/api'
</script>

<style scoped>
.system-monitoring-container {
  padding: 24px;
  background: linear-gradient(135deg, #f0f9ff 0%, #e6f7ff 100%);
  min-height: calc(100vh - 64px);
}

/* 头部样式 */
.monitoring-header {
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

.title-container {
  display: flex;
  align-items: center;
}

.title-text {
  display: block;
  white-space: nowrap;
}

.monitoring-title {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 28px;
  font-weight: 600;
  color: #597ef7;
  margin: 0;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.05);
}

.monitoring-title :deep(.el-icon) {
  font-size: 32px;
  color: #91d5ff;
}

.header-actions {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.auto-refresh-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(145, 213, 255, 0.3);
}

.auto-refresh-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all 0.3s ease;
}

.auto-refresh-active {
  animation: pulse 2s infinite;
}

.auto-refresh-checkbox {
  font-weight: 600;
  font-size: 16px;
  color: #606266;
}

.auto-refresh-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: linear-gradient(135deg, #95de64 0%, #52c41a 100%);
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(149, 222, 100, 0.3);
  animation: slideIn 0.3s ease-out;
}

.refresh-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: white;
  animation: blink 1s infinite;
}

.refresh-text {
  font-size: 14px;
  font-weight: 600;
  color: white;
  white-space: nowrap;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

@keyframes blink {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* 用户行为监控卡片样式 */
.user-activity-card {
  margin-bottom: 24px;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #e6f7ff;
}

.user-activity-header {
  padding: 20px 24px;
  background: #f0f9ff;
  border-bottom: 1px solid #e6f7ff;
}

.user-activity-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 18px;
  font-weight: 600;
  color: #597ef7;
  margin: 0;
}

.user-activity-title :deep(.el-icon) {
  font-size: 20px;
  color: #91d5ff;
}

.user-activity-content {
  padding: 24px;
  background: white;
}

.activity-chart-container {
  height: 300px;
  border-radius: 8px;
  overflow: hidden;
}

.user-activity-chart {
  width: 100%;
  height: 100%;
}

.interval-select {
  min-width: 120px;
}

.refresh-btn,
.collect-btn,
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

.collect-btn {
  background: linear-gradient(135deg, #95de64 0%, #52c41a 100%);
  border: none;
  color: white;
}

.collect-btn:hover {
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

/* 概览卡片样式 */
.overview-card {
  margin-bottom: 24px;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #e6f7ff;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 20px;
  padding: 24px;
  background: #f0f9ff;
}

.overview-item {
  background: white;
  border: 1px solid #e6f7ff;
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.overview-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  border-color: #91d5ff;
}

.item-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 16px;
  font-size: 16px;
  font-weight: 600;
  color: #606266;
}

.item-header :deep(.el-icon) {
  font-size: 20px;
  color: #91d5ff;
}

.item-value {
  font-size: 36px;
  font-weight: 700;
  margin-bottom: 12px;
  color: #597ef7;
}

.network-values {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 14px;
}

.item-status {
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
}

.item-status.normal {
  background: #f6ffed;
  color: #52c41a;
  border: 1px solid #b7eb8f;
}

.item-status.warning {
  background: #fff7e6;
  color: #fa8c16;
  border: 1px solid #ffd591;
}

.item-status.danger {
  background: #fff1f0;
  color: #f5222d;
  border: 1px solid #ffccc7;
}

/* 图表卡片样式 */
.charts-card {
  margin-bottom: 24px;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #e6f7ff;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 24px;
  padding: 24px;
  background: #f0f9ff;
}

.chart-item {
  background: white;
  border: 1px solid #e6f7ff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.chart-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 18px;
  font-weight: 600;
  color: #597ef7;
  margin-bottom: 16px;
}

.chart-title :deep(.el-icon) {
  font-size: 20px;
  color: #91d5ff;
}

.chart-container {
  height: 300px;
  border-radius: 8px;
  overflow: hidden;
}

.monitoring-chart {
  width: 100%;
  height: 100%;
}

/* 数据列表卡片样式 */
.data-list-card {
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #e6f7ff;
}

.data-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 24px;
  background: #f0f9ff;
  border-bottom: 1px solid #e6f7ff;
}

.data-list-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 20px;
  font-weight: 600;
  color: #597ef7;
  margin: 0;
}

.data-list-title :deep(.el-icon) {
  font-size: 24px;
  color: #91d5ff;
}

.data-list-actions {
  display: flex;
  gap: 16px;
  align-items: center;
}

.time-range-select {
  min-width: 160px;
}

.data-list {
  padding: 24px;
}

.monitoring-items {
  margin-bottom: 24px;
}

.monitoring-item {
  background: white;
  border: 1px solid #e6f7ff;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.monitoring-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  border-color: #91d5ff;
}

.item-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e6f7ff;
}

.item-time {
  font-size: 14px;
  color: #909399;
  font-weight: 600;
}

.item-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.detail-label {
  color: #606266;
  font-weight: 600;
}

.detail-value {
  color: #597ef7;
  font-weight: 700;
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
.data-pagination {
  padding: 20px 24px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  border-top: 1px solid #e6f7ff;
  background: #f0f9ff;
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
  .charts-grid {
    grid-template-columns: 1fr;
  }
  
  .overview-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .system-monitoring-container {
    padding: 10px;
  }
  
  .monitoring-header {
    flex-direction: column;
    gap: 16px;
    padding: 16px;
  }
  
  .monitoring-title {
    font-size: 20px;
  }
  
  .overview-grid {
    grid-template-columns: 1fr;
    padding: 16px;
  }
  
  .charts-grid {
    padding: 16px;
  }
  
  .chart-container {
    height: 250px;
  }
  
  .data-list-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
    padding: 16px;
  }
  
  .data-list {
    padding: 16px;
  }
  
  .item-details {
    grid-template-columns: 1fr;
  }
  
  .data-pagination {
    padding: 16px;
  }
}
</style>