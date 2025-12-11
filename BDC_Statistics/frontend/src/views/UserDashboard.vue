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
    
    <!-- 已登录状态下显示用户工作台内容 -->
    <div v-else>
      <div class="page-header">
        <h2>工作台</h2>
        <p>欢迎使用不动产登记收件统计系统{{ userInfo?.name ? '，' + userInfo.name : '' }}</p>
      </div>

      <!-- 统计卡片 -->
      <div class="stats-cards">
        <el-row :gutter="20">
          <el-col :span="6">
            <el-card class="stat-card">
              <div class="stat-content">
                <div class="stat-icon" style="background: #409EFF;">
                  <el-icon><Document /></el-icon>
                </div>
                <div class="stat-info">
                  <div class="stat-value" @click="goToMyCases" style="cursor: pointer; color: #409EFF;" title="点击查看我的收件">
                    {{ dashboardStats.totalCases || 0 }}
                  </div>
                  <div class="stat-label" @click="goToMyCases" style="cursor: pointer; color: #409EFF;" title="点击查看我的收件">
                    总收件数
                  </div>
                </div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card class="stat-card">
              <div class="stat-content">
                <div class="stat-icon" style="background: #67C23A;">
                  <el-icon><Calendar /></el-icon>
                </div>
                <div class="stat-info">
                  <div class="stat-value">{{ dashboardStats.monthlyCases || 0 }}</div>
                  <div class="stat-label">本月收件</div>
                </div>
              </div>
            </el-card>
          </el-col>

        </el-row>
      </div>

      <!-- 工作快捷入口 -->
      <div class="work-shortcuts">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>工作快捷入口</span>
            </div>
          </template>
          
          <el-row :gutter="20">
            <el-col :span="6">
              <el-button type="primary" icon="Plus" @click="goToMyCases" class="shortcut-btn">
                我的收件
              </el-button>
            </el-col>
            <!-- 根据用户角色显示不同的快捷按钮 -->
            <el-col :span="6" v-if="userInfo?.role === '开发商'">
              <el-button type="success" icon="OfficeBuilding" @click="goToDeveloperCase" class="shortcut-btn">
                开发商业务
              </el-button>
            </el-col>
            <el-col :span="6" v-else-if="userInfo?.role === '收件人'">
              <el-button type="success" icon="Statistics" @click="goToStatistics" class="shortcut-btn">
                个人统计
              </el-button>
            </el-col>
          </el-row>
        </el-card>
      </div>

      <!-- 最近收件记录 -->
      <div class="recent-cases">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>最近收件记录</span>
              <el-button type="primary" link @click="goToMyCases">
                查看全部
              </el-button>
            </div>
          </template>
          
          <el-table :data="recentCases" v-loading="loading" empty-text="暂无收件记录">
            <el-table-column prop="case_number" label="收件编号" width="120" />
            <el-table-column prop="receiver" label="收件人" width="100" />
            <el-table-column prop="case_type" label="案件类型" width="120">
              <template #default="scope">
                <el-tag :type="getCaseTypeTag(scope.row.case_type)">
                  {{ scope.row.case_type || '一般件' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="assigned_to" label="处理人" width="100" show-overflow-tooltip />
            <el-table-column prop="case_date" label="收件日期" width="120" />
            <el-table-column prop="case_description" label="案件描述" show-overflow-tooltip />
            <el-table-column label="操作" width="80" fixed="right">
              <template #default="scope">
                <el-button link @click="viewCaseDetail(scope.row.id)">查看</el-button>
              </template>
            </el-table-column>
          </el-table>
          
          <!-- 分页组件 -->
          <div class="pagination-container" v-if="pagination.total > 0">
            <el-pagination
              v-model:current-page="pagination.page"
              v-model:page-size="pagination.pageSize"
              :total="pagination.total"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="handlePageSizeChange"
              @current-change="handlePageChange"
            />
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script>
import { useRouter } from 'vue-router'
import { computed, ref, onMounted, onActivated } from 'vue'
import { useStore } from 'vuex'
import { caseAPI } from '../services/api'
// 导入element-plus图标组件
import { User, Document, Calendar } from '@element-plus/icons-vue'

export default {
  name: 'UserDashboard',
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
    // 分页状态，默认显示20条记录，让最近录入记录展示更多数据
    const pagination = ref({
      page: 1,
      pageSize: 20,
      total: 0
    })

    // 计算属性
    const isLoggedIn = computed(() => store.getters.isAuthenticated)
    const userInfo = computed(() => store.state.user)

    // 方法
    const goToLogin = () => {
      router.push('/login')
    }

    const goToMyCases = () => {
      router.push('/cases')
    }

    const goToDeveloperCase = () => {
      router.push('/developer-case')
    }

    const goToStatistics = () => {
      router.push('/statistics')
    }

    const viewCaseDetail = (caseId) => {
      if (userInfo.value?.role === '开发商') {
        router.push({ path: '/developer-case', query: { id: caseId } })
      } else {
        router.push({ path: '/cases', query: { id: caseId } })
      }
    }

    const getCaseTypeTag = (type) => {
      const typeMap = {
        '首次登记': 'primary',
        '转移登记': 'success',
        '抵押登记': 'warning',
        '变更登记': 'info',
        '注销登记': 'danger',
        '其他': 'info'
      }
      return typeMap[type] || 'info'
    }

    // 分页处理函数
    const handlePageChange = (page) => {
      pagination.value.page = page
      loadRecentCases(page, pagination.value.pageSize)
    }

    const handlePageSizeChange = (pageSize) => {
      pagination.value.pageSize = pageSize
      pagination.value.page = 1
      loadRecentCases(1, pageSize)
    }



    const loadDashboardStats = async () => {
      loading.value = true
      try {
        // 使用与统计报表相同的API获取统计数据，确保逻辑一致
        if (!caseAPI || typeof caseAPI.getStatistics !== 'function') {
          throw new Error('API服务不可用')
        }
        
        // 构建与统计报表相同的请求参数，确保返回数据一致
        // 当没有选择年份时，传递timeFilter=all获取所有数据
        const requestParams = {
          timeFilter: 'all' // 获取所有数据，与统计报表默认逻辑一致
        }
        
        // 直接调用统计API获取数据，与统计报表使用相同参数
        const response = await caseAPI.getStatistics(requestParams)
        
        // 计算本月收件数 - 回退逻辑，使用getMyCases获取数据计算月度收件数
        const now = new Date()
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()
        
        const params = {
          page: 1,
          limit: 1000 // 获取足够多的案件数据用于统计
        }
        
        const casesResponse = await caseAPI.getMyCases(params)
        const cases = casesResponse.cases || []
        
        const monthlyCases = cases.filter(caseItem => {
          const caseDate = new Date(caseItem.case_date)
          return caseDate.getMonth() === currentMonth && caseDate.getFullYear() === currentYear
        }).length
        
        dashboardStats.value = {
          // 使用统计API返回的总收件数，与统计报表保持一致
          totalCases: response.totalCount || response.total_count || 0,
          monthlyCases: monthlyCases
        }
      } catch (error) {
        console.error('加载统计数据失败:', error)
        // 设置默认值，避免页面显示错误
        dashboardStats.value = {
          totalCases: 0,
          monthlyCases: 0
        }
      } finally {
        loading.value = false
      }
    }

    const loadRecentCases = async (page = pagination.value.page, pageSize = pagination.value.pageSize) => {
      try {
        // 构建请求参数
        const params = {
          limit: pageSize,
          page: page,
          pageSize: pageSize,
          sortBy: 'created_at',
          sortOrder: 'desc'
        }
        
        // 根据用户角色调用不同API
        let response;
        if (userInfo.value?.role === '管理员') {
          // 管理员查看所有最新案件
          response = await caseAPI.getAllCases(params)
        } else if (userInfo.value?.id) {
          // 根据用户角色设置viewMode参数
          if (userInfo.value?.role === '开发商') {
            // 开发商查看自己提交的案件
            params.viewMode = 'submitted'
          } else {
            // 收件人查看分配给自己的案件
            params.viewMode = 'received'
          }
          response = await caseAPI.getMyCases(params)
        } else {
          // 未登录或信息不完整时不加载数据
          recentCases.value = []
          pagination.value.total = 0
          return
        }
        
        // 处理不同格式的返回数据
        // 直接使用response，因为api.js的响应拦截器已经处理了response.data
        if (response.cases) {
          // getMyCases或getAllCases的返回格式，包含cases数组
          recentCases.value = Array.isArray(response.cases) ? response.cases : []
          // 更新分页状态
          pagination.value.total = response.total || 0
          pagination.value.page = response.page || page
          pagination.value.pageSize = response.pageSize || pageSize
        } else if (Array.isArray(response)) {
          // 直接返回数组的情况
          recentCases.value = response
          pagination.value.total = response.length
        } else if (response.items) {
          // 包含items数组的返回格式
          recentCases.value = Array.isArray(response.items) ? response.items : []
          pagination.value.total = response.total || 0
        } else {
          recentCases.value = []
          pagination.value.total = 0
        }
      } catch (error) {
        console.error('加载最近案件失败:', error)
        recentCases.value = []
        pagination.value.total = 0
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
    
    // 当组件被激活时重新加载数据
    onActivated(async () => {
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
      pagination,
      goToLogin,
      goToMyCases,
      goToDeveloperCase,
      goToStatistics,
      viewCaseDetail,
      getCaseTypeTag,
      handlePageChange,
      handlePageSizeChange,
      // 图标组件
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

.work-shortcuts {
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

.recent-cases {
  margin-bottom: 24px;
}

.pagination-container {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
}
</style>
