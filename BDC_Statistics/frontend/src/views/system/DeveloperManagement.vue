<template>
  <div class="developer-management-container">
    <div class="page-header">
      <h2>开发商管理</h2>
      <p>维护开发商信息，同步最新的代理人和联系方式</p>
    </div>
    
    <!-- 操作区域 -->
    <div class="operation-section">
      <el-button type="primary" @click="syncDeveloperInfo" :loading="syncing">
        <el-icon><RefreshRight /></el-icon>
        同步开发商信息
      </el-button>
      <el-text type="info" v-if="lastSyncTime">
        上次同步时间：{{ lastSyncTime }}
      </el-text>
    </div>
    
    <!-- 联系簿展示 -->
    <el-card>
      <template #header>
        <div class="card-header">
          <span>开发商联系簿</span>
          <el-input
            v-model="searchKeyword"
            placeholder="搜索开发商名称"
            clearable
            style="width: 300px"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
      </template>
      
      <el-table 
        :data="filteredDevelopers" 
        v-loading="loading" 
        empty-text="暂无开发商数据"
        border
      >
        <el-table-column prop="developer" label="开发商名称" min-width="200" show-overflow-tooltip>
          <template #default="scope">
            <el-text strong>{{ scope.row.developer }}</el-text>
          </template>
        </el-table-column>
        <el-table-column prop="agent" label="代理人" min-width="150" show-overflow-tooltip>
          <template #default="scope">
            <span>{{ scope.row.agent || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="contact_phone" label="联系方式" min-width="150" show-overflow-tooltip>
          <template #default="scope">
            <el-tag type="primary" v-if="scope.row.contact_phone">{{ scope.row.contact_phone }}</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 分页 -->
      <div class="pagination-container" v-if="totalDevelopers > 0">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="totalDevelopers"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
    
    <!-- 同步结果对话框 -->
    <el-dialog
      title="同步结果"
      v-model="syncResultVisible"
      width="50%"
    >
      <div class="sync-result-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="总开发商数">{{ syncResult.total || 0 }}</el-descriptions-item>
          <el-descriptions-item label="成功同步数">{{ syncResult.synced || 0 }}</el-descriptions-item>
          <el-descriptions-item label="跳过数">{{ syncResult.skipped || 0 }}</el-descriptions-item>
          <el-descriptions-item label="失败数">{{ syncResult.failed || 0 }}</el-descriptions-item>
        </el-descriptions>
        
        <div class="sync-message" v-if="syncResult.message">
          <el-alert
            title="同步信息"
            :message="syncResult.message"
            type="success"
            show-icon
            :closable="false"
          />
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="syncResultVisible = false">关闭</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { developerAPI } from '@/services/api';
import { Search, RefreshRight } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

export default {
  name: 'DeveloperManagement',
  components: {
    Search,
    RefreshRight
  },
  setup() {
    const developers = ref([]);
    const loading = ref(false);
    const syncing = ref(false);
    const searchKeyword = ref('');
    const syncResultVisible = ref(false);
    const syncResult = ref({});
    const lastSyncTime = ref('');
    
    const pagination = ref({
      page: 1,
      pageSize: 20
    });
    
    // 过滤后的开发商列表
    const filteredDevelopers = computed(() => {
      if (!searchKeyword.value) {
        return developers.value;
      }
      return developers.value.filter(developer => 
        developer.developer && developer.developer.includes(searchKeyword.value)
      );
    });
    
    const totalDevelopers = computed(() => filteredDevelopers.value.length);
    
    // 加载开发商列表
    const loadDevelopers = async () => {
      loading.value = true;
      try {
        const response = await developerAPI.getDevelopers();
        if (response.success) {
          developers.value = response.data;
        } else {
          ElMessage.error('获取开发商列表失败');
        }
      } catch (error) {
        console.error('获取开发商列表失败:', error);
        ElMessage.error('获取开发商列表失败');
      } finally {
        loading.value = false;
      }
    };
    
    // 同步开发商信息
    const syncDeveloperInfo = async () => {
      syncing.value = true;
      try {
        const response = await developerAPI.syncDevelopers();
        if (response.success) {
          syncResult.value = response.stats;
          syncResult.value.message = response.message;
          syncResultVisible.value = true;
          
          // 更新最后同步时间
          lastSyncTime.value = new Date().toLocaleString();
          
          // 重新加载开发商列表
          await loadDevelopers();
          
          ElMessage.success('同步成功');
        } else {
          ElMessage.error('同步失败');
        }
      } catch (error) {
        console.error('同步开发商信息失败:', error);
        ElMessage.error('同步失败');
      } finally {
        syncing.value = false;
      }
    };
    
    // 分页变化
    const handleCurrentChange = (page) => {
      pagination.value.page = page;
    };
    
    // 每页大小变化
    const handleSizeChange = (size) => {
      pagination.value.pageSize = size;
      pagination.value.page = 1;
    };
    
    // 初始化加载数据
    onMounted(() => {
      loadDevelopers();
    });
    
    return {
      developers,
      loading,
      syncing,
      searchKeyword,
      syncResultVisible,
      syncResult,
      lastSyncTime,
      pagination,
      filteredDevelopers,
      totalDevelopers,
      loadDevelopers,
      syncDeveloperInfo,
      handleCurrentChange,
      handleSizeChange
    };
  }
};
</script>

<style scoped>
.developer-management-container {
  padding: 20px;
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

.operation-section {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 6px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sync-result-content {
  padding: 10px 0;
}

.sync-message {
  margin-top: 16px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
