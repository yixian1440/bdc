import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/database.js';
import { getUserCreatableCaseTypes } from '../middleware/casePermission.js';
import NotificationService from '../services/notificationService.js';
import webSocketService from '../services/webSocketService.js';

const router = express.Router();
// 确保JWT密钥与auth.js中使用相同的值
const JWT_SECRET = process.env.JWT_SECRET || 'bdc_statistics_secure_jwt_secret_key_2024';

// 认证中间件
const authenticateToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: '需要认证' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ error: '无效的认证令牌' });
    }
};

// 获取用户可创建的案件类型权限
router.get('/case-permissions', authenticateToken, async (req, res) => {
    try {
        const userRole = req.user.role;
        const creatableTypes = await getUserCreatableCaseTypes(userRole);
        
        res.json({
            success: true,
            data: {
                creatableTypes,
                role: userRole
            }
        });
    } catch (error) {
        console.error('获取用户案件权限失败:', error);
        res.status(500).json({
            success: false,
            message: '获取用户权限失败',
            error: error.message
        });
    }
});

// 获取用户未读消息数量
router.get('/unread-count', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const count = await NotificationService.getUnreadMessageCount(userId);
        
        res.json({
            success: true,
            data: {
                unreadCount: count
            }
        });
    } catch (error) {
        console.error('获取未读消息数量失败:', error);
        res.status(500).json({
            success: false,
            message: '获取未读消息数量失败',
            error: error.message
        });
    }
});

// 获取在线用户列表
router.get('/online', authenticateToken, async (req, res) => {
    try {
        const onlineUsers = webSocketService.getOnlineUsers();
        
        res.json({
            success: true,
            data: {
                users: onlineUsers
            }
        });
    } catch (error) {
        console.error('获取在线用户列表失败:', error);
        res.status(500).json({
            success: false,
            message: '获取在线用户列表失败',
            error: error.message
        });
    }
});

// 验证是否为管理员的中间件
const verifyAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: '用户信息未认证' });
    }
    // 添加更灵活的管理员角色验证，支持'管理员'和可能的其他管理员角色
    const adminRoles = ['管理员', 'administrator', 'admin'];
    if (!adminRoles.includes(req.user.role)) {
        console.log('用户角色验证失败，当前角色:', req.user.role, '，需要角色:', adminRoles);
        return res.status(403).json({ error: '只有管理员可以访问此功能', currentRole: req.user.role });
    }
    next();
};

// 获取所有用户列表（用于消息发送）
router.get('/all', authenticateToken, async (req, res) => {
    try {
        console.log('用户列表API被调用，用户角色:', req.user?.role);
        
        // 简化的查询，确保SQL语句正确
        const [users] = await db.execute(
            'SELECT id, username, real_name, role, status FROM users'
        );
        
        console.log('查询成功，返回用户数:', users.length);
        res.json({
            success: true,
            data: {
                users: users
            }
        });
    } catch (error) {
        // 输出错误信息到控制台
        console.error('获取用户列表错误:', error);
        
        // 返回错误信息给前端
        res.status(500).json({
            success: false,
            message: '获取用户列表失败',
            error: error.message
        });
    }
});

// 获取所有用户列表（管理员）
router.get('/', authenticateToken, verifyAdmin, async (req, res) => {
    try {
        console.log('用户列表API被调用，用户角色:', req.user?.role);
        
        // 简化的查询，确保SQL语句正确
        const [users] = await db.execute(
            'SELECT id, username, real_name, role, status FROM users'
        );
        
        console.log('查询成功，返回用户数:', users.length);
        res.json({ users });
    } catch (error) {
        // 输出非常详细的错误信息到控制台
        console.error('========== 获取用户列表错误详情 ==========');
        console.error('错误对象:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
        console.error('错误消息:', error.message);
        console.error('错误代码:', error.code);
        console.error('错误SQL:', error.sql);
        console.error('错误堆栈:', error.stack);
        console.error('======================================');
        
        // 返回更详细的错误信息给前端
        res.status(500).json({
            error: '内部服务器错误',
            message: '数据库查询失败',
            errorCode: error.code,
            errorMessage: error.message
        });
    }
});

// 添加新用户
router.post('/', authenticateToken, verifyAdmin, async (req, res) => {
    try {
        const { username, password, real_name, role, expertise_level, status } = req.body;
        
        if (!username || !password || !real_name || !role) {
            return res.status(400).json({ error: '必填字段不能为空' });
        }

        if (!['收件人', '开发商', '国资企业专窗'].includes(role)) {
            return res.status(400).json({ error: '角色必须是收件人、开发商或国资企业专窗' });
        }

        // 检查用户名是否已存在
        const [existingUsers] = await db.execute(
            'SELECT id FROM users WHERE username = ?',
            [username]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ error: '用户名已存在' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await db.execute(
            'INSERT INTO users (username, password, real_name, role, expertise_level, status) VALUES (?, ?, ?, ?, ?, ?)',
            [username, hashedPassword, real_name, role, expertise_level || 1, status || '正常']
        );

        res.status(201).json({
            message: '用户创建成功',
            userId: result.insertId
        });
    } catch (error) {
        console.error('创建用户错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 更新用户信息
router.put('/:id', authenticateToken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { real_name, role, expertise_level, status } = req.body;
        
        if (!real_name || !role) {
            return res.status(400).json({ error: '必填字段不能为空' });
        }

        if (!['收件人', '开发商', '国资企业专窗'].includes(role)) {
            return res.status(400).json({ error: '角色必须是收件人、开发商或国资企业专窗' });
        }

        // 检查用户是否存在
        const [existingUsers] = await db.execute(
            'SELECT id FROM users WHERE id = ?',
            [id]
        );

        if (existingUsers.length === 0) {
            return res.status(404).json({ error: '用户不存在' });
        }

        await db.execute(
            'UPDATE users SET real_name = ?, role = ?, expertise_level = ?, status = ? WHERE id = ?',
            [real_name, role, expertise_level || 1, status || '正常', id]
        );

        res.json({ message: '用户信息更新成功' });
    } catch (error) {
        console.error('更新用户错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 更新用户密码
router.put('/:id/password', authenticateToken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { password } = req.body;
        
        if (!password) {
            return res.status(400).json({ error: '密码不能为空' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await db.execute(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, id]
        );

        res.json({ message: '密码修改成功' });
    } catch (error) {
        console.error('修改密码错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 删除用户
router.delete('/:id', authenticateToken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        // 不允许删除管理员账户
        const [userInfo] = await db.execute(
            'SELECT role FROM users WHERE id = ?',
            [id]
        );

        if (userInfo.length > 0 && userInfo[0].role === '管理员') {
            return res.status(400).json({ error: '不能删除管理员账户' });
        }

        const [result] = await db.execute(
            'DELETE FROM users WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: '用户不存在' });
        }

        res.json({ message: '用户删除成功' });
    } catch (error) {
        console.error('删除用户错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 获取单个用户信息
router.get('/:id', authenticateToken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        // 获取用户详细信息
        const [users] = await db.execute(
            'SELECT id, username, real_name, role, expertise_level, created_at FROM users WHERE id = ?',
            [id]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: '用户不存在' });
        }

        res.json({ user: users[0] });
    } catch (error) {
        console.error('获取用户详情错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

export default router;