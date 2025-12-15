<template>
  <div class="case-list-container">
    <!-- 案件列表 -->
    <el-table 
      :data="cases" 
      v-loading="loading" 
      empty-text="暂无收件记录"
      style="width: 100%"
    >
      <el-table-column prop="case_number" label="收件编号" width="120" />
      <el-table-column prop="case_type" label="收件类型" width="120">
        <template #default="scope">
          <el-tag v-if="scope.row.case_type" :type="getCaseTypeTag(scope.row.case_type)">
            {{ scope.row.case_type }}
          </el-tag>
          <span v-else style="color: #999;">-</span>
        </template>
      </el-table-column>
      <el-table-column prop="case_date" label="收件日期" width="120">
        <template #default="scope">
          {{ formatDate(scope.row.case_date) }}
        </template>
      </el-table-column>
      <el-table-column prop="applicant" label="申请人" width="120" show-overflow-tooltip />
      <el-table-column prop="agent" label="代理人" width="120" show-overflow-tooltip />
      <el-table-column prop="developer" label="开发商" width="150" show-overflow-tooltip>
        <template #default="scope">
          {{ ['开发商转移', '开发商转移登记'].includes(scope.row.case_type) ? (scope.row.developer || '-') : '' }}
        </template>
      </el-table-column>
      <el-table-column prop="receiver" label="处理人" width="100" />
      <el-table-column prop="creator_name" label="创建人" width="100" v-if="isAdmin" />
      <el-table-column prop="case_description" label="案件描述" show-overflow-tooltip />
      <el-table-column label="操作" width="80" fixed="right">
        <template #default="scope">
          <el-button text @click="$emit('view-detail', scope.row.id)">查看</el-button>
          <el-button text @click="$emit('edit', scope.row)" v-if="canEdit">编辑</el-button>
          <el-button text @click="$emit('delete', scope.row.id)" v-if="canDelete" type="danger">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-container" v-if="pagination.total > 0">
      <el-pagination
        v-model:current-page="localPagination.page"
        v-model:page-size="localPagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { formatDate, formatCaseType } from '@/utils/common'

// 组件属性
const props = defineProps({
  // 案件列表数据
  cases: {
    type: Array,
    default: () => []
  },
  // 加载状态
  loading: {
    type: Boolean,
    default: false
  },
  // 分页信息
  pagination: {
    type: Object,
    default: () => ({
      total: 0,
      page: 1,
      pageSize: 10
    })
  },
  // 是否只显示开发商相关案件
  isDeveloperOnly: {
    type: Boolean,
    default: false
  },
  // 是否是管理员
  isAdmin: {
    type: Boolean,
    default: false
  },
  // 是否显示开发商列
  showDeveloperColumn: {
    type: Boolean,
    default: false
  },
  // 是否可以编辑
  canEdit: {
    type: Boolean,
    default: false
  },
  // 是否可以删除
  canDelete: {
    type: Boolean,
    default: false
  }
})

// 事件定义
const emit = defineEmits(['view-detail', 'edit', 'delete', 'page-change', 'size-change'])

// 本地分页状态
const localPagination = ref({
  page: props.pagination.page,
  pageSize: props.pagination.pageSize
})

// 监听分页信息变化
watch(() => props.pagination, (newPagination) => {
  localPagination.value.page = newPagination.page
  localPagination.value.pageSize = newPagination.pageSize
}, { deep: true })

// 获取案件类型标签样式
const getCaseTypeTag = (type) => {
  const typeMap = {
    '一般件': 'success',
    '自建房': 'primary',
    '分割转让': 'info',
    '其他': 'warning',
    '开发商转移': 'primary',
    '开发商首次': 'warning',
    '国资件': 'danger',
    '企业件': 'danger'
  }
  return typeMap[type] || 'info'
}

// 分页处理
const handleSizeChange = (size) => {
  localPagination.value.pageSize = size
  localPagination.value.page = 1
  emit('size-change', size)
}

const handleCurrentChange = (page) => {
  localPagination.value.page = page
  emit('page-change', page)
}
</script>

<style scoped>
.case-list-container {
  width: 100%;
}

.pagination-container {
  margin-top: 20px;
  text-align: right;
}
</style>
