// 执行SQL脚本向数据库添加银行抵押类型
import db from './config/database.js';

async function addBankMortgageType() {
    try {
        console.log('开始添加银行抵押案件类型到数据库...');
        
        // 1. 向case_types表添加银行抵押类型
        const addCaseTypeQuery = `
            INSERT INTO case_types (name, category, description)
            VALUES ('银行抵押', '一般类', '银行抵押贷款不动产收件')
            ON DUPLICATE KEY UPDATE
            category = '一般类',
            description = '银行抵押贷款不动产收件',
            is_active = TRUE
        `;
        
        const [caseTypeResult] = await db.execute(addCaseTypeQuery);
        console.log('添加银行抵押类型到case_types表成功:', caseTypeResult);
        
        // 2. 向case_type_role_mapping表添加银行抵押类型的角色映射 - 收件人
        const addReceiverMappingQuery = `
            INSERT INTO case_type_role_mapping (case_type, role, can_create, can_receive)
            VALUES ('银行抵押', '收件人', TRUE, TRUE)
            ON DUPLICATE KEY UPDATE
            can_create = TRUE,
            can_receive = TRUE
        `;
        
        const [receiverResult] = await db.execute(addReceiverMappingQuery);
        console.log('添加银行抵押类型的收件人角色映射成功:', receiverResult);
        
        // 3. 向case_type_role_mapping表添加银行抵押类型的角色映射 - 管理员
        const addAdminMappingQuery = `
            INSERT INTO case_type_role_mapping (case_type, role, can_create, can_receive)
            VALUES ('银行抵押', '管理员', FALSE, FALSE)
            ON DUPLICATE KEY UPDATE
            can_create = FALSE,
            can_receive = FALSE
        `;
        
        const [adminResult] = await db.execute(addAdminMappingQuery);
        console.log('添加银行抵押类型的管理员角色映射成功:', adminResult);
        
        console.log('银行抵押案件类型添加完成！');
        
        // 关闭数据库连接
        await db.end();
        
    } catch (error) {
        console.error('添加银行抵押案件类型失败:', error);
        
        // 关闭数据库连接
        try {
            await db.end();
        } catch (closeError) {
            console.error('关闭数据库连接失败:', closeError);
        }
        
        process.exit(1);
    }
}

// 执行函数
addBankMortgageType();
