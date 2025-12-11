<template>
  <div 
    ref="chartContainer" 
    :style="{ height: height || '300px' }"
    class="base-chart-container"
  >
    <div v-if="loading" class="chart-loading">
      <div class="loading-spinner"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick, shallowRef, computed } from 'vue';
import * as echarts from 'echarts';

// 节流函数
const throttle = (func, wait) => {
  let timeout;
  let previous = 0;
  return function executedFunction(...args) {
    const now = Date.now();
    const remaining = wait - (now - previous);
    const context = this;

    if (remaining <= 0) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func.apply(context, args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        previous = Date.now();
        timeout = null;
        func.apply(context, args);
      }, remaining);
    }
  };
};

// Props定义
const props = defineProps({
  // 图表配置项
  option: {
    type: Object,
    required: true
  },
  // 图表高度
  height: {
    type: [String, Number],
    default: '300px'
  },
  // 加载状态
  loading: {
    type: Boolean,
    default: false
  },
  // ECharts主题
  theme: {
    type: String,
    default: null
  },
  // 当数据为空时是否显示默认提示
  showEmptyState: {
    type: Boolean,
    default: true
  },
  // 自动响应式调整
  autoResize: {
    type: Boolean,
    default: true
  },
  // 节流间隔(ms)
  throttleInterval: {
    type: Number,
    default: 300
  },
  // 是否开启数据缓存
  enableCache: {
    type: Boolean,
    default: true
  }
});

// Emits定义
const emit = defineEmits(['chart-ready', 'chart-error']);

// 图表容器引用
const chartContainer = ref(null);
// 图表实例 - 使用shallowRef避免不必要的响应式
const chartInstance = shallowRef(null);
// 组件挂载状态
let isMounted = false;
// 缓存上次更新的选项哈希
let lastOptionHash = null;
// 数据缓存Map
const dataCache = new Map();

// 初始化图表
const initChart = async () => {
  // 加强保护检查
  if (!chartContainer.value || !isMounted) return;
  
  try {
    // 销毁已存在的实例
    cleanupChart();
    
    // 确保DOM元素可用且尚未被移除
    await nextTick();
    
    // 再次检查DOM元素和挂载状态
    if (!chartContainer.value || !isMounted) return;
    
    // 创建新实例
    chartInstance.value = echarts.init(chartContainer.value, props.theme, {
      renderer: 'canvas', // 优先使用canvas渲染器提升性能
      useDirtyRect: true // 启用脏矩形渲染
    });
    
    // 设置初始配置
    updateChart();
    
    // 监听窗口大小变化 - 使用节流优化
    if (props.autoResize) {
      const handleResize = throttle(() => {
        // 加强保护检查
        if (!isMounted || !chartContainer.value || !chartInstance.value || typeof chartInstance.value.resize !== 'function') {
          return;
        }
        chartInstance.value.resize();
      }, props.throttleInterval);
      
      window.addEventListener('resize', handleResize);
      chartInstance.value._resizeHandler = handleResize;
    }
    
    // 通知父组件图表已准备就绪
    emit('chart-ready', chartInstance.value);
    
  } catch (error) {
    console.error('初始化图表失败:', error);
    emit('chart-error', error);
    // 发生错误时确保清理资源
    cleanupChart();
  }
};

// 生成选项哈希
const generateOptionHash = (option) => {
  try {
    // 只对series数据生成哈希，忽略样式等其他配置
    const seriesData = option?.series?.map(s => s.data || []).flat() || [];
    return JSON.stringify(seriesData);
  } catch (e) {
    return null;
  }
};

// 更新图表配置
const updateChart = () => {
  // 加强保护检查：确保组件已挂载、容器存在且图表实例有效
  if (!isMounted || !chartContainer.value || !chartInstance.value) return;
  
  try {
    // 使用缓存优化 - 检查数据是否发生变化
    const currentHash = generateOptionHash(props.option);
    
    // 如果启用缓存且数据没有变化，则跳过更新
    if (props.enableCache && currentHash && currentHash === lastOptionHash) {
      return;
    }
    
    // 检查数据是否为空
    const hasData = checkData(props.option);
    
    // 使用脏矩形更新模式
    const updateMode = currentHash && lastOptionHash ? 'replaceMerge' : 'replace';
    
    if (!hasData && props.showEmptyState) {
      // 显示空状态配置
      chartInstance.value.setOption({
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
      }, true);
    } else {
      // 设置正常配置 - 使用增量更新模式提升性能
      chartInstance.value.setOption(props.option, true);
    }
    
    // 更新缓存
    lastOptionHash = currentHash;
  } catch (error) {
    console.error('更新图表配置失败:', error);
    emit('chart-error', error);
  }
};

// 检查是否有数据 - 更高效的检查方式
const checkData = (option) => {
  if (!option || typeof option !== 'object') return false;
  
  // 快速路径：优先检查缓存
  const cacheKey = JSON.stringify(option?.series || []);
  if (dataCache.has(cacheKey)) {
    return dataCache.get(cacheKey);
  }
  
  // 检查series数据
  let result = false;
  if (Array.isArray(option.series)) {
    // 使用some方法短路优化
    result = option.series.some(series => {
      // 检查各种数据格式
      if (!series) return false;
      
      // 检查普通数据数组
      if (series.data && Array.isArray(series.data)) {
        return series.data.length > 0;
      }
      
      // 检查value类型数据
      return series.value !== undefined && series.value !== null;
    });
  }
  
  // 缓存结果
  if (props.enableCache) {
    dataCache.set(cacheKey, result);
  }
  
  return result;
};

// 重新调整大小
const resize = () => {
  // 加强保护检查
  if (!isMounted || !chartContainer.value || !chartInstance.value || typeof chartInstance.value.resize !== 'function') {
    return;
  }
  
  try {
    chartInstance.value.resize();
  } catch (error) {
    console.error('调整图表大小失败:', error);
    emit('chart-error', error);
  }
};

// 清理图表实例 - 更彻底的资源清理
const cleanupChart = () => {
  if (chartInstance.value) {
    try {
      // 移除事件监听器
      if (chartInstance.value._resizeHandler) {
        window.removeEventListener('resize', chartInstance.value._resizeHandler);
        chartInstance.value._resizeHandler = null;
      }
      
      // 清除所有事件监听器
      chartInstance.value.off('*');
      
      // 销毁实例
      if (typeof chartInstance.value.dispose === 'function') {
        chartInstance.value.dispose();
      }
    } catch (error) {
      console.warn('清理图表实例时出错:', error);
    } finally {
      chartInstance.value = null;
    }
  }
  
  // 清理缓存
  lastOptionHash = null;
  dataCache.clear();
};

// 监听选项变化 - 使用浅监听和防抖优化
watch(() => props.option, () => {
  nextTick(() => {
    updateChart();
  });
}, { deep: false }); // 不使用deep以避免深层次的性能消耗

// 监听高度变化
watch(() => props.height, () => {
  nextTick(() => {
    resize();
  });
});

// 生命周期钩子
onMounted(() => {
  isMounted = true;
  initChart();
});

onUnmounted(() => {
  isMounted = false;
  cleanupChart();
});

// 手动清除缓存
const clearCache = () => {
  lastOptionHash = null;
  dataCache.clear();
};

// 暴露方法给父组件
defineExpose({
  initChart,
  resize,
  clearCache,
  chartInstance: () => chartInstance.value
});
</script>

<style scoped>
.base-chart-container {
  position: relative;
  width: 100%;
}

.chart-loading {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.loading-spinner {
  width: 30px;
  height: 30px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #409EFF;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
