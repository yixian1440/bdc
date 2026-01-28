<template>
  <div class="cases-container">
    <!-- 新增收件模式 -->
    <template v-if="isAddMode">
      <div class="page-header">
        <h2>新增收件</h2>
        <p>请填写收件信息</p>
      </div>
      
      <el-card>
        <el-form :model="newCaseForm" label-width="120px">
          <el-form-item label="案件类型" required>
            <el-select v-model="newCaseForm.caseType" placeholder="请选择案件类型">
              <el-option
                v-for="type in availableCaseTypes"
                :key="type"
                :label="type"
                :value="type"
              />
            </el-select>
          </el-form-item>
          
          <el-form-item label="案件编号">
            <el-input v-model="newCaseForm.case_number" placeholder="留空将自动生成案件编号" />
          </el-form-item>
          
          <el-form-item label="案件日期" required>
            <el-date-picker
              v-model="newCaseForm.case_date"
              type="date"
              placeholder="请选择案件日期"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </el-form-item>
          
          <el-form-item label="案件标题" required>
            <el-input v-model="newCaseForm.title" placeholder="请输入案件标题" />
          </el-form-item>
          
          <el-form-item label="案件描述">
            <el-input
              v-model="newCaseForm.description"
              placeholder="请输入案件描述"
              type="textarea"
              :rows="4"
            />
          </el-form-item>
          
          <el-form-item label="申请人" required>
            <template v-if="newCaseForm.caseType === '银行抵押'">
              <el-select v-model="newCaseForm.applicant" placeholder="请选择银行">
                <el-option label="中国银行" value="中国银行" />
                <el-option label="中国农商银行" value="中国农商银行" />
                <el-option label="中国工商银行" value="中国工商银行" />
                <el-option label="中国农业银行" value="中国农业银行" />
                <el-option label="中国建设银行" value="中国建设银行" />
                <el-option label="四川银行" value="四川银行" />
                <el-option label="中国邮储银行" value="中国邮储银行" />
              </el-select>
            </template>
            <el-input v-else v-model="newCaseForm.applicant" placeholder="请输入申请人" />
          </el-form-item>
          
          <el-form-item label="联系电话">
            <el-input v-model="newCaseForm.contactPhone" placeholder="请输入联系电话" />
          </el-form-item>
          
          <el-form-item>
            <el-button type="primary" @click="handleAddCaseSubmit">提交</el-button>
            <el-button @click="handleCancelAdd">取消</el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </template>
    
    <!-- 案件列表模式 -->
    <template v-else>
      <div class="page-header">
        <h2>{{ isDeveloperOnly ? '我的提交' : '我的收件' }}</h2>
        <p>{{ isDeveloperOnly ? '查看您提交的收件记录' : '查看分配给您的收件记录' }}</p>
      </div>

      <!-- 搜索和筛选 -->
      <el-card class="filter-card">
        <el-form :model="filterForm" inline>
          <el-form-item label="收件日期">
            <el-date-picker
              v-model="filterForm.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
            />
          </el-form-item>
          <el-form-item label="收件类型">
            <el-select v-model="filterForm.caseType" placeholder="请选择类型">
              <el-option label="全部" value="" />
              <el-option
                v-for="type in availableCaseTypes"
                :key="type"
                :label="type"
                :value="type"
              />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
            <el-button type="success" @click="navigateToAddCase"
              v-if="hasCreatePermission"
            >
              <el-icon><Plus /></el-icon>
              新增收件
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 案件列表组件 -->
      <el-card>
        <CaseList
          :cases="cases"
          :loading="loading"
          :pagination="pagination"
          :is-developer-only="isDeveloperOnly"
          :is-admin="isAdmin"
          :show-developer-column="showDeveloperColumn"
          :can-edit="false"
          :can-delete="false"
          @view-detail="viewCaseDetail"
          @page-change="handleCurrentChange"
          @size-change="handleSizeChange"
        />
      </el-card>
      
      <!-- 案件详情对话框 -->
      <el-dialog
        title="案件详情"
        v-model="detailDialogVisible"
        width="60%"
        @close="resetDetail"
      >
        <div class="case-detail" v-if="currentCase">
          <el-form label-position="top">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="收件编号">
                  {{ currentCase.case_number || '-' }}
                </el-form-item>
                <el-form-item label="收件类型">
                  {{ formatCaseType(currentCase.case_type) }}
                </el-form-item>
                <el-form-item label="收件日期">
                  {{ formatDate(currentCase.case_date) }}
                </el-form-item>
                <el-form-item label="申请人">
                  {{ currentCase.applicant || '-' }}
                </el-form-item>
                <el-form-item label="代理人">
                  {{ currentCase.agent || '-' }}
                </el-form-item>
                <el-form-item label="处理人" v-if="!isDeveloperOnly">
                  {{ currentCase.receiver_name || '-' }}
                </el-form-item>
                <el-form-item label="创建人" v-if="isAdmin">
                  {{ currentCase.creator_name || '-' }}
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="开发商" v-if="currentCase.developer">
                  {{ currentCase.developer }}
                </el-form-item>
                <el-form-item label="创建时间">
                  {{ formatDateTime(currentCase.created_at) }}
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="案件描述">
              {{ currentCase.case_description || '无' }}
            </el-form-item>
          </el-form>
        </div>
        <span v-else>加载中...</span>
        <template #footer>
          <el-button @click="detailDialogVisible = false">关闭</el-button>
        </template>
      </el-dialog>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onActivated, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { roleManager } from '../services/RoleStrategy'
