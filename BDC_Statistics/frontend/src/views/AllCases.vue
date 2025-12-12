<template>
  <div class="all-cases-container">
    <div class="page-header">
      <h2>全部收件管理</h2>
      <p>查看和管理系统中所有收件记录</p>
    </div>
    
    <!-- 搜索筛选区域 -->
    <div class="filter-section">
      <el-form :inline="true" :model="searchForm" class="demo-form-inline">
        <el-form-item label="案件类型">
          <el-select v-model="searchForm.caseType" placeholder="请选择案件类型" clearable>
            <el-option label="一般件" value="一般件"></el-option>
            <el-option label="开发商转移" value="开发商转移"></el-option>
            <el-option label="开发商转移登记" value="开发商转移登记"></el-option>
            <el-option label="其他" value="其他"></el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
          ></el-date-picker>
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </div>
    
    <!-- 使用CaseList组件，该组件已在Cases.vue中证明有正常的分页功能 -->
    <el-card>
      <CaseList
        :cases="casesData"
        :loading="loading"
        :pagination="pagination"
        :is-admin="true"
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
              <el-form-item label="案件编号">
                {{ currentCase.case_number }}
              </el-form-item>
              <el-form-item label="案件类型">
                {{ currentCase.case_type }}
              </el-form-item>
              <el-form-item label="收件人">
                {{ currentCase.receiver }}
              </el-form-item>
              <el-form-item label="收件日期">
                {{ formatDate(currentCase.case_date) }}
              </el-form-item>
              <el-form-item label="描述">
                {{ currentCase.case_description || '-' }}
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="创建时间">
                {{ formatDate(currentCase.created_at) }}
              </el-form-item>
              <el-form-item label="更新时间">
                {{ formatDate(currentCase.updated_at) }}
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="备注">
            {{ currentCase.remarks || '无' }}
          </el-form-item>

        </el-form>
      </div>
      <span v-else>加载中...</span>
      <span slot="footer" class="dialog-footer">
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { caseAPI } from '@/services/api';
import CaseList from '../components/common/CaseList.vue';

