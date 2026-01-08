import { ref, computed } from 'vue';

class WebSocketService {
    constructor() {
        this.ws = null;
        this.isConnected = ref(false);
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 3000; // 3秒
        this.eventCallbacks = new Map(); // 存储事件回调函数
        this.pendingMessages = []; // 连接建立前的待发送消息
        
        // 动态获取当前页面的WebSocket URL
        // 从当前页面URL中提取协议和主机，构建WebSocket URL
        this.wsUrl = this.getDynamicWebSocketUrl();
    }
    
    // 动态获取WebSocket URL
    getDynamicWebSocketUrl() {
        // 获取当前页面的URL
        const currentUrl = window.location.href;
        const url = new URL(currentUrl);
        
        // 将HTTP/HTTPS替换为WS/WSS
        const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        
        // 构建WebSocket URL
        return `${protocol}//${url.host}/ws`;
    }

    // 建立WebSocket连接
    connect() {
        try {
            // 每次连接前重新获取最新的WebSocket URL
            this.wsUrl = this.getDynamicWebSocketUrl();
            
            this.ws = new WebSocket(this.wsUrl);

            this.ws.onopen = () => {
                console.log(`WebSocket连接已建立，URL: ${this.wsUrl}`);
                this.isConnected.value = true;
                this.reconnectAttempts = 0;

                // 发送所有待发送的消息
                this.pendingMessages.forEach(message => {
                    this.send(message);
                });
                this.pendingMessages = [];

                // 发送订阅事件
                this.subscribeToEvents();
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (error) {
                    console.error('解析WebSocket消息失败:', error);
                }
            };

            this.ws.onerror = (error) => {
                console.error(`WebSocket错误，URL: ${this.wsUrl}`, error);
            };

            this.ws.onclose = () => {
                console.log(`WebSocket连接已关闭，URL: ${this.wsUrl}`);
                this.isConnected.value = false;

                // 尝试重连
                this.attemptReconnect();
            };
        } catch (error) {
            console.error(`创建WebSocket连接失败，URL: ${this.wsUrl}`, error);
            this.attemptReconnect();
        }
    }

    // 尝试重连
    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            
            setTimeout(() => {
                this.connect();
            }, this.reconnectDelay);
        } else {
            console.error('达到最大重连尝试次数，停止重连');
        }
    }

    // 发送消息
    send(message) {
        if (this.isConnected.value && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            // 如果未连接，将消息加入待发送队列
            this.pendingMessages.push(message);
            
            // 如果未连接且未在重连中，尝试连接
            if (!this.isConnected.value) {
                this.connect();
            }
        }
    }

    // 订阅事件
    subscribeToEvents() {
        // 发送用户身份信息
        this.sendUserIdentification();
        
        // 订阅案件更新事件
        this.send({
            type: 'subscribe',
            channel: 'cases'
        });

        // 订阅统计数据更新事件
        this.send({
            type: 'subscribe',
            channel: 'statistics'
        });
    }

    // 订阅特定频道
    subscribe(channel) {
        this.send({
            type: 'subscribe',
            channel
        });
    }

    // 断开连接
    disconnect() {
        this.close();
    }
    
    // 发送用户身份信息
    sendUserIdentification() {
        const userInfo = localStorage.getItem('userInfo');
        if (userInfo) {
            try {
                const { id, real_name, role } = JSON.parse(userInfo);
                this.send({
                    type: 'identify',
                    userId: id,
                    userName: real_name,
                    userRole: role
                });
                console.log('已发送用户身份信息到WebSocket服务器');
            } catch (error) {
                console.error('解析用户信息失败:', error);
            }
        }
    }

    // 处理收到的消息
    handleMessage(data) {
        const { type, caseData, statsData, action, reminderData, title, content, messageType } = data;

        if (type === 'caseUpdate') {
            if (this.eventCallbacks.has('caseUpdate')) {
                const callbacks = this.eventCallbacks.get('caseUpdate');
                callbacks.forEach(callback => {
                    try {
                        callback({ caseData, action });
                    } catch (error) {
                        console.error('执行caseUpdate事件回调失败:', error);
                    }
                });
            }
        } else if (type === 'statisticsUpdate') {
            if (this.eventCallbacks.has('statisticsUpdate')) {
                const callbacks = this.eventCallbacks.get('statisticsUpdate');
                callbacks.forEach(callback => {
                    try {
                        callback(statsData);
                    } catch (error) {
                        console.error('执行statisticsUpdate事件回调失败:', error);
                    }
                });
            }
        } else if (type === 'pollingReminder') {
            if (this.eventCallbacks.has('pollingReminder')) {
                const callbacks = this.eventCallbacks.get('pollingReminder');
                callbacks.forEach(callback => {
                    try {
                        callback(reminderData);
                    } catch (error) {
                        console.error('执行pollingReminder事件回调失败:', error);
                    }
                });
            }
        } else if (type === 'messageNotification') {
            if (this.eventCallbacks.has('messageNotification')) {
                const callbacks = this.eventCallbacks.get('messageNotification');
                callbacks.forEach(callback => {
                    try {
                        callback({ title, content, messageType });
                    } catch (error) {
                        console.error('执行messageNotification事件回调失败:', error);
                    }
                });
            }
        } else if (type === 'chatMessage') {
            if (this.eventCallbacks.has('chatMessage')) {
                const callbacks = this.eventCallbacks.get('chatMessage');
                callbacks.forEach(callback => {
                    try {
                        callback(data);
                    } catch (error) {
                        console.error('执行chatMessage事件回调失败:', error);
                    }
                });
            }
        } else if (type === 'userActivityUpdate') {
            if (this.eventCallbacks.has('userActivityUpdate')) {
                const callbacks = this.eventCallbacks.get('userActivityUpdate');
                callbacks.forEach(callback => {
                    try {
                        callback(data);
                    } catch (error) {
                        console.error('执行userActivityUpdate事件回调失败:', error);
                    }
                });
            }
        }
    }

    // 注册事件监听器
    on(event, callback) {
        if (!this.eventCallbacks.has(event)) {
            this.eventCallbacks.set(event, []);
        }
        this.eventCallbacks.get(event).push(callback);

        // 返回一个取消订阅函数
        return () => {
            this.off(event, callback);
        };
    }

    // 取消事件监听器
    off(event, callback) {
        if (this.eventCallbacks.has(event)) {
            const callbacks = this.eventCallbacks.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    // 关闭WebSocket连接
    close() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected.value = false;
        this.eventCallbacks.clear();
    }

    // 获取连接状态
    getConnectionStatus() {
        return this.isConnected;
    }

    // 重新连接
    reconnect() {
        this.reconnectAttempts = 0;
        this.close();
        this.connect();
    }
}

// 创建单例实例
const webSocketService = new WebSocketService();

// 自动连接
webSocketService.connect();

export default webSocketService;