import CaseList from '../components/common/CaseList.vue'
import {
  debounce,
  getUserInfo,
  ensureArray,
  handleApiResponse,
  formatDate,
  formatDateTime,
  formatCaseType,
  validateCaseData
} from '../utils/common'

// 定义组件属性
const props = defineProps({
  isAddMode: {
    type: Boolean,
    default: false
  }
})

const router = useRouter()

// 响应式数据
const loading = ref(false)
const detailDialogVisible = ref(false)
const currentCase = ref(null)

// 数据列表
const cases = ref([])
const filterForm = reactive({
  dateRange: [],
  caseType: ''
})
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 计算属性
const userInfo = computed(() => getUserInfo())
const isDeveloperOnly = computed(() => roleManager.isDeveloper())
const isAdmin = computed(() => roleManager.isAdmin())
const hasCreatePermission = computed(() => {
  try {
    return roleManager.getStrategy().hasCreatePermission()
  } catch (e) {
    console.error('获取创建权限失败:', e)
    return false
  }
})

const availableCaseTypes = computed(() => {
  try {
    return roleManager.getStrategy().getAvailableCaseTypes()
  } catch (e) {
    console.error('获取可用案件类型失败:', e)
    return []
  }
})

const showDeveloperColumn = computed(() => {
  return ['开发商转移', '开发商首次'].includes(filterForm.caseType)
})

// 监听 isAddMode 属性变化，当从添加模式切换到列表模式时重新加载数据
watch(() => props.isAddMode, (newVal, oldVal) => {
  if (oldVal === true && newVal === false) {
    // 从添加模式切换到列表模式，重置分页并重新加载数据
    pagination.page = 1
    loadCases()
  }
})

// 生命周期
onMounted(async () => {
  // 只有在非添加模式下才加载案件数据
  if (!props.isAddMode) {
    loadCases()
  }
})

// 组件激活时重新加载数据
onActivated(() => {
  if (!props.isAddMode) {
    loadCases()
  }
})

