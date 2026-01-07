<template>
  <div class="statistics-container">
    <!-- 
      统计分析页面
      采用模板方法模式设计，将复杂的统计页面分解为多个独立的图表组件
      使用组合式函数管理状态和数据处理逻辑
    -->
    <!-- 空数据状态显示 -->
    <div v-if="isLoading" class="loading-state">
      <el-spinner type="primary" :size="48"></el-spinner>
      <p>加载中...</p>
    </div>

    <!-- 主要内容区域 -->
    <template v-else>
      <!-- 时间筛选控件 -->
      <div class="filter-section">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="选择年份">
              <el-select 
                v-model="timeFilterState.year" 
                placeholder="选择年份"
                @change="handleTimeFilterChange"
              >
                <el-option 
                  v-for="year in yearOptions" 
                  :key="year.value" 
                  :label="year.label" 
                  :value="year.value"
                ></el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="选择月份">
              <el-select 
                v-model="timeFilterState.month" 
                placeholder="选择月份"
                @change="handleTimeFilterChange"
              >
                <el-option 
                  v-for="month in monthOptions" 
                  :key="month.value" 
                  :label="month.label" 
                  :value="month.value"
                ></el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="选择日期">
              <el-date-picker 
                v-model="timeFilterState.day" 
                type="date" 
                placeholder="选择日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                @change="handleTimeFilterChange"
              ></el-date-picker>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20" style="margin-top: 16px;">
          <el-col :span="24" style="text-align: right;">
            <el-button type="primary" plain @click="resetTimeFilter" style="border-color: #91d5ff; color: #1890ff; background-color: #e6f7ff;">
              <el-icon><Refresh /></el-icon>
              重置筛选器
            </el-button>
          </el-col>
        </el-row>
      </div>

      <!-- 欢迎信息 -->
      <div class="welcome-section">
        <h2>欢迎，{{ currentUser || '用户' }}</h2>
        <p>以下是您的{{ userRole || '角色' }}统计数据</p>
      </div>

      <!-- 总览统计卡片 - 显示系统总收件数和当前在线用户数 -->
      <el-row :gutter="20" class="overview-section">
        <el-col :span="6">
          <el-card class="overview-card">
            <div class="overview-content">
              <div class="overview-number">{{ statistics.systemTotalCases || 0 }}</div>
              <div class="overview-label">系统总收件数</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6" v-if="userRole === '管理员'">
          <el-card class="overview-card">
            <div class="overview-content">
              <div class="overview-number">{{ statistics.onlineUserCount || 0 }}</div>
              <div class="overview-label">当前在线用户数</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6" v-else>
          <el-card class="overview-card">
            <div class="overview-content">
              <div class="overview-number">{{ statistics.personalTotalCases || 0 }}</div>
              <div class="overview-label">个人总收件数</div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 按月统计收件数 - 所有相关角色都能看到 -->
      <el-row :gutter="20" class="tables-section" v-if="['管理员', '收件人', '国资企业专窗'].includes(userRole)">
        <el-col :span="24">
          <el-card class="table-card">
            <div slot="header" class="card-header">
              <span>按月统计收件数（最近六个月）</span>
            </div>
            <div v-for="monthItem in monthlyCaseStats || []" :key="monthItem.month" class="month-section">
              <h4>{{ monthItem.month }}</h4>
              <el-table :data="monthItem.data" style="width: 100%" size="small">
                <el-table-column prop="receiver_name" label="收件人" width="180"></el-table-column>
                <el-table-column prop="case_count" label="办件量" width="180"></el-table-column>
              </el-table>
              <div class="month-total" v-if="monthItem.data.length > 0">
                总计：{{ monthItem.data.reduce((sum, item) => sum + item.case_count, 0) }} 件
              </div>
              <hr v-if="monthlyCaseStats.indexOf(monthItem) < monthlyCaseStats.length - 1" class="month-divider">
            </div>
            <div v-if="(monthlyCaseStats || []).length === 0" class="no-data">
              暂无数据
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 管理员统计视图 -->
      <template v-if="userRole === '管理员'">
        <!-- 统计图表区域 -->
        <el-row :gutter="20" class="charts-section">
          <!-- 案件类型统计图表 -->
          <el-col :span="12">
            <el-card class="chart-card">
              <div slot="header" class="card-header">
                <span>案件类型统计</span>
              </div>
              <TypeChart 
                :data="statistics.typeData" 
                :loading="isChartLoading"
                :error="chartErrors.type"
              />
            </el-card>
          </el-col>

          <!-- 收件人统计图表 -->
          <el-col :span="12">
            <el-card class="chart-card">
              <div slot="header" class="card-header">
                <span>收件人统计</span>
              </div>
              <ReceiverChart 
                :receiver-ranking="{ '收件人': statistics.receiverData }" 
                :active-role="'收件人'"
                :loading="isChartLoading"
                :error="chartErrors.receiver"
              />
            </el-card>
          </el-col>
        </el-row>

        <!-- 详细统计表格 -->
        <el-row :gutter="20" class="tables-section">
          <!-- 案件类型详细统计分析 -->
          <el-col :span="12">
            <el-card class="table-card">
              <div slot="header" class="card-header">
                <span>案件类型详细统计分析</span>
              </div>
              <el-table :data="statistics.typeDetailData || []" style="width: 100%">
                <el-table-column prop="typeName" label="案件类型" width="180"></el-table-column>
                <el-table-column prop="count" label="数量" width="180"></el-table-column>
                <el-table-column prop="percentage" label="占比" width="180"></el-table-column>
              </el-table>
            </el-card>
          </el-col>

          <!-- 开发商详细统计分析 -->
          <el-col :span="12">
            <el-card class="table-card">
              <div slot="header" class="card-header">
                <span>开发商详细统计分析</span>
              </div>
              <el-table :data="statistics.developer_data || []" style="width: 100%">
                <el-table-column prop="developerName" label="开发商项目" width="200"></el-table-column>
                <el-table-column prop="count" label="案件数量" width="180"></el-table-column>
                <el-table-column prop="percentage" label="占比" width="180"></el-table-column>
              </el-table>
            </el-card>
          </el-col>
        </el-row>
      </template>

      <!-- 收件人统计视图 -->
      <template v-else-if="userRole === '收件人' || userRole === '国资企业专窗'">
        <!-- 案件类型统计图表 -->
        <el-row :gutter="20" class="charts-section">
          <el-col :span="12">
            <el-card class="chart-card">
              <div slot="header" class="card-header">
                <span>收件类型占比</span>
              </div>
              <TypeChart 
                :data="statistics.typeData" 
                :loading="isChartLoading"
                :error="chartErrors.type"
              />
            </el-card>
          </el-col>
        </el-row>
        
        <!-- 收件人统计图表 -->
        <el-row :gutter="20" class="charts-section">
          <el-col :span="12">
            <el-card class="chart-card">
              <div slot="header" class="card-header">
                <span>收件人统计</span>
              </div>
              <ReceiverChart 
                :receiver-ranking="{ '收件人': statistics.receiverData }" 
                :active-role="'收件人'"
                :loading="isChartLoading"
                :error="chartErrors.receiver"
              />
            </el-card>
          </el-col>
        </el-row>

        <!-- 我的案件类型详细统计 -->
        <el-row :gutter="20" class="tables-section">
          <el-col :span="12">
            <el-card class="table-card">
              <div slot="header" class="card-header">
                <span>我的案件类型详细统计</span>
              </div>
              <el-table :data="statistics.typeDetailData || []" style="width: 100%">
                <el-table-column prop="typeName" label="案件类型" width="180"></el-table-column>
                <el-table-column prop="count" label="数量" width="180"></el-table-column>
                <el-table-column prop="percentage" label="占比" width="180"></el-table-column>
              </el-table>
            </el-card>
          </el-col>
          
          <!-- 开发商详细统计分析 -->
          <el-col :span="12">
            <el-card class="table-card">
              <div slot="header" class="card-header">
                <span>开发商详细统计分析</span>
              </div>
              <el-table :data="statistics.developer_data || []" style="width: 100%">
                <el-table-column prop="developerName" label="开发商项目" width="200"></el-table-column>
                <el-table-column prop="count" label="案件数量" width="180"></el-table-column>
                <el-table-column prop="percentage" label="占比" width="180"></el-table-column>
              </el-table>
            </el-card>
          </el-col>
        </el-row>
      </template>

      <!-- 开发商统计视图 -->
      <template v-else-if="userRole === '开发商'">
        <!-- 处理人统计图表 -->
        <el-row :gutter="20" class="charts-section">
          <el-col :span="12">
            <el-card class="chart-card">
              <div slot="header" class="card-header">
                <span>处理人统计</span>
              </div>
              <ReceiverChart 
                :receiver-ranking="receiverRanking" 
                :active-role="'处理人'"
                :loading="isChartLoading"
                :error="chartErrors.receiver"
              />
            </el-card>
          </el-col>
        </el-row>

        <!-- 开发商详细统计分析 -->
        <el-row :gutter="20" class="tables-section">
          <el-col :span="24">
            <el-card class="table-card">
              <div slot="header" class="card-header">
                <span>开发商详细统计分析</span>
              </div>
              <el-table :data="statistics.developer_data || []" style="width: 100%">
                <el-table-column prop="developerName" label="开发商项目" width="200"></el-table-column>
                <el-table-column prop="count" label="案件数量" width="180"></el-table-column>
                <el-table-column prop="percentage" label="占比" width="180"></el-table-column>
              </el-table>
            </el-card>
          </el-col>
        </el-row>
      </template>

      <!-- 国资企业专窗统计视图 -->
      <template v-else-if="userRole === '国资企业专窗'">
        <!-- 国资企业案件类型统计 -->
        <el-row :gutter="20" class="charts-section">
          <el-col :span="12">
            <el-card class="chart-card">
              <div slot="header" class="card-header">
                <span>我的案件类型统计</span>
              </div>
              <TypeChart 
                :data="statistics.typeData" 
                :loading="isChartLoading"
                :error="chartErrors.type"
              />
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card class="chart-card">
              <div slot="header" class="card-header">
                <span>我的案件处理进度</span>
              </div>
              <TypeChart 
                :data="statistics.typeData" 
                :loading="isChartLoading"
                :error="chartErrors.type"
              />
            </el-card>
          </el-col>
        </el-row>

        <!-- 国资企业案件详细统计 -->
        <el-row :gutter="20" class="tables-section">
          <el-col :span="24">
            <el-card class="table-card">
              <div slot="header" class="card-header">
                <span>我的案件详细统计</span>
              </div>
              <el-table :data="statistics.typeDetailData || []" style="width: 100%">
                <el-table-column prop="typeName" label="案件类型" width="180"></el-table-column>
                <el-table-column prop="count" label="数量" width="180"></el-table-column>
                <el-table-column prop="percentage" label="占比" width="180"></el-table-column>
              </el-table>
            </el-card>
          </el-col>
        </el-row>
      </template>

      <!-- 错误提示 -->
      <el-notification
        v-for="(error, key) in globalErrors"
        :key="key"
        title="错误提示"
        :message="error"
        type="error"
        :duration="3000"
      ></el-notification>
    </template>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, reactive, computed, watch } from 'vue';
