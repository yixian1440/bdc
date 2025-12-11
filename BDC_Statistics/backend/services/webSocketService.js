import { WebSocketServer, WebSocket } from 'ws';

/**
 * WebSocket服务类
 * 用于实现实时消息推送功能
 */
class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // 存储连接的客户端，key: client.id, value: client
  }

  /**
   * 初始化WebSocket服务
   * @param {http.Server} server - HTTP服务器实例
   */
  initialize(server) {
    // 创建WebSocket服务器
    this.wss = new WebSocketServer({
      server,
      path: '/ws',
      perMessageDeflate: {
        zlibDeflateOptions: {
          chunkSize: 1024,
          memLevel: 7,
          level: 3
        },
        zlibInflateOptions: {
          chunkSize: 10 * 1024
        },
        clientNoContextTakeover: true,
        serverNoContextTakeover: true,
        serverMaxWindowBits: 10,
        concurrencyLimit: 10,
        threshold: 1024
      }
    });

    // 设置事件监听器
    this.setupEventListeners();

    console.log('WebSocket服务已初始化，路径: /ws');
  }

  /**
   * 设置WebSocket事件监听器
   */
  setupEventListeners() {
    this.wss.on('connection', (ws, req) => {
      // 为客户端生成唯一ID
      const clientId = this.generateClientId();
      ws.id = clientId;
      
      // 存储客户端连接
      this.clients.set(clientId, ws);
      console.log(`客户端已连接，ID: ${clientId}，当前连接数: ${this.clients.size}`);

      // 发送欢迎消息
      this.sendMessageToClient(clientId, {
        type: 'welcome',
        message: '欢迎连接到BDC统计系统WebSocket服务',
        clientId,
        timestamp: new Date().toISOString()
      });

      // 监听客户端消息
      ws.on('message', (message) => {
        this.handleClientMessage(clientId, message);
      });

      // 监听客户端断开连接
      ws.on('close', (code, reason) => {
        this.handleClientDisconnect(clientId, code, reason);
      });

      // 监听客户端错误
      ws.on('error', (error) => {
        this.handleClientError(clientId, error);
      });
    });

    // 监听服务器错误
    this.wss.on('error', (error) => {
      console.error('WebSocket服务器错误:', error);
    });

    // 监听服务器关闭
    this.wss.on('close', () => {
      console.log('WebSocket服务器已关闭');
    });
  }

  /**
   * 生成客户端唯一ID
   * @returns {string} 客户端ID
   */
  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 处理客户端消息
   * @param {string} clientId - 客户端ID
   * @param {Buffer} messageBuffer - 消息缓冲区
   */
  handleClientMessage(clientId, messageBuffer) {
    try {
      const message = JSON.parse(messageBuffer.toString());
      console.log(`收到客户端消息，ID: ${clientId}，消息类型: ${message.type}`);

      // 根据消息类型处理
      switch (message.type) {
        case 'ping':
          this.sendMessageToClient(clientId, {
            type: 'pong',
            timestamp: new Date().toISOString()
          });
          break;
        case 'subscribe':
          this.handleSubscribe(clientId, message);
          break;
        case 'unsubscribe':
          this.handleUnsubscribe(clientId, message);
          break;
        default:
          console.log(`未知消息类型: ${message.type}`);
      }
    } catch (error) {
      console.error(`处理客户端消息错误，ID: ${clientId}`, error);
    }
  }

  /**
   * 处理客户端订阅
   * @param {string} clientId - 客户端ID
   * @param {Object} message - 消息对象
   */
  handleSubscribe(clientId, message) {
    const { channel } = message;
    const client = this.clients.get(clientId);
    
    if (client) {
      // 初始化客户端的订阅列表
      if (!client.subscriptions) {
        client.subscriptions = new Set();
      }
      
      // 添加订阅
      client.subscriptions.add(channel);
      console.log(`客户端 ${clientId} 已订阅频道: ${channel}`);
      
      // 发送订阅确认
      this.sendMessageToClient(clientId, {
        type: 'subscribe_ack',
        channel,
        message: `已成功订阅频道: ${channel}`,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 处理客户端取消订阅
   * @param {string} clientId - 客户端ID
   * @param {Object} message - 消息对象
   */
  handleUnsubscribe(clientId, message) {
    const { channel } = message;
    const client = this.clients.get(clientId);
    
    if (client && client.subscriptions) {
      // 移除订阅
      client.subscriptions.delete(channel);
      console.log(`客户端 ${clientId} 已取消订阅频道: ${channel}`);
      
      // 发送取消订阅确认
      this.sendMessageToClient(clientId, {
        type: 'unsubscribe_ack',
        channel,
        message: `已成功取消订阅频道: ${channel}`,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 处理客户端断开连接
   * @param {string} clientId - 客户端ID
   * @param {number} code - 断开连接代码
   * @param {string} reason - 断开连接原因
   */
  handleClientDisconnect(clientId, code, reason) {
    this.clients.delete(clientId);
    console.log(`客户端已断开连接，ID: ${clientId}，代码: ${code}，原因: ${reason || '无'}`);
    console.log(`当前连接数: ${this.clients.size}`);
  }

  /**
   * 处理客户端错误
   * @param {string} clientId - 客户端ID
   * @param {Error} error - 错误对象
   */
  handleClientError(clientId, error) {
    console.error(`客户端错误，ID: ${clientId}`, error);
  }

  /**
   * 向特定客户端发送消息
   * @param {string} clientId - 客户端ID
   * @param {Object} message - 消息对象
   */
  sendMessageToClient(clientId, message) {
    const client = this.clients.get(clientId);
    
    if (client && client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(message));
        console.log(`向客户端 ${clientId} 发送消息，类型: ${message.type}`);
      } catch (error) {
        console.error(`向客户端 ${clientId} 发送消息错误:`, error);
      }
    } else {
      console.warn(`客户端 ${clientId} 不可用，状态: ${client?.readyState}`);
    }
  }

  /**
   * 向所有客户端广播消息
   * @param {Object} message - 消息对象
   */
  broadcastToAllClients(message) {
    console.log(`向所有客户端广播消息，类型: ${message.type}`);
    
    this.clients.forEach((client, clientId) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(JSON.stringify(message));
        } catch (error) {
          console.error(`向客户端 ${clientId} 广播消息错误:`, error);
        }
      }
    });
  }

  /**
   * 向特定频道的所有订阅者发送消息
   * @param {string} channel - 频道名称
   * @param {Object} message - 消息对象
   */
  broadcastToChannel(channel, message) {
    console.log(`向频道 ${channel} 的订阅者广播消息，类型: ${message.type}`);
    
    this.clients.forEach((client, clientId) => {
      if (client.readyState === WebSocket.OPEN && client.subscriptions && client.subscriptions.has(channel)) {
        try {
          client.send(JSON.stringify(message));
        } catch (error) {
          console.error(`向客户端 ${clientId} 发送频道消息错误:`, error);
        }
      }
    });
  }

  /**
   * 发送案件更新通知
   * @param {Object} caseData - 案件数据
   * @param {string} action - 操作类型（create, update, delete, allocate）
   */
  sendCaseUpdate(caseData, action = 'create') {
    const message = {
      type: 'caseUpdate',
      action,
      caseData,
      timestamp: new Date().toISOString()
    };
    
    // 广播到所有客户端
    this.broadcastToAllClients(message);
    
    // 同时发送到特定频道
    this.broadcastToChannel('cases', message);
    this.broadcastToChannel('statistics', message);
  }

  /**
   * 发送统计数据更新通知
   * @param {Object} statsData - 统计数据
   */
  sendStatisticsUpdate(statsData) {
    const message = {
      type: 'statisticsUpdate',
      statsData,
      timestamp: new Date().toISOString()
    };
    
    // 广播到所有客户端
    this.broadcastToAllClients(message);
    
    // 同时发送到特定频道
    this.broadcastToChannel('statistics', message);
  }

  /**
   * 发送轮询提醒消息
   * @param {Object} reminderData - 轮询提醒数据
   */
  sendPollingReminder(reminderData) {
    const message = {
      type: 'pollingReminder',
      reminderData,
      timestamp: new Date().toISOString()
    };
    
    // 广播到所有客户端
    this.broadcastToAllClients(message);
    
    // 同时发送到特定频道
    this.broadcastToChannel('cases', message);
    this.broadcastToChannel('allocation', message);
  }

  /**
   * 获取当前连接的客户端数量
   * @returns {number} 客户端数量
   */
  getClientCount() {
    return this.clients.size;
  }

  /**
   * 关闭WebSocket服务
   */
  close() {
    if (this.wss) {
      console.log('正在关闭WebSocket服务...');
      this.wss.close(() => {
        console.log('WebSocket服务已关闭');
      });
    }
  }
}

// 创建单例实例
const webSocketService = new WebSocketService();

export default webSocketService;
