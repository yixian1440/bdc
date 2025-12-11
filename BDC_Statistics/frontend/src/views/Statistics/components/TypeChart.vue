<template>
  <BaseChart 
    :option="chartOption" 
    :height="height"
    :loading="loading"
    :show-empty-state="true"
    @chart-error="handleChartError"
  />
</template>

<script setup>
import { computed, watch, ref, onMounted, onUnmounted } from 'vue';
import BaseChart from './BaseChart.vue';
import { TypeStatistics } from '../types';

// 组件挂载状态
const isMounted = ref(false);

// Props定义
const props = defineProps({
  // 类型统计数据
  data: {
    type: Array,
    default: () => []
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
  }
});

// Emits定义
const emit = defineEmits(['error']);

// 计算图表配置项
const chartOption = computed(() => {
  // 确保组件已挂载
  if (!isMounted.value) return {};
  
  // 安全检查，确保数据是数组
  const typeData = Array.isArray(props.data) ? props.data : [];
  
  // 如果没有数据，返回空配置
  if (typeData.length === 0) {
    return {};
  }
  
  // 准备饼图数据，确保value是整数
  const pieData = typeData.map(item => ({
    name: item.name || item.type_name || '未知类型',
    value: parseInt(item.value || item.total_count || 0)
  })).filter(item => item.value > 0);
  
  // 计算总数用于百分比显示
  const total = pieData.reduce((sum, item) => sum + item.value, 0);
  
  // 定义颜色数组
  const colors = [
    '#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399',
    '#C06C84', '#5AB1EF', '#5CDBD3', '#F0DB4F', '#91CB74'
  ];
  
  return {
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        const percentage = total ? ((params.value / total) * 100).toFixed(2) : '0.00';
        return `${params.name}: ${params.value} (${percentage}%)`;
      }
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      textStyle: {
        fontSize: 12
      }
    },
    series: [
      {
        name: '类型分布',
        type: 'pie',
        radius: ['30%', '60%'],
        center: ['40%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: '16',
            fontWeight: 'bold',
            formatter: (params) => {
              const percentage = total ? ((params.value / total) * 100).toFixed(1) : '0';
              return `${params.name}\n${percentage}%`;
            }
          }
        },
        labelLine: {
          show: false
        },
        data: pieData,
        color: colors
      }
    ]
  };
});

// 处理图表错误
const handleChartError = (error) => {
  if (isMounted.value) {
    console.error('类型统计图表错误:', error);
    emit('error', error);
  }
};

// 监听数据变化，可在此添加额外逻辑
watch(() => props.data, () => {
  // 确保组件已挂载
  if (isMounted.value) {
    // 可以在这里添加数据变化时的处理逻辑
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


