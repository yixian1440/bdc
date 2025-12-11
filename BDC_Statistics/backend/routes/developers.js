import express from 'express';
import db from '../config/database.js';

const router = express.Router();

// 验证是否为管理员的中间件
const verifyAdmin = (req, res, next) => {
    if (req.user.role !== '管理员') {
        return res.status(403).json({ error: '只有管理员可以访问此功能' });
    }
    next();
};

// 获取所有开发商项目列表
router.get('/projects', async (req, res) => {
    try {
        const [projects] = await db.execute(
            'SELECT id, project_name, description, created_at FROM developer_projects ORDER BY project_name'
        );
        res.json({ projects });
    } catch (error) {
        console.error('获取项目列表错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 添加新的开发商项目
router.post('/projects', verifyAdmin, async (req, res) => {
    try {
        const { project_name, description } = req.body;
        
        if (!project_name) {
            return res.status(400).json({ error: '项目名称不能为空' });
        }

        // 检查项目是否已存在
        const [existingProjects] = await db.execute(
            'SELECT id FROM developer_projects WHERE project_name = ?',
            [project_name]
        );

        if (existingProjects.length > 0) {
            return res.status(400).json({ error: '项目已存在' });
        }

        const [result] = await db.execute(
            'INSERT INTO developer_projects (project_name, description) VALUES (?, ?)',
            [project_name, description || '']
        );

        res.status(201).json({
            message: '项目创建成功',
            projectId: result.insertId
        });
    } catch (error) {
        console.error('创建项目错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 更新开发商项目
router.put('/projects/:id', verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { project_name, description } = req.body;
        
        if (!project_name) {
            return res.status(400).json({ error: '项目名称不能为空' });
        }

        // 检查项目是否存在
        const [existingProjects] = await db.execute(
            'SELECT id FROM developer_projects WHERE id = ?',
            [id]
        );

        if (existingProjects.length === 0) {
            return res.status(404).json({ error: '项目不存在' });
        }

        // 检查新名称是否与其他项目重复
        const [duplicateProjects] = await db.execute(
            'SELECT id FROM developer_projects WHERE project_name = ? AND id != ?',
            [project_name, id]
        );

        if (duplicateProjects.length > 0) {
            return res.status(400).json({ error: '项目名称已存在' });
        }

        await db.execute(
            'UPDATE developer_projects SET project_name = ?, description = ? WHERE id = ?',
            [project_name, description || '', id]
        );

        res.json({ message: '项目更新成功' });
    } catch (error) {
        console.error('更新项目错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 删除开发商项目
router.delete('/projects/:id', verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const [result] = await db.execute(
            'DELETE FROM developer_projects WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: '项目不存在' });
        }

        res.json({ message: '项目删除成功' });
    } catch (error) {
        console.error('删除项目错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 获取项目详情
router.get('/projects/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const [projects] = await db.execute(
            'SELECT id, project_name, description, created_at FROM developer_projects WHERE id = ?',
            [id]
        );

        if (projects.length === 0) {
            return res.status(404).json({ error: '项目不存在' });
        }

        res.json({ project: projects[0] });
    } catch (error) {
        console.error('获取项目详情错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

export default router;