import { useStore } from 'vuex';
import { Refresh } from '@element-plus/icons-vue';

/**
 * 统计分析页面
 * 
 * @description 展示系统的统计数据，包括案件类型统计和收件人统计
 * @extends Vue.Component 使用模板方法模式设计，将复杂的统计页面分解为多个独立组件
 */
// 导入图表组件
/**
 * 图表组件导入
 * TypeChart - 案件类型统计图表组件
 * ReceiverChart - 收件人统计图表组件
 * TrendChart - 趋势图表组件
 */
import TypeChart from './Statistics/components/TypeChart.vue';
import ReceiverChart from './Statistics/components/ReceiverChart.vue';
// 导入组合式函数
/**
 * 组合式函数导入
 * useStatistics - 处理统计数据的组合式函数
 * useChartConfig - 提供图表配置的组合式函数
 */
import { useStatistics } from './Statistics/composables/useStatistics.js';
import { useChartConfig } from './Statistics/composables/useChartConfig.js';

export default {
  name: 'Statistics',
  components: {
      TypeChart,
      ReceiverChart,
      Refresh
    },
  setup() {
    /**
     * @typedef {Object} StatisticsData
 * @property {number} totalCount - 总案件数
 * @property {Array} typeData - 案件类型图表数据
 * @property {Array} receiverData - 收件人图表数据
 * @property {Array} typeDetailData - 案件类型详细统计数据
 * @property {Array} receiverDetailData - 收件人详细统计数据
     */
    
    // 组件挂载状态跟踪
    const isMounted = ref(true);
    
    // 获取Vuex store
    const store = useStore();
    
    // 使用组合式函数获取统计数据和图表配置
    const { 
      statistics, 
      isLoading, 
      error, 
      loadStatistics,
      validateStatisticsData,
      initWebSocketListeners,
      removeWebSocketListeners,
      timeFilterState,
      yearOptions,
      monthOptions,
      receiverRanking,
      monthlyCaseStats
    } = useStatistics();
    
    const { defaultChartColors } = useChartConfig();
    
    // 获取当前用户角色
    const userRole = computed(() => store.getters.userRole || localStorage.getItem('userRole'));
    
    // 获取当前用户名
    const currentUser = computed(() => {
      const user = store.getters.currentUser;
      return user ? user.real_name || user.username : localStorage.getItem('userInfo') ? JSON.parse(localStorage.getItem('userInfo')).real_name : '';
    });

    // 加载状态
    const isChartLoading = ref(false);
    const chartErrors = reactive({
      type: null,
      receiver: null,
      trend: null
    });
    
    const globalErrors = ref([]);
    
    // 角色显示控制
    const canSeeAllData = computed(() => userRole.value === '管理员');
    const canSeeReceiverData = computed(() => ['管理员', '收件人', '国资企业专窗'].includes(userRole.value));
    const canSeeDeveloperData = computed(() => ['管理员', '开发商', '收件人', '国资企业专窗'].includes(userRole.value));

    // 监听错误变化
    watch(() => error.value, (newError) => {
      if (newError) {
        globalErrors.value.push(newError);
      }
    });

    // 组件挂载时加载数据
    /**
     * 组件挂载生命周期钩子
     * 在组件挂载后自动加载统计数据
     */
    onMounted(() => {
      loadStatistics();
      // 初始化WebSocket监听
      initWebSocketListeners();
    });

    onUnmounted(() => {
      // 设置组件为未挂载状态
      isMounted.value = false;
      // 移除WebSocket监听
      removeWebSocketListeners();
    });

    /**
     * 处理时间筛选变化
     * 当年份或月份筛选条件变化时，重新加载统计数据
     * @async
     */
    const handleTimeFilterChange = async () => {
      // 确保组件仍挂载
      if (!isMounted.value) return;
      
      await loadStatistics();
    };

    /**
     * 重置时间筛选器
     * 将所有时间筛选条件重置为空，并重新加载统计数据
     * @async
     */
    const resetTimeFilter = async () => {
      // 确保组件仍挂载
      if (!isMounted.value) return;
      
      // 重置所有时间筛选条件
      timeFilterState.year = '';
      timeFilterState.month = '';
      timeFilterState.day = '';
      
      // 重新加载统计数据
      await loadStatistics();
    };

    return {
    statistics,
    isLoading,
    timeFilterState,
    yearOptions,
    monthOptions,
    handleTimeFilterChange,
    resetTimeFilter,
    isChartLoading,
    chartErrors,
    globalErrors,
    userRole,
    currentUser,
    canSeeAllData,
    canSeeReceiverData,
    canSeeDeveloperData,
    receiverRanking,
    monthlyCaseStats
  };
  }
};
</script>

