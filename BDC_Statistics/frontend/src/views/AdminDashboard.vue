<template>
  <div class="dashboard-container">
    <!-- 登录检查 -->
    <div v-if="!isLoggedIn" class="login-required">
      <div class="login-required-content">
        <el-icon class="login-icon"><User /></el-icon>
        <h3>需要登录</h3>
        <p>请先登录系统以查看工作台数据</p>
        <el-button type="primary" @click="goToLogin">立即登录</el-button>
      </div>
    </div>
    
    <!-- 已登录状态下显示系统管理员工作台内容 -->
    <div v-else>
      <div class="page-header">
        <h2>系统管理员工作台</h2>
        <p>总体数据概览与统计管理，{{ userInfo?.name || '' }}</p>
      </div>

      <!-- 统计卡片 -->
      <div class="stats-cards">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-card class="stat-card">
              <div class="stat-content">
                <div class="stat-icon" style="background: #409EFF;">
                  <el-icon><Document /></el-icon>
                </div>
                <div class="stat-info">
                  <div class="stat-value">{{ dashboardStats.totalCases || 0 }}</div>
                  <div class="stat-label">总收件数（总体统计）</div>
                </div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card class="stat-card">
              <div class="stat-content">
                <div class="stat-icon" style="background: #67C23A;">
                  <el-icon><Calendar /></el-icon>
                </div>
                <div class="stat-info">
                  <div class="stat-value">{{ dashboardStats.monthlyCases || 0 }}</div>
                  <div class="stat-label">本月收件（所有人总计）</div>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <!-- 管理功能快捷入口 -->
      <div class="admin-shortcuts">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>管理功能快捷入口</span>
            </div>
          </template>
          
          <el-row :gutter="20">
            <el-col :span="6">
              <el-button type="primary" icon="Document" @click="goToAllCases" class="shortcut-btn">
                全部收件管理
              </el-button>
            </el-col>
            <el-col :span="6">
              <el-button type="success" icon="User" @click="goToUsers" class="shortcut-btn">
                用户管理
              </el-button>
            </el-col>
            <el-col :span="6">
              <el-button type="warning" icon="PieChart" @click="goToStatistics" class="shortcut-btn">
                统计报表
              </el-button>
            </el-col>
          </el-row>
        </el-card>
      </div>

      <!-- 最近收件记录 -->
      <div class="recent-records">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>系统最近收件记录</span>
              <el-button type="primary" text @click="goToAllCases">
                查看全部
              </el-button>
            </div>
          </template>
          
          <el-table :data="recentCases" v-loading="loading" empty-text="暂无收件记录">
            <el-table-column prop="case_number" label="收件编号" width="120" />
            <el-table-column prop="receiver" label="收件人" width="100" />
            <el-table-column prop="case_type" label="收件类型" width="120">
              <template #default="scope">
                <el-tag :type="getCaseTypeTag(scope.row.case_type)">
                  {{ scope.row.case_type }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="case_date" label="收件日期" width="120" />
            <el-table-column prop="case_description" label="案件描述" show-overflow-tooltip />
          </el-table>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script>
import { useRouter } from 'vue-router'
import { computed, ref, onMounted } from 'vue'
import { useStore } from 'vuex'
import { caseAPI } from '../services/api'
// 导入element-plus图标组件
import { User, Document, Calendar } from '@element-plus/icons-vue'

export default {
  name: 'AdminDashboard',
  components: {
    User,
    Document,
    Calendar
  },
  setup() {
    const router = useRouter()
    const store = useStore()
    const loading = ref(false)
    const dashboardStats = ref({
      totalCases: 0,
      monthlyCases: 0
    })
    const recentCases = ref([])

    // 计算属性
    const isLoggedIn = computed(() => store.getters.isAuthenticated)
    const userInfo = computed(() => store.state.user)

    // 方法
    const goToLogin = () => {
      router.push('/login')
    }

    const goToAllCases = () => {
      router.push('/all-cases')
    }

    const goToUsers = () => {
      router.push('/users')
    }

    const goToStatistics = () => {
      router.push('/statistics')
    }

    const getCaseTypeTag = (type) => {
      const typeMap = {
        '一般件': 'primary',
        '开发商': 'success',
        '国资': 'warning',
        '多人分割转让': 'info',
        '其他复杂件': 'danger'
      }
      return typeMap[type] || 'info'
    }

    const loadDashboardStats = async () => {
      loading.value = true
      try {
        // 使用统计API获取准确的统计数据
        const statsResponse = await caseAPI.getStatistics()
        
        // 确保响应数据有效
        if (statsResponse && statsResponse.success) {
          // 获取总收件数
          const totalCases = statsResponse.system_total_cases || statsResponse.total_cases || 0
          
          // 计算本月收件数
          // 从最近六个月的按月统计数据中获取本月的数据
          let monthlyCases = 0
          if (Array.isArray(statsResponse.monthly_case_stats)) {
            const now = new Date()
            const currentMonthStr = now.toISOString().slice(0, 7) // 格式: YYYY-MM
            
            // 查找本月的统计数据
            const currentMonthData = statsResponse.monthly_case_stats.find(item => item.month === currentMonthStr)
            if (currentMonthData && Array.isArray(currentMonthData.data)) {
              // 计算本月所有收件人的总办件量
              monthlyCases = currentMonthData.data.reduce((sum, item) => sum + (item.case_count || 0), 0)
            }
          }
          
          dashboardStats.value = {
            totalCases: totalCases,
            monthlyCases: monthlyCases
          }
        } else {
          // 如果统计API失败，回退到获取所有案件的方式
          const casesResponse = await caseAPI.getAllCases({ pageSize: 10000 })
          // 兼容不同的数据结构
          const cases = Array.isArray(casesResponse) 
            ? casesResponse 
            : Array.isArray(casesResponse.items) 
              ? casesResponse.items 
              : Array.isArray(casesResponse.cases) 
                ? casesResponse.cases 
                : []
          
          // 计算总收件数
          const totalCases = cases.length
          
          // 计算本月收件数
          const now = new Date()
          const currentMonth = now.getMonth()
          const currentYear = now.getFullYear()
          
          const monthlyCases = cases.filter(caseItem => {
            const caseDate = new Date(caseItem.case_date)
            return caseDate.getMonth() === currentMonth && caseDate.getFullYear() === currentYear
          }).length
          
          dashboardStats.value = {
            totalCases: totalCases,
            monthlyCases: monthlyCases
          }
        }
      } catch (error) {
        console.error('加载统计数据失败:', error)
        store.commit('SET_ERROR', '加载统计数据失败，请重试')
        // 错误时设置默认值
        dashboardStats.value = {
          totalCases: 0,
          monthlyCases: 0
        }
      } finally {
        loading.value = false
      }
    }

    const loadRecentCases = async () => {
      try {
        const response = await caseAPI.getAllCases({ pageSize: 10, page: 1 })
        // 兼容不同的数据结构，确保能正确获取案件列表
        recentCases.value = response.items || response.cases || []
      } catch (error) {
        console.error('加载最近案件失败:', error)
      }
    }

    // 生命周期
    onMounted(async () => {
      if (isLoggedIn.value) {
        await Promise.all([
          loadDashboardStats(),
          loadRecentCases()
        ])
      }
    })

    return {
      isLoggedIn,
      userInfo,
      loading,
      dashboardStats,
      recentCases,
      goToLogin,
      goToAllCases,
      goToUsers,
      goToStatistics,
      getCaseTypeTag,
      User,
      Document,
      Calendar
    }
  }
}
</script>

<style scoped>
.dashboard-container {
  padding: 20px;
}

.login-required {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 500px;
}

.login-required-content {
  text-align: center;
  padding: 40px;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.login-icon {
  font-size: 48px;
  color: #409EFF;
  margin-bottom: 20px;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
  color: #333;
}

.page-header p {
  margin: 0;
  color: #606266;
}

.stats-cards {
  margin-bottom: 24px;
}

.stat-card {
  height: 120px;
  display: flex;
  align-items: center;
}

.stat-content {
  display: flex;
  align-items: center;
  width: 100%;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 16px;
  color: #fff;
  font-size: 24px;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 4px;
}

.stat-label {
  color: #909399;
  font-size: 14px;
}

.admin-shortcuts {
  margin-bottom: 24px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.shortcut-btn {
  width: 100%;
  height: 60px;
  font-size: 16px;
}

.recent-records {
  margin-bottom: 24px;
}
</style>