export default {
  name: 'AllCases',
  components: {
    CaseList
  },
  data() {
    return {
      casesData: [],
      searchForm: {
        caseType: ''
      },
      dateRange: [],
      detailDialogVisible: false,
      currentCase: null,
      pagination: {
        page: 1,
        pageSize: 10,
        total: 0
      },
      showDeveloperColumn: true
    };
  },
  computed: {
    // 用户信息从localStorage获取或通过API获取
    userInfo() {
      return JSON.parse(localStorage.getItem('userInfo') || '{}');
    }
  },
  created() {
    this.loadCases();
  },
  methods: {
    // 加载收件列表 - 增强版，优化分页处理和错误管理
    async loadCases() {
      // 先清空数据，准备加载新数据
      this.casesData = [];
      
      try {
        // 验证分页参数有效性
        const page = Math.max(1, parseInt(this.pagination.page) || 1);
        const limit = Math.max(1, Math.min(100, parseInt(this.pagination.pageSize) || 10));
        
        const params = {
          page: page,
          limit: limit,
          caseType: this.searchForm.caseType
        };
        
        // 添加日期范围
        if (this.dateRange && Array.isArray(this.dateRange) && this.dateRange.length === 2) {
          params.startDate = this.dateRange[0];
          params.endDate = this.dateRange[1];
        }
        
        console.log('发送API请求参数:', params);
        
        // 获取token并直接使用axios请求
        const token = localStorage.getItem('authToken');
        if (!token) {
          console.error('缺少认证token');
          this.$message.error('请先登录');
          return;
        }
        console.log('使用token:', token.substring(0, 20) + '...');
        
        // 确保API调用正确传递分页参数
        console.log(`正在请求第${page}页，每页${limit}条数据`);
        const response = await caseAPI.getAllCases(params);
        
        if (!response) {
          console.error('无效的响应数据');
          this.$message.error('无效的响应数据');
          return;
        }
        
        console.log('获取全部收件响应:', response);
        console.log('响应数据类型:', typeof response);
        
        // 深度检查响应数据结构
        let processedData = [];
        let totalCount = 0;
        
        // 全面的数据结构适配 - 注意：api.js的响应拦截器已经直接返回了response.data
        // 所以这里的response已经是后端返回的数据，不再需要访问response.data
        // 后端返回格式：{ success: true, cases: [...], total: ... }
        
        // 检查响应是否包含success字段
        if (response.success) {
          console.log('响应包含success字段，值为true');
          
          // 优先从response.total获取总条数 - 兼容新的返回格式
          if (typeof response.total === 'number') {
            totalCount = response.total;
            console.log('从response.total获取总条数:', totalCount);
          } 
          // 兼容response.pagination.total - 如用户提供的示例所示
          else if (response.pagination && typeof response.pagination.total === 'number') {
            totalCount = response.pagination.total;
            console.log('从response.pagination.total获取总条数:', totalCount);
          }
          // 兼容total_cases字段 - 统计数据中的总条数字段
          else if (typeof response.total_cases === 'number') {
            totalCount = response.total_cases;
            console.log('从response.total_cases获取总条数:', totalCount);
          }
          
          // 从response.cases获取案件数据 - 兼容新的返回格式
          if (Array.isArray(response.cases)) {
            console.log('从response.cases获取数据，长度:', response.cases.length);
            processedData = response.cases;
            if (totalCount === 0) {
              totalCount = response.cases.length;
            }
          }
          // 兼容response.data字段 - 某些情况下后端可能返回data字段
          else if (Array.isArray(response.data)) {
            console.log('从response.data获取数据，长度:', response.data.length);
            processedData = response.data;
            if (totalCount === 0) {
              totalCount = response.data.length;
            }
          }
          else {
            console.log('response.cases和response.data都不是数组，使用空数组');
            processedData = [];
            totalCount = 0;
          }
        } else if (Array.isArray(response)) {
          // 兼容旧版API：后端直接返回数组
          console.log('情况2: 后端直接返回数组，长度:', response.length);
          processedData = response;
          totalCount = response.length;
        } else if (typeof response === 'object') {
          // 兼容旧版API：后端返回单个对象
          console.log('情况3: 后端返回单个对象');
          processedData = [response];
          totalCount = 1;
        } else {
          // 未知数据结构
          console.log('情况4: 未知数据结构');
          processedData = [];
          totalCount = 0;
        }
        
        // 数据字段标准化 - 确保所有必要字段都存在
        processedData = processedData.map(item => {
          // 保留原始对象的所有属性，只补充缺失的属性
          const caseType = item.case_type || item.type || item.category || '其他';
          
          // 增强日期处理：确保case_date字段始终有有效日期
          let caseDate = item.case_date;
          console.log('原始case_date:', caseDate, '类型:', typeof caseDate);
          
          // 兼容不同的日期字段名称
          if (!caseDate) {
            caseDate = item.caseDate || item.created_at || item.completed_at || item.updated_at || new Date().toISOString().slice(0, 10);
            console.log('使用备选日期:', caseDate);
          }
          
          // 确保日期格式有效
          let formattedCaseDate = caseDate;
          try {
            const d = new Date(caseDate);
            console.log('解析后的日期:', d, '是否有效:', !isNaN(d.getTime()));
            if (!isNaN(d.getTime())) {
              formattedCaseDate = d.toISOString().slice(0, 10);
              console.log('格式化后的日期:', formattedCaseDate);
            } else {
              formattedCaseDate = new Date().toISOString().slice(0, 10);
              console.log('使用当前日期:', formattedCaseDate);
            }
          } catch (error) {
            console.error('日期格式转换错误:', error);
            formattedCaseDate = new Date().toISOString().slice(0, 10);
            console.log('使用当前日期:', formattedCaseDate);
          }
          
          // 确保id字段始终有效
          const id = item.id || item._id || '';
          console.log('处理后的案件ID:', id, '类型:', typeof id);
          
          const standardizedItem = {
            ...item,
            // 确保id字段始终有效
            id: id,
            case_number: item.case_number || item.caseNumber || item.case_no || 'N/A',
            receiver: item.receiver || item.real_name || item.receiver_name || '未知收件人',
            priority: item.priority || item.urgency || 'normal',
            case_type: caseType,
            // 使用处理后的日期
            case_date: formattedCaseDate,
            // 兼容不同的案件描述字段名称
            case_description: item.case_description || item.description || item.content || '',
            // 确保type_breakdown存在，避免模板渲染错误，且键名都是字符串
            type_breakdown: typeof item.type_breakdown === 'object' && item.type_breakdown !== null ? item.type_breakdown : {
              [caseType]: 1
            }
          };
          
          console.log('标准化后的案件数据:', standardizedItem);
          return standardizedItem;
        });
        
        // 只过滤掉id为空字符串或null或undefined的案件
        processedData = processedData.filter(item => item.id && item.id !== '' && item.id !== null && item.id !== undefined);
        
        // 添加默认排序，按照收件日期倒序，确保最新的案件在前面
        processedData.sort((a, b) => {
          // 尝试按照案件编号排序（如果案件编号是数字格式）
          if (a.case_number && b.case_number) {
            // 提取案件编号中的数字部分
            const numA = parseInt(a.case_number.replace(/[^0-9]/g, ''), 10);
            const numB = parseInt(b.case_number.replace(/[^0-9]/g, ''), 10);
            if (!isNaN(numA) && !isNaN(numB)) {
              return numB - numA; // 倒序排序，案件编号大的在前面
            }
          }
          
          // 否则按照收件日期排序
          const dateA = new Date(a.case_date);
          const dateB = new Date(b.case_date);
          return dateB - dateA; // 倒序排序，最新的日期在前面
        });
        
        console.log('排序后的的数据:', processedData);
        this.casesData = processedData;
        this.pagination.total = totalCount;
        
        console.log('数据加载完成，当前页码:', page, '每页条数:', limit, '总条数:', totalCount, '数据条数:', processedData.length);
        
      } catch (error) {
        console.error('获取收件列表失败:', error);
        if (error.response) {
          console.error('错误状态:', error.response.status);
          console.error('错误数据:', error.response.data);
          this.$message.error(`获取数据失败: ${error.response.status} - ${error.response.data?.error || error.response.statusText}`);
        } else if (error.request) {
          console.error('网络错误，没有收到响应');
          this.$message.error('网络连接失败，请检查后端服务');
        } else {
          console.error('请求配置错误:', error.message);
          this.$message.error(`请求错误: ${error.message}`);
        }
        
        // 出错时保持空数据状态，并记录当前分页信息
        console.log('保持当前分页状态:', this.currentPage, this.pageSize);
      }
    },
    
    // 显示模拟数据
    showMockData() {
      console.log('显示模拟数据供测试');
      const mockData = [
        {          id: '1',
          case_number: 'CAS2024001',
          receiver: '张三',
          priority: 'high',
          case_type: '技术支持',
          created_at: new Date('2024-01-15'),
          description: '系统登录异常问题'
        },
        {          id: '2',
          case_number: 'CAS2024002',
          receiver: '李四',
          priority: 'medium',
          case_type: '数据咨询',
          created_at: new Date('2024-01-14'),
          description: '统计报表数据核对'
        },
        {          id: '3',
          case_number: 'CAS2024003',
          receiver: '王五',
          priority: 'low',
          case_type: '功能建议',
          created_at: new Date('2024-01-13'),
          description: '增加导出Excel功能'
        },
        {          id: '4',
          case_number: 'CAS2024004',
          receiver: '赵六',
          priority: 'high',
          case_type: '技术支持',
          created_at: new Date('2024-01-12'),
          description: '数据同步失败'
        },
        {          id: '5',
          case_number: 'CAS2024005',
          receiver: '孙七',
          priority: 'medium',
          case_type: '培训需求',
          created_at: new Date('2024-01-11'),
          description: '新系统操作培训'
        }
      ];
      
      this.casesData = mockData;
      this.pagination.total = mockData.length;
    },
    
    // 处理搜索
    handleSearch() {
      this.pagination.page = 1;
      this.loadCases();
    },
    
    // 重置搜索
    resetSearch() {
      this.searchForm = {
        caseType: ''
      };
      this.dateRange = [];
      this.pagination.page = 1;
      this.loadCases();
    },
    
    // 分页变化 - 优化实现，确保分页参数正确传递
    handleCurrentChange(page) {
      console.log('分页变化，跳转到第', page, '页');
      this.pagination.page = page;
      this.loadCases();
    },
    
    // 每页大小变化 - 优化实现，确保分页参数正确传递
    handleSizeChange(size) {
      console.log('每页大小变化，变为', size, '条');
      this.pagination.pageSize = size;
      this.pagination.page = 1;
      this.loadCases();
    },
    
    // 格式化日期 - 简化版本，确保能处理ISO格式的日期字符串
    formatDate(date) {
      if (!date) return '-';
      try {
        // 直接使用Date构造函数解析日期，它能处理ISO格式
        const parsedDate = new Date(date);
        // 验证日期是否有效
        if (!isNaN(parsedDate.getTime())) {
          // 使用toISOString方法获取ISO格式日期，然后截取日期部分
          return parsedDate.toISOString().split('T')[0];
        }
        return '-';
      } catch (error) {
        console.error('日期格式化错误:', error, '日期值:', date);
        return '-';
      }
    },
    
    // 查看案件详情
    async viewCaseDetail(id) {
      try {
        // 使用已经导入的caseAPI对象来调用API
        const response = await caseAPI.getCaseDetail(id);
        
        // 兼容不同的数据格式：后端返回{ success: true, case: caseData, data: caseData }
        let caseData = null;
        if (response && response.success) {
          // 优先使用response.case，其次使用response.data
          caseData = response.case || response.data;
        }
        
        if (caseData) {
          this.currentCase = caseData;
          this.detailDialogVisible = true;
        } else {
          this.$message.error('获取案件详情失败：无效的响应格式');
        }
      } catch (error) {
        this.$message.error('获取案件详情失败，请检查控制台日志');
      }
    },
    
    // 重置详情
    resetDetail() {
      this.currentCase = null;
    }
  }
};
</script>

<style scoped>
.all-cases-container {
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

.filter-section {
  margin-bottom: 20px;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 6px;
}

.table-section {
  margin-bottom: 20px;
  background: #fff;
  border-radius: 6px;
  padding: 20px;
}

.pagination-section {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
  padding: 15px 20px;
  background: #fff;
  border-radius: 6px;
}

.case-detail {
  max-height: 400px;
  overflow-y: auto;
}

.case-type-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

/* 响应式调整 */
@media (max-width: 1200px) {
  .filter-section .el-form--inline .el-form-item {
    margin-right: 0;
    margin-bottom: 12px;
    width: 100%;
  }
}

/* 表格样式优化 */
.el-table {
  border-radius: 6px;
  overflow: hidden;
}

.el-table__header {
  background-color: #f5f7fa;
}

.el-table__row:hover {
  background-color: #f5f7fa;
}
</style>