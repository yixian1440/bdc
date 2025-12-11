import jwt from 'jsonwebtoken';

// 确保与auth.js中的JWT密钥保持一致
const JWT_SECRET = process.env.JWT_SECRET || 'bdc_statistics_secure_jwt_secret_key_2024';

/**
 * 验证JWT Token的中间件
 */
export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.status(401).json({ message: '未提供认证令牌' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: '无效的认证令牌' });
        }
        req.user = user;
        next();
    });
};

/**
 * 验证管理员权限的中间件
 */
export const verifyAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== '管理员') {
        return res.status(403).json({ message: '需要管理员权限' });
    }
    next();
};
