<template>
  <div class="users-container">
    <div class="page-header">
      <h2>用户管理</h2>
      <p>管理系统中的开发商和收件人账户</p>
    </div>

    <el-card>
      <!-- 功能栏 -->
      <div class="function-bar">
        <el-input
          v-model="searchQuery"
          placeholder="搜索用户名或姓名"
          clearable
          prefix-icon="Search"
          style="width: 300px; margin-right: 10px"
          @clear="handleSearch"
          @keyup.enter="handleSearch"
        />
        <el-select
          v-model="roleFilter"
          placeholder="选择角色"
          clearable
          style="width: 150px; margin-right: 10px"
          @change="handleSearch"
        >
          <el-option label="所有角色" value="" />
          <el-option label="收件人" value="收件人" />
          <el-option label="开发商" value="开发商" />
          <el-option label="国资企业专窗" value="国资企业专窗" />
        </el-select>
        <el-button type="primary" @click="showAddUserDialog">
          <el-icon><Plus /></el-icon> 添加用户
        </el-button>
      </div>

      <!-- 用户列表 -->
      <el-table
        :data="filteredUsers"
        style="width: 100%"
        v-loading="loading"
        empty-text="暂无用户数据"
        row-key="id"
      >
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="用户名" width="180" />
        <el-table-column prop="name" label="姓名" width="180" />
        <el-table-column prop="role" label="角色" width="120">
          <template #default="scope">
                <el-tag v-if="scope && scope.row" :type="getRoleType(scope.row.role)">
                  {{ scope.row.role || '-' }}
                </el-tag>
                <span v-else style="color: #999;">-</span>
              </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
                <el-tag v-if="scope && scope.row" :type="getRoleType(scope.row.status)">
                  {{ scope.row.status || '-' }}
                </el-tag>
                <span v-else style="color: #999;">-</span>
              </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
                <el-button v-if="scope && scope.row" type="primary" text @click="editUser(scope.row)">
                  编辑
                </el-button>
                <el-button v-if="scope && scope.row" text type="danger" @click="confirmDelete(scope.row)" :disabled="scope.row.role === '管理员'">
                  删除
                </el-button>
                <span v-else style="color: #999;">-</span>
              </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="users.length"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 添加/编辑用户对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      @close="resetDialog"
    >
      <el-form
        :model="userForm"
        :rules="userRules"
        ref="userFormRef"
        label-width="120px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="userForm.username" placeholder="请输入用户名" :disabled="isEditMode" />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="userForm.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="密码" :required="!isEditMode" prop="password" v-if="!isEditMode">
          <el-input
            v-model="userForm.password"
            type="password"
            placeholder="请输入密码（至少6位）"
            show-password
          />
        </el-form-item>
        <el-form-item label="确认密码" :required="!isEditMode" prop="confirmPassword" v-if="!isEditMode">
          <el-input
            v-model="userForm.confirmPassword"
            type="password"
            placeholder="请再次输入密码"
            show-password
          />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="userForm.role" placeholder="请选择角色">
            <el-option label="收件人" value="收件人" />
            <el-option label="开发商" value="开发商" />
            <el-option label="国资企业专窗" value="国资企业专窗" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="userForm.status" placeholder="请选择状态">
            <el-option label="正常" value="正常" />
            <el-option label="休假" value="休假" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="resetDialog">取消</el-button>
          <el-button type="primary" @click="submitForm" :loading="submitting">
            {{ isEditMode ? '更新' : '添加' }}
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 删除确认对话框 -->
    <el-dialog
      v-model="deleteDialogVisible"
      title="确认删除"
      width="400px"
      @close="resetDeleteDialog"
    >
      <div class="delete-confirm">
        <el-icon class="warning-icon"><WarningFilled /></el-icon>
        <p>确定要删除用户 <strong>{{ deleteTarget?.name || '' }}</strong> 吗？</p>
        <p class="delete-hint">此操作不可撤销</p>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="resetDeleteDialog">取消</el-button>
          <el-button type="danger" @click="deleteUser" :loading="deleting">
            确认删除
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, WarningFilled } from '@element-plus/icons-vue'
import { userAPI } from '../services/api.js'
import { authAPI } from '../services/api.js'

// 响应式数据
const users = ref([])
const loading = ref(false)
const searchQuery = ref('')
const roleFilter = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const currentUser = ref({})

// 对话框相关
const dialogVisible = ref(false)
const deleteDialogVisible = ref(false)
const userFormRef = ref()
const submitting = ref(false)
const deleting = ref(false)
const deleteTarget = ref(null)
const isEditMode = ref(false)

// 用户表单
const userForm = reactive({
  id: '',
  username: '',
  name: '',
  password: '',
  confirmPassword: '',
  role: '收件人',
  status: '正常'
})

// 表单验证规则
const userRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度应在3-20个字符之间', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少为6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== userForm.password) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  role: [
    { required: true, message: '请选择角色', trigger: 'change' }
  ],
  status: [
    { required: true, message: '请选择状态', trigger: 'change' }
  ]
}

// 计算属性
const filteredUsers = computed(() => {
  let filtered = users.value
  
  // 过滤掉管理员账户，只显示开发商和收件人
  filtered = filtered.filter(user => user.role !== '管理员')
  
  // 按搜索词过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(user => 
      user.username.toLowerCase().includes(query) || 
      user.name.toLowerCase().includes(query)
    )
  }
  
  // 按角色过滤
  if (roleFilter.value) {
    filtered = filtered.filter(user => user.role === roleFilter.value)
  }
  
  // 分页
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filtered.slice(start, end)
})