// 加载数据
const loadCases = debounce(async () => {
  if (loading.value) return
  
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.pageSize
    }
    
    if (filterForm.dateRange && filterForm.dateRange.length === 2) {
      params.startDate = filterForm.dateRange[0]
      params.endDate = filterForm.dateRange[1]
    }
    
    if (filterForm.caseType) {
      params.caseType = filterForm.caseType
    }
    
    // 使用角色策略获取案件列表
    const strategy = roleManager.getStrategy()
    const response = await strategy.getUserCases(params)
    
    // 处理API响应数据
    const processedResponse = handleApiResponse(response)
    
    cases.value = processedResponse.cases
    pagination.total = processedResponse.total
    pagination.page = processedResponse.pagination.page
    // 保持pageSize不变，因为pageSize是用户在前端选择的，应该以用户选择为准
    // pagination.pageSize = processedResponse.pagination.pageSize
    
  } catch (error) {
    console.error('加载收件记录失败:', error)
    ElMessage.error(error.message || '加载数据失败，请稍后重试')
    cases.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}, 300)

// 搜索和重置
const handleSearch = () => {
  pagination.page = 1
  loadCases()
}

const handleReset = () => {
  Object.assign(filterForm, {
    dateRange: [],
    caseType: ''
  })
  pagination.page = 1
  loadCases()
}

// 分页处理
const handleSizeChange = (size) => {
  pagination.pageSize = size
  pagination.page = 1
  loadCases()
}

const handleCurrentChange = (page) => {
  pagination.page = page
  loadCases()
}

// 导航到新增页面
const navigateToAddCase = () => {
  router.push('/cases/add')
}

// 新增案件表单数据
const newCaseForm = ref({
  case_number: '',
  caseType: '',
  case_date: '',
  title: '',
  description: '',
  applicant: '',
  contactPhone: '',
  attachments: []
})

// 新增案件提交
const handleAddCaseSubmit = async () => {
  try {
    // 验证表单数据
    const errors = validateCaseData(newCaseForm.value)
    if (errors.length > 0) {
      ElMessage.error(errors[0])
      return
    }
    
    // 准备提交数据，确保字段名称与后端匹配
    const submitData = {
      case_number: newCaseForm.value.case_number || undefined,
      caseType: newCaseForm.value.caseType,
      title: newCaseForm.value.title,
      description: newCaseForm.value.description,
      contactPerson: newCaseForm.value.applicant,
      contactPhone: newCaseForm.value.contactPhone,
      // 使用用户选择的案件日期
      case_date: newCaseForm.value.case_date,
      // 添加后端必需的申请人字段
      applicant: newCaseForm.value.applicant,
      // 添加后端必需的代理人字段
      agent: newCaseForm.value.applicant
    }
  
    // 使用角色策略创建案件
    const strategy = roleManager.getStrategy()
    // 检查创建权限
    const hasPermission = strategy.hasCreatePermission()
    if (!hasPermission) {
      ElMessage.error('您没有创建案件的权限')
      return
    }
    
    // 调用API创建案件
    const response = await strategy.caseAPI.addCase(submitData)
    
    // 显示案件创建成功信息
    ElMessage.success('案件创建成功')
    router.push('/cases')
  } catch (error) {
    ElMessage.error(error.response?.data?.message || error.message || '案件创建失败')
  }
}

// 取消新增
const handleCancelAdd = () => {
  router.push('/cases')
}

// 查看详情
const viewCaseDetail = async (id) => {
  try {
    const strategy = roleManager.getStrategy()
    const response = await strategy.caseAPI.getCaseDetail(id)
    currentCase.value = response.data || response.case || response
    detailDialogVisible.value = true
  } catch (error) {
    console.error('获取案件详情失败:', error)
    ElMessage.error(error.message || '获取案件详情失败')
  }
}

// 重置详情
const resetDetail = () => {
  currentCase.value = null
}
</script>

<style scoped>
.cases-container {
  padding: 20px;
}

.page-header {
  margin-bottom: 24px;
}

.filter-card {
  margin-bottom: 24px;
}

.case-detail {
  max-height: 600px;
  overflow-y: auto;
}
</style>
