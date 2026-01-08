import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/database.js';
import LogService from '../services/LogService.js';

const router = express.Router();
// 确保JWT密钥有一个安全的默认值，不依赖环境变量
const JWT_SECRET = process.env.JWT_SECRET || 'bdc_statistics_secure_jwt_secret_key_2024';

// 用户登录
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // 获取客户端信息
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'] || '';
        
        if (!username || !password) {
            // 记录登录失败日志
            await LogService.logLogin({
                username: username || '未知',
                realName: '',
                success: false,
                ipAddress,
                userAgent,
                error: '用户名和密码不能为空'
            });
            return res.status(400).json({ error: '用户名和密码不能为空' });
        }

        const [users] = await db.execute(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            // 记录登录失败日志
            await LogService.logLogin({
                username,
                realName: '',
                success: false,
                ipAddress,
                userAgent,
                error: '用户名不存在'
            });
            return res.status(401).json({ error: '用户名或密码错误' });
        }

        const user = users[0];
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            // 记录登录失败日志
            await LogService.logLogin({
                username,
                realName: user.real_name || '',
                success: false,
                ipAddress,
                userAgent,
                error: '密码错误'
            });
            return res.status(401).json({ error: '用户名或密码错误' });
        }

        const token = jwt.sign(
            { 
                id: user.id, 
                username: user.username, 
                role: user.role,
                real_name: user.real_name
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // 记录登录成功日志
        await LogService.logLogin({
            username,
            realName: user.real_name || '',
            success: true,
            ipAddress,
            userAgent
        });

        res.json({
            message: '登录成功',
            token,
            user: {
                id: user.id,
                username: user.username,
                real_name: user.real_name,
                role: user.role,
                expertise_level: user.expertise_level
            }
        });
    } catch (error) {
        console.error('登录错误:', error);
        
        // 记录登录错误日志
        await LogService.logLogin({
            username: req.body.username || '未知',
            realName: '',
            success: false,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'] || '',
            error: error.message || '服务器内部错误'
        });
        
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 用户注册（仅管理员可注册新用户）
router.post('/register', async (req, res) => {
    try {
        const { username, password, real_name, role, expertise_level } = req.body;
        
        if (!username || !password || !real_name) {
            return res.status(400).json({ error: '必填字段不能为空' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await db.execute(
            'INSERT INTO users (username, password, real_name, role, expertise_level) VALUES (?, ?, ?, ?, ?)',
            [username, hashedPassword, real_name, role || '收件人', expertise_level || 1]
        );

        res.status(201).json({
            message: '用户注册成功',
            userId: result.insertId
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: '用户名已存在' });
        }
        console.error('注册错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 获取当前用户信息
router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: '未提供认证令牌' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        
        const [users] = await db.execute(
            'SELECT id, username, real_name, role, expertise_level FROM users WHERE id = ?',
            [decoded.id]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: '用户不存在' });
        }

        res.json({ user: users[0] });
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: '无效的认证令牌' });
        }
        console.error('获取用户信息错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 获取当前用户信息 - 别名，保持前后端一致性
router.get('/currentUser', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: '未提供认证令牌' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        
        const [users] = await db.execute(
            'SELECT id, username, real_name, role, expertise_level FROM users WHERE id = ?',
            [decoded.id]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: '用户不存在' });
        }

        res.json({ user: users[0] });
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: '无效的认证令牌' });
        }
        console.error('获取用户信息错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

export default router;