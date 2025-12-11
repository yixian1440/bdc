<template>
  <el-card class="chart-card" :header="chartTitle">
    <BaseChart 
      :option="chartOption" 
      :height="height"
      :loading="loading"
      :show-empty-state="true"
      @chart-error="handleChartError"
    />
  </el-card>
</template>

<script setup>
import { computed, watch, ref, onMounted, onUnmounted } from 'vue';
import * as echarts from 'echarts';
import BaseChart from './BaseChart.vue';
import { ReceiverRanking } from '../types';

// 组件挂载状态
const isMounted = ref(false);

// Props定义
const props = defineProps({
  // 收件人排名数据（按角色分组）
  receiverRanking: {
    type: Object,
    default: () => ({})
  },
  // 当前激活的角色标签
  activeRole: {
    type: String,
    default: ''
  },
  // 加载状态
  loading: {
    type: Boolean,
    default: false
  },
  // 图表高度
  height: {
    type: [String, Number],
    default: '300px'
  },
  // 显示的数据条数
  displayCount: {
    type: Number,
    default: 10
  }
});

// Emits定义
const emit = defineEmits(['error']);

// 获取当前角色的收件人数据
const currentRoleData = computed(() => {
  // 安全检查
  if (!props.receiverRanking || typeof props.receiverRanking !== 'object') {
    return [];
  }
  
  // 确定要使用的角色
  let roleToUse = props.activeRole;
  if (!roleToUse) {
    // 如果没有指定角色，使用第一个可用角色
    const roles = Object.keys(props.receiverRanking);
    roleToUse = roles.length > 0 ? roles[0] : '';
  }
  
  // 获取对应角色的数据并确保是数组
  const roleData = props.receiverRanking[roleToUse];
  return Array.isArray(roleData) ? roleData : [];
});

// 动态生成图表标题
const chartTitle = computed(() => {
  // 安全检查
  if (!props.receiverRanking || typeof props.receiverRanking !== 'object') {
    return '处理人统计';
  }
  
  // 确定要使用的角色
  let roleToUse = props.activeRole;
  if (!roleToUse) {
    // 如果没有指定角色，使用第一个可用角色
    const roles = Object.keys(props.receiverRanking);
    roleToUse = roles.length > 0 ? roles[0] : '';
  }
  
  // 根据角色生成标题
  const titleMapping = {
    '处理人': '处理人统计',
    '收件人': '收件人统计',
    '管理员': '管理员统计'
  };
  
  return titleMapping[roleToUse] || `${roleToUse}统计`;
});

// 计算图表配置项
const chartOption = computed(() => {
  // 确保组件已挂载
  if (!isMounted.value) return {};
  
  // 处理数据，确保安全访问
  const chartData = currentRoleData.value
    .filter(item => item && (item.receiver || item.name))
    .map(item => ({
      receiver: item.receiver || item.name || '未知',
      total_count: item.total_count || item.value || 0
    }))
    .sort((a, b) => b.total_count - a.total_count)
    .slice(0, props.displayCount); // 只显示指定数量的数据
  
  // 如果没有数据，返回空配置
  if (chartData.length === 0) {
    return {
      title: {
        text: '暂无数据',
        left: 'center',
        top: 'center',
        textStyle: {
          color: '#909399',
          fontSize: 14
        }
      },
      series: []
    };
  }
  
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: '{b}: {c} 件'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '25%', // 为旋转的标签留出空间
      top: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: chartData.map(item => item.receiver),
      axisLabel: {
        interval: 0,
        rotate: 45, // 旋转标签以便更好地显示
        fontSize: 12,
        color: '#606266'
      },
      axisLine: {
        lineStyle: {
          color: '#dcdfe6'
        }
      }
    },
    yAxis: {
      type: 'value',
      min: 0,
      axisLabel: {
        formatter: '{value} 件',
        color: '#606266'
      },
      axisLine: {
        show: false
      },
      splitLine: {
        lineStyle: {
          color: '#f0f2f5',
          type: 'dashed'
        }
      },
      // 设置Y轴刻度为整数
      axisTick: {
        alignWithLabel: true
      },
      splitNumber: 5,
      minInterval: 1
    },
    series: [
      {
        name: '收件量',
        type: 'bar',
        data: chartData.map(item => item.total_count),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#83bff6' },
            { offset: 0.5, color: '#188df0' },
            { offset: 1, color: '#188df0' }
          ]),
          borderRadius: [4, 4, 0, 0]
        },
        emphasis: {
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#2378f7' },
              { offset: 0.7, color: '#2378f7' },
              { offset: 1, color: '#83bff6' }
            ])
          }
        },
        barWidth: '60%'
      }
    ]
  };
});

// 处理图表错误
const handleChartError = (error) => {
  if (isMounted.value) {
    console.error('收件人分布图表错误:', error);
    emit('error', error);
  }
};

// 监听数据和角色变化
watch([() => props.receiverRanking, () => props.activeRole], () => {
  // 确保组件已挂载
  if (isMounted.value) {
    // 可以在这里添加数据或角色变化时的额外处理逻辑
  }
}, { deep: true });

// 生命周期钩子
onMounted(() => {
  isMounted.value = true;
});

onUnmounted(() => {
  isMounted.value = false;
});
</script>

<style scoped>
.chart-card {
  margin-bottom: 20px;
}
</style>