<style scoped>
.statistics-container {
  padding: 20px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
}

.filter-section {
  margin-bottom: 24px;
  padding: 24px;
  background-color: #f0f9ff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid #e6f7ff;
}

.charts-section {
  margin-bottom: 20px;
}

.overview-section {
  margin-bottom: 20px;
}

.tables-section {
  margin-bottom: 20px;
}

.chart-card,
.table-card,
.overview-card {
  height: 100%;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  border: 1px solid #e6f7ff;
}

.chart-card:hover,
.table-card:hover,
.overview-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
  border-color: #91d5ff;
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

.overview-content {
  text-align: center;
  padding: 32px 0;
  background: linear-gradient(135deg, #e6f7ff 0%, #f0f9ff 100%);
  border-radius: 12px;
  border: 1px solid #91d5ff;
}

.overview-number {
  font-size: 36px;
  font-weight: bold;
  color: #36cfc9;
  margin-bottom: 12px;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.05);
}

.overview-label {
  font-size: 14px;
  color: #597ef7;
  font-weight: 500;
}
    
    /* 按月统计样式 */
    .month-section {
        margin-bottom: 24px;
        padding: 24px;
        background-color: #f6ffed;
        border-radius: 12px;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
        transition: all 0.3s ease;
        border: 1px solid #b7eb8f;
    }
    
    .month-section:hover {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        transform: translateY(-2px);
    }
    
    .month-section h4 {
        margin: 0 0 16px 0;
        color: #52c41a;
        font-size: 18px;
        font-weight: 600;
        padding-bottom: 8px;
        border-bottom: 2px solid #d9f7be;
    }
    
    .month-total {
        margin-top: 16px;
        text-align: right;
        font-weight: bold;
        color: #389e0d;
        font-size: 16px;
        padding: 12px;
        background-color: #f6ffed;
        border-radius: 8px;
        border-left: 4px solid #52c41a;
    }
    
    .month-divider {
        margin: 24px 0;
        border: none;
        border-top: 1px dashed #e0e0e0;
    }
    
    .no-data {
        text-align: center;
        padding: 40px;
        color: #999;
        background-color: #fafafa;
        border-radius: 8px;
        margin: 20px 0;
    }
    
    .welcome-section {
        margin-bottom: 30px;
        padding: 32px;
        background: linear-gradient(135deg, #91d5ff 0%, #b37feb 100%);
        color: white;
        border-radius: 16px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
        text-align: center;
    }
    
    .welcome-section h2 {
        margin: 0 0 12px 0;
        font-size: 28px;
        font-weight: 600;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.05);
    }
    
    .welcome-section p {
        margin: 0;
        font-size: 18px;
        opacity: 0.95;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.05);
    }
</style>