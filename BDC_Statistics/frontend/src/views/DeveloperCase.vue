<template>
  <div class="developer-case-container">
    <div class="page-header">
      <h2>收件录入</h2>
      <p>录入即视为该收件业务完成，无需后续处理</p>
    </div>

    <!-- 录入表单 -->
    <el-card class="input-card">
      <el-form 
        :model="caseForm" 
        :rules="caseRules" 
        ref="caseFormRef" 
        label-width="120px"
      >
        <el-form-item label="收件编号" prop="caseNumber">
          <el-input v-model="caseForm.caseNumber" placeholder="请输入收件编号" />
        </el-form-item>
        
        <el-form-item label="收件类型" prop="caseType">
          <el-select 
            v-model="caseForm.caseType" 
            placeholder="请选择收件类型"
            @change="handleCaseTypeChange"
          >
            <el-option 
              v-for="type in availableCaseTypes" 
              :key="type.value" 
              :label="type.label" 
              :value="type.value"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="收件日期" prop="caseDate">
          <el-date-picker
            v-model="caseForm.caseDate"
            type="date"
            placeholder="选择收件日期"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        
        <el-form-item label="申请人" prop="applicant" v-if="!isDeveloperOnly || isDeveloperCase">
          <el-input v-model="caseForm.applicant" placeholder="请输入申请人姓名" />
        </el-form-item>
        
        <el-form-item label="代理人" prop="agent">
          <el-input v-model="caseForm.agent" placeholder="请输入代理人姓名" />
        </el-form-item>
        
        <el-form-item label="联系电话" prop="contactPhone">
          <el-input v-model="caseForm.contactPhone" placeholder="请输入联系电话" />
        </el-form-item>
        
        <!-- 开发商相关字段 -->
        <el-form-item label="开发商" prop="developer" v-if="isDeveloperCase">
          <el-select
            v-model="caseForm.developer"
            placeholder="请选择开发商"
            :loading="developersLoading"
            style="width: 100%"
          >
            <el-option
              v-for="developer in developers"
              :key="developer.id"
              :label="developer.project_name"
              :value="developer.project_name"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="案件描述" prop="caseDescription">
          <el-input
            v-model="caseForm.caseDescription"
            type="textarea"
            :rows="2"
            placeholder="请输入案件描述"
          />
        </el-form-item>
        
        <!-- 移除自动分配预览功能 -->
        
        <!-- 国资类案件提示 -->
        <el-form-item v-if="isStateOwnedCase">
          <div class="state-owned-hint">
            <el-icon><InfoFilled /></el-icon>
            <span>国资类案件将由您自行处理，无需系统分配</span>
          </div>
        </el-form-item>
      </el-form>
      
      <div class="form-actions">
        <el-button @click="resetForm">重置</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          提交录入
        </el-button>
      </div>
    </el-card>

    <!-- 最近录入记录 -->
    <el-card class="recent-records-card" v-if="recentRecords.length > 0">
      <template #header>
        <div class="card-header">
          <span>最近录入记录</span>
        </div>
      </template>
      
      <el-table 
        :data="recentRecords" 
        style="width: 100%"
        size="small"
      >
        <el-table-column prop="case_number" label="收件编号" width="150" />
        <el-table-column prop="case_type" label="收件类型" width="120" />
        <el-table-column label="收件日期" width="120">
          <template #default="scope">
            {{ formatDate(scope.row.case_date) }}
          </template>
        </el-table-column>
        <el-table-column prop="receiver" label="处理人" width="120" />
        <el-table-column prop="agent" label="代理人" width="100" />
        <el-table-column prop="developer" label="开发商" width="150" />
        <el-table-column label="操作" width="80">
          <template #default="scope">
            <el-button type="primary" text size="small" @click="viewCaseDetail(scope.row.id)">
              查看
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 分页组件 -->
      <div class="pagination-container" v-if="recentRecords.length > 0">
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
                {{ currentCase.case_type || '-' }}
              </el-form-item>
              <el-form-item label="收件日期">
                {{ formatDate(currentCase.case_date) }}
              </el-form-item>
              <el-form-item label="申请人">
                {{ currentCase.applicant || '-' }}
              </el-form-item>
              <el-form-item label="处理人">
                {{ currentCase.receiver || '-' }}
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="开发商">
                {{ currentCase.developer || '-' }}
              </el-form-item>
              <el-form-item label="代理人">
                {{ currentCase.agent || '-' }}
              </el-form-item>
              <el-form-item label="联系电话">
                {{ currentCase.contact_phone || currentCase.contactPhone || '-' }}
              </el-form-item>
              <el-form-item label="创建时间">
                {{ formatDateTime(currentCase.created_at) }}
              </el-form-item>
              <el-form-item label="更新时间">
                {{ formatDateTime(currentCase.updated_at) }}
              </el-form-item>
              <el-form-item label="状态">
                {{ currentCase.status || '-' }}
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
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { InfoFilled } from '@element-plus/icons-vue'
import { caseAPI } from '../services/api.js'
import api from '../services/api.js'
import { useRouter } from 'vue-router'

