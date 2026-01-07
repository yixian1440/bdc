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
          
          // 直接使用后端计算的本月收件数（已过滤角色）
          const monthlyCases = statsResponse.monthly_total_cases || 0
          
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

.page-header {
  margin-bottom: 32px;
  padding: 24px;
  background: linear-gradient(135deg, #f0f9ff 0%, #e6f7ff 100%);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid #e6f7ff;
}

.page-header h2 {
  margin: 0 0 8px 0;
  font-size: 28px;
  color: #597ef7;
  font-weight: 600;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.05);
}

.page-header p {
  margin: 0;
  color: #91d5ff;
  font-size: 16px;
}

.stats-cards {
  margin-bottom: 32px;
}

.stat-card {
  height: 140px;
  display: flex;
  align-items: center;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid #e6f7ff;
  transition: all 0.3s ease;
}

.stat-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
  border-color: #91d5ff;
}

.stat-content {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0 24px;
}

.stat-icon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 20px;
  color: white;
  font-size: 28px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #36cfc9;
  margin-bottom: 8px;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.05);
}

.stat-label {
  color: #597ef7;
  font-size: 16px;
  font-weight: 500;
}

.admin-shortcuts {
  margin-bottom: 32px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e6f7ff;
  background-color: #f0f9ff;
  border-radius: 12px 12px 0 0;
}

.card-header span {
  font-size: 16px;
  font-weight: 600;
  color: #597ef7;
}

.shortcut-btn {
  width: 100%;
  height: 64px;
  font-size: 16px;
  border-radius: 8px;
  transition: all 0.3s ease;
  background: linear-gradient(135deg, #91d5ff 0%, #b37feb 100%);
  border: none;
  color: white;
}

.shortcut-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  background: linear-gradient(135deg, #69c0ff 0%, #9254de 100%);
}

.recent-records {
  margin-bottom: 32px;
}
</style>
