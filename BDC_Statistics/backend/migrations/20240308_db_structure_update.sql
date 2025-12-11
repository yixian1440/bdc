-- 不动产收件统计程序 - 数据库结构更新脚本

-- 1. 创建消息通知表
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    message_type ENUM('新任务通知', '提交确认通知', '统计通知', '队列变更通知') NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 2. 创建消息阅读状态表（可选，如果需要更详细的状态跟踪）
CREATE TABLE IF NOT EXISTS message_read_status (
    id INT AUTO_INCREMENT PRIMARY KEY,
    message_id INT NOT NULL,
    user_id INT NOT NULL,
    read_at TIMESTAMP NULL,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_message_user (message_id, user_id)
);

-- 3. 修改案件表结构 - 移除状态字段，添加收件接收人字段
ALTER TABLE cases 
ADD COLUMN receiver_id INT NULL,
ADD COLUMN is_allocated BOOLEAN DEFAULT FALSE,
DROP COLUMN status;

-- 4. 添加外键关联
ALTER TABLE cases 
ADD CONSTRAINT fk_cases_receiver 
FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE SET NULL;

-- 5. 创建收件类型与角色关联表
CREATE TABLE IF NOT EXISTS case_type_role_mapping (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_type VARCHAR(100) NOT NULL,
    role VARCHAR(100) NOT NULL,
    can_create BOOLEAN DEFAULT TRUE,
    can_receive BOOLEAN DEFAULT TRUE,
    UNIQUE KEY unique_type_role (case_type, role)
);

-- 6. 插入收件类型与角色映射数据
INSERT INTO case_type_role_mapping (case_type, role, can_create, can_receive) VALUES
-- 收件人角色权限
('一般件', '收件人', TRUE, TRUE),
('自建房', '收件人', TRUE, TRUE),
('分割转让', '收件人', TRUE, TRUE),
('其他', '收件人', TRUE, TRUE),
('开发商转移', '收件人', TRUE, TRUE),
('多人分割转让', '收件人', TRUE, TRUE),
-- 国资企业专窗权限
('开发商首次', '国资企业专窗', TRUE, TRUE),
('国资件', '国资企业专窗', TRUE, TRUE),
('企业件', '国资企业专窗', TRUE, TRUE),
('开发商转移', '国资企业专窗', TRUE, TRUE),
-- 开发商权限
('开发商转移', '开发商', TRUE, FALSE),
-- 管理员权限
('一般件', '管理员', FALSE, FALSE),
('自建房', '管理员', FALSE, FALSE),
('分割转让', '管理员', FALSE, FALSE),
('其他', '管理员', FALSE, FALSE),
('开发商首次', '管理员', FALSE, FALSE),
('国资件', '管理员', FALSE, FALSE),
('企业件', '管理员', FALSE, FALSE),
('开发商转移', '管理员', FALSE, FALSE),
('多人分割转让', '管理员', FALSE, FALSE);

-- 7. 创建收件类型配置表
CREATE TABLE IF NOT EXISTS case_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    category ENUM('一般类', '国资类', '开发商类') NOT NULL,
    description VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE
);

-- 8. 插入收件类型配置
INSERT INTO case_types (name, category, description) VALUES
('一般件', '一般类', '普通不动产收件'),
('自建房', '一般类', '自建房屋不动产收件'),
('分割转让', '一般类', '不动产分割转让收件'),
('其他', '一般类', '其他类型不动产收件'),
('多人分割转让', '一般类', '多人不动产分割转让收件'),
('开发商首次', '国资类', '开发商首次登记收件'),
('国资件', '国资类', '国有资产不动产收件'),
('企业件', '国资类', '企业不动产收件'),
('开发商转移', '开发商类', '开发商不动产转移收件');

-- 9. 创建队列配置表
CREATE TABLE IF NOT EXISTS allocation_queues (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category ENUM('一般类', '开发商类') NOT NULL,
    current_index INT DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_queue_category (category)
);

-- 10. 初始化队列配置
INSERT INTO allocation_queues (category, current_index) VALUES
('一般类', 0),
('开发商类', 0);

-- 11. 更新现有案件数据
UPDATE cases SET is_allocated = FALSE;

-- 12. 添加日志表记录系统操作
CREATE TABLE IF NOT EXISTS system_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100),
    entity_id INT,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 13. 创建任务分配历史表

-- 15. 创建任务分配历史表
CREATE TABLE IF NOT EXISTS allocation_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_id INT NOT NULL,
    allocated_to INT NOT NULL,
    allocated_by INT NULL,
    allocation_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    case_type VARCHAR(100) NOT NULL,
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
    FOREIGN KEY (allocated_to) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (allocated_by) REFERENCES users(id) ON DELETE SET NULL
);