// 日期格式化函数
const formatDate = (date) => {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleDateString('zh-CN')
}

// 日期时间格式化函数
const formatDateTime = (date) => {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleString('zh-CN')
}

const router = useRouter()
const caseFormRef = ref()
const submitting = ref(false)
const recentRecords = ref([])
const availableCaseTypes = ref([])
const developers = ref([])
const developersLoading = ref(false)
// 案件详情相关
const detailDialogVisible = ref(false)
const currentCase = ref(null)

// 判断是否只有开发商权限
const isDeveloperOnly = computed(() => {
  const user = JSON.parse(localStorage.getItem('userInfo')) || {}
  return user.role === '开发商'
})

// 根据案件类型判断是否是开发商相关案件
const isDeveloperCase = computed(() => {
  return caseForm.caseType && 
    (caseForm.caseType === '开发商首次' || caseForm.caseType === '开发商转移')
})

// 根据案件类型判断是否是国资类案件
const isStateOwnedCase = computed(() => {
  return ['开发商首次', '国资件', '企业件'].includes(caseForm.caseType)
})

// 表单数据
const caseForm = reactive({
  caseNumber: '',
  caseType: '',
  caseDate: new Date().toISOString().split('T')[0],
  applicant: '',
  agent: '',
  contactPhone: '',
  developer: '',
  caseDescription: ''
})

// 表单验证规则
const caseRules = {
  caseNumber: [{ required: true, message: '请输入收件编号', trigger: 'blur' }],
  caseType: [{ required: true, message: '请选择收件类型', trigger: 'change' }],
  caseDate: [{ required: true, message: '请选择收件日期', trigger: 'change' }],
  applicant: [
    {
      required: (rule, value, callback) => {
        // 开发商转移案件需要填写申请人
        if (caseForm.caseType === '开发商转移' || (!isDeveloperOnly.value && !value)) {
          if (!value) {
            callback(new Error('请输入申请人姓名'));
          } else {
            callback();
          }
        } else {
          callback();
        }
      },
      trigger: 'blur'
    }
  ],
  agent: [{ required: true, message: '请输入代理人姓名', trigger: 'blur' }],
  contactPhone: [
    {
      validator: (rule, value, callback) => {
        // 开发商转移业务时，联系电话非必填
        const isDeveloperTransfer = caseForm.caseType === '开发商转移';
        if (!isDeveloperTransfer && !value) {
          callback(new Error('请输入联系电话'));
        } else {
          callback();
        }
      },
      trigger: 'blur'
    }
  ],
  developer: [
    {
      required: (rule, value, callback) => {
        // 只有开发商案件类型才需要验证开发商字段
        const isDeveloperCase = ['开发商首次', '开发商转移'].includes(caseForm.caseType);
        if (isDeveloperCase && !value) {
          callback(new Error('请选择开发商'));
        } else {
          callback();
        }
      },
      trigger: ['blur', 'change']
    }
  ]
}

// 处理案件类型变更
const handleCaseTypeChange = () => {
  // 简化实现，不再实时获取分配结果
}



// 设置可用的案件类型
const setupAvailableCaseTypes = () => {
  // 根据用户角色设置可用的案件类型
  const user = JSON.parse(localStorage.getItem('userInfo')) || {}
  
  if (isDeveloperOnly.value) {
    // 开发商只有开发商转移类型
    availableCaseTypes.value = [
      { label: '开发商转移', value: '开发商转移' }
    ]
    caseForm.caseType = '开发商转移'
  } else {
    // 收件人有多种类型
    availableCaseTypes.value = [
      { label: '一般件', value: '一般件' },
      { label: '自建房', value: '自建房' },
      { label: '分割转让', value: '分割转让' },
      { label: '其他', value: '其他' },
      { label: '开发商首次', value: '开发商首次' },
      { label: '开发商转移', value: '开发商转移' },
      { label: '国资件', value: '国资件' },
      { label: '企业件', value: '企业件' }
    ]
  }
}

// 获取开发商列表
const fetchDevelopers = async () => {
  try {
    developersLoading.value = true
    const response = await api.get('/developers/projects')
    if (response && response.projects) {
      developers.value = response.projects
    }
  } catch (error) {
    console.error('获取开发商列表失败:', error)
    ElMessage.error('获取开发商列表失败，请稍后重试')
  } finally {
    developersLoading.value = false
  }
}

