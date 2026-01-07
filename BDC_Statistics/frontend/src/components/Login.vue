<template>
  <div class="login-container">
    <el-card class="login-card">
      <template #header>
        <div class="login-header">
          <h2>不动产登记收件系统</h2>
          <p>请登录您的账户</p>
        </div>
      </template>
      

      <el-form :model="loginForm" :rules="loginRules" ref="loginFormRef" class="login-form">
        <el-form-item prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="用户名"
            prefix-icon="User"
            size="large"
            @keyup.enter="passwordInput.focus()"
            ref="usernameInput"
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="密码"
            prefix-icon="Lock"
            size="large"
            show-password
            @keyup.enter="handleLogin"
            ref="passwordInput"
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            class="login-button"
            :loading="loading"
            @click="handleLogin"
          >
            {{ loading ? '登录中...' : '登录' }}
          </el-button>
        </el-form-item>
      </el-form>

    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'

const router = useRouter()
const store = useStore()
const loading = ref(false)
const loginFormRef = ref()
const usernameInput = ref()
const passwordInput = ref()

const loginForm = reactive({
  username: '',
  password: ''
})

const loginRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' }
  ]
}

const handleLogin = async () => {
  if (!loginFormRef.value) return
  
  try {
    const valid = await loginFormRef.value.validate()
    if (!valid) return

    loading.value = true
    
    // 使用Vuex的login action进行登录
    const { user } = await store.dispatch('login', loginForm)
    
    ElMessage.success('登录成功')
    
    // 登录成功后跳转到根路径，触发Dashboard的角色重定向
    router.push('/')
  } catch (error) {
    console.error('登录错误:', error)
    ElMessage.error(error.message || '登录失败，请检查用户名和密码')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #91d5ff 0%, #b37feb 100%);
  padding: 20px;
  box-sizing: border-box;
}

.login-card {
  width: 100%;
  max-width: 480px;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  border: 1px solid #e6f7ff;
  background-color: white;
  overflow: hidden;
}

.login-header {
  text-align: center;
  color: #333;
  padding: 32px 24px 0;
  background: linear-gradient(135deg, #f0f9ff 0%, #e6f7ff 100%);
  margin: -20px -20px 20px;
  padding: 32px 24px;
}

.login-header h2 {
  margin: 0;
  color: #597ef7;
  font-size: 24px;
  font-weight: 600;
  letter-spacing: 1px;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.05);
}

.login-header p {
  margin: 12px 0 0;
  color: #91d5ff;
  font-size: 16px;
}

.login-form {
  margin-top: 24px;
  padding: 0 24px 32px;
}

.login-button {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 1px;
  background: linear-gradient(135deg, #91d5ff 0%, #b37feb 100%);
  border: none;
  color: white;
}

.login-button:hover {
  background: linear-gradient(135deg, #69c0ff 0%, #9254de 100%);
}

.login-button:loading {
  background: linear-gradient(135deg, #91d5ff 0%, #b37feb 100%);
}
</style>