// 统计数据相关类型定义

/**
 * 案件类型统计
 * @typedef {Object} TypeStatistics
 * @property {string} type_name - 案件类型名称
 * @property {number} count - 案件数量
 * @property {number} [percentage] - 占比百分比
 */



/**
 * 收件人统计数据
 * @typedef {Object} ReceiverStats
 * @property {string} receiver - 收件人名称
 * @property {number} total_count - 总数量
 */

/**
 * 角色统计数据
 * @typedef {Object} RoleStatistics
 * @property {string} role_name - 角色名称
 * @property {number} total_count - 总数量
 */

/**
 * 开发商统计数据
 * @typedef {Object} DeveloperStatistics
 * @property {string} developer_name - 开发商名称
 * @property {number} total_count - 总数量
 */

/**
 * 收件人排名数据（按角色分组）
 * @typedef {Object.<string, ReceiverStats[]>} ReceiverRanking
 */

/**
 * 完整统计数据结构
 * @typedef {Object} StatisticsData
 * @property {number} total_cases - 总案件数
 * @property {number} completed_cases - 已完成案件数
 * @property {number} pending_cases - 待处理案件数
 * @property {TypeStatistics[]} type_statistics - 案件类型统计
 * @property {ReceiverStats[]} receiver_stats - 收件人统计
 * @property {RoleStatistics[]} role_statistics - 角色统计
 * @property {DeveloperStatistics[]} developer_statistics - 开发商统计
 * @property {ReceiverRanking} receiver_ranking - 收件人排名
 * @property {any[]} developer_stats - 开发商统计
 */

/**
 * 图表配置类型
 * @typedef {Object} ChartConfig
 * @property {string} [title] - 图表标题
 * @property {string|number} [height] - 图表高度
 * @property {boolean} [loading] - 加载状态
 * @property {string} [theme] - 图表主题
 */

// 导出类型定义
// 由于这些只是JSDoc类型定义，实际导出空对象作为占位符
export const TypeStatistics = {};
export const ReceiverStats = {};
export const RoleStatistics = {};
export const DeveloperStatistics = {};
export const ReceiverRanking = {};
export const StatisticsData = {};
export const ChartConfig = {};

// 也可以导出默认对象
export default {
  TypeStatistics,
  ReceiverStats,
  RoleStatistics,
  DeveloperStatistics,
  ReceiverRanking,
  StatisticsData,
  ChartConfig
};