// 提交表单
const handleSubmit = async () => {
  try {
    await caseFormRef.value.validate()
    
    submitting.value = true
    
    // 准备提交数据
    const submitData = {
      caseNumber: caseForm.caseNumber,
      caseType: caseForm.caseType,
      caseDate: caseForm.caseDate,
      applicant: caseForm.applicant,
      agent: caseForm.agent,
      contactPhone: caseForm.contactPhone,
      developer: caseForm.developer,
      caseDescription: caseForm.caseDescription
    }
    
    const response = await caseAPI.addCase(submitData)
    
    // 显示成功通知
    ElMessageBox({
      title: '提交成功',
      message: `您的${caseForm.caseType}已成功提交！`,
      type: 'success',
      showConfirmButton: true
    })
    
    // 检查是否有轮询提醒信息
    if (response.data && response.data.nextReceiver) {
      const nextReceiver = response.data.nextReceiver;
      // 显示轮询提醒
      ElMessageBox.alert(
        `下一个案件应由 ${nextReceiver.name} (${nextReceiver.department}) 接收，请通知对方做好准备。`,
        '轮询提醒',
        {
          confirmButtonText: '确定',
          type: 'info'
        }
      );
    }
    
    // 重置表单
    resetForm()
    
    // 刷新最近记录
    loadRecentRecords()
  } catch (error) {
    if (error.name !== 'ValidationError') {
      ElMessage.error(error.message || '提交失败，请稍后重试')
    }
  } finally {
    submitting.value = false
  }
}

// 重置表单
  const resetForm = () => {
    if (caseFormRef.value) {
      caseFormRef.value.resetFields()
    }
    
    // 重置默认值
    caseForm.caseDate = new Date().toISOString().split('T')[0]
    caseForm.applicant = ''
    caseForm.agent = ''
    caseForm.contactPhone = ''
    caseForm.developer = ''
    caseForm.caseDescription = ''
    
    // 如果是开发商，保持案件类型
    if (!isDeveloperOnly.value) {
      caseForm.caseType = ''
    }
  }

// 查看案件详情
const viewCaseDetail = async (caseId) => {
  try {
    // 获取案件详情
    const response = await caseAPI.getCaseDetail(caseId)
    currentCase.value = response.case || response.data || response
    detailDialogVisible.value = true
  } catch (error) {
    ElMessage.error('获取案件详情失败: ' + (error.message || '未知错误'))
  }
}

// 重置详情
const resetDetail = () => {
  currentCase.value = null
  detailDialogVisible.value = false
}

// 分页状态
const pagination = ref({
  page: 1,
  pageSize: 20, // 默认显示20条记录，让最近录入记录展示更多数据
  total: 0
})

// 加载最近记录
const loadRecentRecords = async () => {
  try {
    const response = await caseAPI.getMyCases({
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
      sortBy: 'created_at',
      sortOrder: 'desc'
    })
    
    if (response && response.cases) {
      recentRecords.value = response.cases
      // 更新总记录数
      pagination.value.total = response.total || 0
    }
  } catch (error) {
    console.error('加载最近记录失败:', error)
  }
}

// 分页变化处理
const handlePageChange = (page) => {
  pagination.value.page = page
  loadRecentRecords()
}

const handlePageSizeChange = (pageSize) => {
  pagination.value.pageSize = pageSize
  pagination.value.page = 1
  loadRecentRecords()
}

// 移除通知检查功能

onMounted(async () => {
  setupAvailableCaseTypes()
  await fetchDevelopers()
  await loadRecentRecords()
})
</script>

<style scoped>
.developer-case-container {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin-bottom: 5px;
  color: #333;
  font-size: 20px;
}

.page-header p {
  color: #666;
  font-size: 14px;
}

.input-card {
  margin-bottom: 30px;
}

.form-hint {
  color: #909399;
  font-size: 12px;
  margin-top: 5px;
}

.allocation-preview {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  background-color: #f0f9ff;
  border-radius: 4px;
  border: 1px solid #d9ecff;
}

.state-owned-hint {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background-color: #f6ffed;
  border-radius: 4px;
  border: 1px solid #b7eb8f;
  color: #52c41a;
  font-size: 14px;
}

.state-owned-hint .el-icon {
  margin-right: 8px;
}

.form-actions {
  margin-top: 30px;
  text-align: right;
}

.recent-records-card {
  margin-top: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pagination-container {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

/* 响应式设计 */

/* 响应式设计 */
@media screen and (max-width: 768px) {
  .developer-case-container {
    padding: 10px;
  }
  
  .el-form-item {
    margin-bottom: 15px;
  }
  
  .el-table {
    font-size: 13px;
  }
  
  .el-table-column {
    padding: 0 5px;
  }
}
</style>