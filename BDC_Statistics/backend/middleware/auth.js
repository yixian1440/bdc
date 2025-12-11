/**
 * 认证中间件 - 提供基本的认证和权限控制功能
 */

import jwt from 'jsonwebtoken';

// 确保与auth.js中的JWT密钥保持一致
const JWT_SECRET = process.env.JWT_SECRET || 'bdc_statistics_secure_jwt_secret_key_2024';

// 简单的认证中间件
const auth = {};

// 保护路由的中间件 - 检查是否有有效的令牌
auth.protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: '未授权访问，请提供有效的认证令牌'
      });
    }
    
    // 验证JWT令牌
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({
      status: 'error',
      message: '认证失败，无效的令牌'
    });
  }
};

// 限制访问权限的中间件 - 检查用户角色
auth.restrictTo = (...roles) => {
  return (req, res, next) => {
    try {
      if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({
          status: 'error',
          message: '权限不足，无法访问此资源'
        });
      }
      
      return next();
    } catch (error) {
      return res.status(403).json({
        status: 'error',
        message: '权限验证失败'
      });
    }
  };
};

export default auth;
