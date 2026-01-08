/**
 * 用户信息获取工具
 * 用于统一处理用户信息的获取，包括IP地址和Mac地址
 */
class UserInfoUtils {
    /**
     * 从请求对象中获取用户IP地址
     * @param {Object} req - Express请求对象
     * @returns {string} 用户IP地址
     */
    static getIpAddress(req) {
        // 尝试从不同来源获取IP地址
        const ipAddress = req.ip || 
                         req.connection.remoteAddress || 
                         req.socket.remoteAddress || 
                         req.connection.socket.remoteAddress ||
                         req.headers['x-forwarded-for'] ||
                         req.headers['x-real-ip'] ||
                         '未知';
        
        // 处理IPv6地址
        if (ipAddress === '::1') {
            return '127.0.0.1';
        }
        
        // 处理代理链中的第一个IP
        if (ipAddress.includes(',')) {
            return ipAddress.split(',')[0].trim();
        }
        
        return ipAddress;
    }
    
    /**
     * 从请求对象中获取用户Mac地址
     * @param {Object} req - Express请求对象
     * @returns {string} 用户Mac地址
     */
    static getMacAddress(req) {
        // 注意：浏览器环境下无法直接获取Mac地址
        // 1. 尝试从自定义请求头获取
        const macFromHeader = req.headers['x-mac-address'] || 
                             req.headers['mac-address'] ||
                             req.headers['x-mac'];
        
        if (macFromHeader) {
            return macFromHeader;
        }
        
        // 2. 尝试从网络接口获取（仅在服务器端直接访问时有效）
        try {
            const os = require('os');
            const interfaces = os.networkInterfaces();
            
            // 遍历网络接口，查找非本地、非IPv6的地址
            for (const iface in interfaces) {
                for (const addr of interfaces[iface]) {
                    if (addr.family === 'IPv4' && !addr.internal) {
                        return addr.mac || '未知';
                    }
                }
            }
        } catch (error) {
            // 忽略错误，返回默认值
        }
        
        return '未知';
    }
    
    /**
     * 从请求对象中获取完整的用户信息
     * @param {Object} req - Express请求对象
     * @returns {Object} 用户信息对象
     */
    static getUserInfo(req) {
        return {
            ipAddress: this.getIpAddress(req),
            macAddress: this.getMacAddress(req),
            userAgent: req.headers['user-agent'] || '未知',
            username: req.user?.username || '未知',
            userId: req.user?.id || null
        };
    }
}

export default UserInfoUtils;