import { computed } from 'vue';

/**
 * 图表配置管理的组合式函数
 * 提供通用的图表配置、样式和主题设置
 */
export function useChartConfig() {
  // 默认图表主题颜色
  const themeColors = [
    '#409EFF', // 主色
    '#67C23A', // 成功色
    '#E6A23C', // 警告色
    '#F56C6C', // 危险色
    '#909399', // 灰色
    '#C0C4CC', // 边框色
    '#1F2329', // 文字色-主
    '#606266', // 文字色-常规
    '#909399', // 文字色-次要
    '#F0F2F5', // 背景色
  ];
  

  
  // 默认图表配置
  const defaultChartOptions = computed(() => ({
    // 默认的网格配置
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '3%',
      containLabel: true
    },
    
    // 默认的提示框配置
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      borderColor: 'transparent',
      textStyle: {
        color: '#fff',
        fontSize: 12
      }
    },
    
    // 默认的图例配置
    legend: {
      textStyle: {
        fontSize: 12,
        color: themeColors[5]
      }
    },
    
    // 默认的X轴配置
    defaultXAxis: {
      type: 'category',
      axisLine: {
        lineStyle: {
          color: themeColors[5]
        }
      },
      axisLabel: {
        color: themeColors[6],
        fontSize: 12
      },
      splitLine: {
        show: false
      }
    },
    
    // 默认的Y轴配置
    defaultYAxis: {
      type: 'value',
      axisLine: {
        show: false
      },
      axisTick: {
        show: false
      },
      axisLabel: {
        color: themeColors[6],
        fontSize: 12
      },
      splitLine: {
        lineStyle: {
          color: themeColors[9],
          type: 'dashed'
        }
      }
    }
  }));
  
  // 饼图默认配置
  const pieChartDefaults = computed(() => ({
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 10,
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
          fontSize: '18',
          fontWeight: 'bold',
          formatter: '{b}\n{d}%'
        },
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      },
      labelLine: {
        show: false
      }
    }]
  }));
  
  // 柱状图默认配置
  const barChartDefaults = computed(() => ({
    series: [{
      type: 'bar',
      barWidth: '60%',
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }]
  }));
  
  // 折线图默认配置
  const lineChartDefaults = computed(() => ({
    series: [{
      type: 'line',
      smooth: true,
      emphasis: {
        focus: 'series'
      },
      lineStyle: {
        width: 3
      },
      itemStyle: {
        borderWidth: 2,
        borderColor: '#fff'
      }
    }]
  }));
  
  // 空数据提示配置
  const emptyChartOptions = computed(() => ({
    title: {
      text: '暂无数据',
      left: 'center',
      top: 'center',
      textStyle: {
        color: themeColors[5],
        fontSize: 14
      }
    },
    tooltip: {}
  }));
  
  // 合并配置项
  const mergeChartOptions = (...options) => {
    return options.reduce((acc, curr) => {
      if (!curr || typeof curr !== 'object') return acc;
      
      Object.keys(curr).forEach(key => {
        if (acc[key] && typeof acc[key] === 'object' && !Array.isArray(acc[key]) &&
            curr[key] && typeof curr[key] === 'object' && !Array.isArray(curr[key])) {
          // 递归合并嵌套对象
          acc[key] = mergeChartOptions(acc[key], curr[key]);
        } else {
          // 简单覆盖
          acc[key] = curr[key];
        }
      });
      
      return acc;
    }, {});
  };
  
  // 格式化图表提示文本
  const formatTooltip = (params) => {
    if (!Array.isArray(params)) return '';
    
    // 获取标题（通常是第一个参数的名称）
    const title = params[0]?.name || '';
    
    // 生成提示内容
    let content = `${title}<br/>`;
    
    params.forEach(param => {
      if (param) {
        content += `
<span style="display:inline-block;margin-right:5px;border-radius:10px;width:10px;height:10px;background-color:${param.color || themeColors[0]};"></span>
${param.seriesName || ''}: ${param.value || 0}`;
        
        // 如果有百分比数据，显示百分比
        if (param.percent !== undefined) {
          content += ` (${param.percent}%)`;
        }
        
        content += `<br/>`;
      }
    });
    
    return content;
  };
  
  // 为系列数据生成颜色
  const generateSeriesColors = (dataLength, baseColors = themeColors.slice(0, 4)) => {
    const colors = [];
    
    for (let i = 0; i < dataLength; i++) {
      colors.push(baseColors[i % baseColors.length]);
    }
    
    return colors;
  };
  
  // 返回公开的方法和配置
  return {
    // 主题
    themeColors,
    
    // 默认配置
    defaultChartOptions,
    pieChartDefaults,
    barChartDefaults,
    lineChartDefaults,
    emptyChartOptions,
    
    // 工具方法
    mergeChartOptions,
    formatTooltip,
    generateSeriesColors
  };
}
