-- 添加银行抵押案件类型到数据库

-- 1. 向case_types表添加银行抵押类型
INSERT INTO case_types (name, category, description) VALUES
('银行抵押', '一般类', '银行抵押贷款不动产收件')
ON DUPLICATE KEY UPDATE
category = '一般类',
description = '银行抵押贷款不动产收件',
is_active = TRUE;

-- 2. 向case_type_role_mapping表添加银行抵押类型的角色映射
-- 收件人角色权限
INSERT INTO case_type_role_mapping (case_type, role, can_create, can_receive) VALUES
('银行抵押', '收件人', TRUE, TRUE)
ON DUPLICATE KEY UPDATE
can_create = TRUE,
can_receive = TRUE;

-- 管理员角色权限
INSERT INTO case_type_role_mapping (case_type, role, can_create, can_receive) VALUES
('银行抵押', '管理员', FALSE, FALSE)
ON DUPLICATE KEY UPDATE
can_create = FALSE,
can_receive = FALSE;