const dialogTitle = computed(() => {
  return isEditMode.value ? '编辑用户' : '添加用户'
})

// 方法
const getRoleType = (value) => {
  // 角色类型映射
  const roleTypes = {
    '收件人': 'primary',
    '开发商': 'success',
    '管理员': 'warning',
    '国资企业专窗': 'info'
  }
  
  // 状态类型映射
  const statusTypes = {
    '正常': 'success',
    '休假': 'warning'
  }
  
  return statusTypes[value] || roleTypes[value] || 'info'
}

const loadUsers = async () => {
  try {
    console.log('开始加载用户列表...')
    loading.value = true
    const response = await userAPI.getUsers()
    console.log('获取用户列表响应:', response)
    
    // 注意：由于axios响应拦截器直接返回了response.data，所以这里直接访问response.users
    if (response && response.users) {
      // 转换后端的real_name为前端的name
      users.value = response.users.map(user => ({
        ...user,
        name: user.real_name
      }))
      console.log('用户列表加载成功，共', users.value.length, '条记录')
    } else {
      console.warn('用户列表数据格式不正确:', response)
      ElMessage.warning('用户列表数据格式异常')
    }
  } catch (error) {
    console.error('获取用户列表失败:', error)
    console.error('错误详情:', error.response || error.message)
    // 显示更详细的错误信息
    const errorMsg = error.response && error.response.data ? 
      `获取用户列表失败: ${error.response.data.error || error.response.data.message || '未知错误'}` : 
      '获取用户列表失败，请检查网络连接'
    ElMessage.error(errorMsg)
  } finally {
    loading.value = false
  }
}

const loadCurrentUser = async () => {
  try {
    const response = await authAPI.getCurrentUser()
    if (response.data && response.data.user) {
      currentUser.value = response.data.user
    }
  } catch (error) {
    console.error('获取当前用户信息失败:', error)
  }
}

const handleSearch = () => {
  currentPage.value = 1
}

const handleSizeChange = (size) => {
  pageSize.value = size
}

const handleCurrentChange = (current) => {
  currentPage.value = current
}

const showAddUserDialog = () => {
  isEditMode.value = false
  resetUserForm()
  dialogVisible.value = true
}

const editUser = (user) => {
  isEditMode.value = true
  // 复制用户数据到表单
  userForm.id = user.id
  userForm.username = user.username
  // 使用前端name或后端real_name
  userForm.name = user.name || user.real_name
  userForm.role = user.role
  // 为status设置默认值，确保不会为null或undefined
  userForm.status = user.status || '正常'
  dialogVisible.value = true
}

const confirmDelete = (user) => {
  deleteTarget.value = user
  deleteDialogVisible.value = true
}

const resetUserForm = () => {
  if (userFormRef.value) {
    userFormRef.value.resetFields()
  }
  userForm.id = ''
  userForm.username = ''
  userForm.name = ''
  userForm.password = ''
  userForm.confirmPassword = ''
  userForm.role = '收件人'
}

const resetDialog = () => {
  resetUserForm()
  dialogVisible.value = false
}

const resetDeleteDialog = () => {
  deleteTarget.value = null
  deleteDialogVisible.value = false
}

const submitForm = async () => {
  try {
    console.log('开始提交表单...')
    console.log('当前userForm状态:', userForm)
    
    await userFormRef.value.validate()
    console.log('表单验证通过')
    
    submitting.value = true
    
    const formData = {
      username: userForm.username,
      real_name: userForm.name,
      role: userForm.role,
      status: userForm.status
    }
    
    console.log('提交的数据:', formData)
    
    if (!isEditMode.value) {
      formData.password = userForm.password
      console.log('添加新用户')
      await userAPI.addUser(formData)
      ElMessage.success('用户添加成功')
    } else {
      console.log('更新用户，用户ID:', userForm.id)
      await userAPI.updateUser(userForm.id, formData)
      ElMessage.success('用户更新成功')
    }
    
    // 先刷新用户列表，然后再关闭对话框，确保用户可以立即看到更新后的状态
    console.log('刷新用户列表...')
    await loadUsers()
    console.log('用户列表刷新完成')
    
    dialogVisible.value = false
    console.log('对话框已关闭')
  } catch (error) {
    console.error('保存用户失败:', error)
    ElMessage.error('保存失败，请稍后重试')
  } finally {
    submitting.value = false
    console.log('提交完成，submitting状态重置为false')
  }
}

const deleteUser = async () => {
  try {
    deleting.value = true
    await userAPI.deleteUser(deleteTarget.value.id)
    ElMessage.success('用户删除成功')
    deleteDialogVisible.value = false
    loadUsers()
  } catch (error) {
    console.error('删除用户失败:', error)
    ElMessage.error('删除失败，请稍后重试')
  } finally {
    deleting.value = false
  }
}

// 生命周期
onMounted(async () => {
  await loadCurrentUser()
  await loadUsers()
})
</script>

<style scoped>
.users-container {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin-bottom: 5px;
  color: #333;
}

.page-header p {
  color: #666;
  font-size: 14px;
}

.function-bar {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 10px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.delete-confirm {
  text-align: center;
  padding: 20px;
}

.warning-icon {
  font-size: 48px;
  color: #f56c6c;
  margin-bottom: 16px;
}

.delete-hint {
  color: #909399;
  font-size: 14px;
  margin-top: 10px;
}

@media (max-width: 768px) {
  .function-bar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .function-bar .el-input,
  .function-bar .el-select {
    width: 100% !important;
    margin-right: 0 !important;
  }
}
</style>