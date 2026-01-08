import db from './config/database.js';

async function checkHistoryCases() {
  try {
    console.log('=== 检查历史案件统计情况 ===');
    
    // 1. 查询所有可用的接收人员（状态正常）
    console.log('\n1. 可用的接收人员（状态正常）:');
    const [availableReceivers] = await db.execute(`
      SELECT id, real_name, role, status 
      FROM users 
      WHERE (role = '收件人' OR role = '国资企业专窗') AND status = '正常' 
      ORDER BY role, id
    `);
    
    availableReceivers.forEach(user => {
      console.log(`用户ID: ${user.id}, 姓名: ${user.real_name}, 角色: ${user.role}, 状态: ${user.status}`);
    });
    
    // 2. 统计每个接收人历史上的开发商转移案件数量
    console.log('\n2. 每个接收人历史上的开发商转移案件数量:');
    const [historyCaseCounts] = await db.execute(`
      SELECT u.id, u.real_name, u.role, COUNT(c.id) as case_count 
      FROM users u
      LEFT JOIN cases c ON u.id = c.receiver_id 
        AND c.case_type IN ('开发商转移', '开发商转移登记')
      WHERE u.role IN ('收件人', '国资企业专窗')
      GROUP BY u.id, u.real_name, u.role
      ORDER BY u.id
    `);
    
    historyCaseCounts.forEach(item => {
      console.log(`用户ID: ${item.id}, 姓名: ${item.real_name}, 角色: ${item.role}, 历史案件数: ${item.case_count}`);
    });
    
    // 3. 检查handleDeveloperTransferAllocation函数的逻辑
    console.log('\n3. 模拟handleDeveloperTransferAllocation函数的分配逻辑:');
    
    // 获取所有角色为收件人和国资企业专窗的用户
    const [allReceivers] = await db.execute(
      `SELECT id, real_name FROM users WHERE role IN (?, ?) ORDER BY id`,
      ['收件人', '国资企业专窗']
    );
    
    // 统计每个收件人历史上的开发商转移案件数量
    const [historyCounts] = await db.execute(
      `SELECT receiver_id, COUNT(*) as case_count 
       FROM cases 
       WHERE case_type IN ('开发商转移', '开发商转移登记') 
       GROUP BY receiver_id`
    );
    
    // 将查询结果转换为Map，便于快速查找
    const caseCountMap = new Map(historyCounts.map(item => [item.receiver_id, item.case_count]));
    
    // 为每个可用收件人添加历史案件数
    const receiversWithCount = allReceivers.map(receiver => ({
        ...receiver,
        case_count: caseCountMap.get(receiver.id) || 0
    }));
    
    // 按历史案件数升序排序，若案件数相同则按ID升序排序
    receiversWithCount.sort((a, b) => {
        // 首先按案件数排序
        if (a.case_count !== b.case_count) {
            return a.case_count - b.case_count;
        }
        // 案件数相同时，按ID排序作为tiebreaker
        return a.id - b.id;
    });
    
    console.log('排序后的收件人列表:');
    receiversWithCount.forEach(receiver => {
        console.log(`用户ID: ${receiver.id}, 姓名: ${receiver.real_name}, 历史案件数: ${receiver.case_count}`);
    });
    
    // 选择历史案件数最少的收件人
    const nextReceiver = receiversWithCount[0];
    console.log(`\n推荐的下一个收件人: ${nextReceiver.real_name}, 历史案件数: ${nextReceiver.case_count}`);
    
    console.log('\n=== 检查完成 ===');
    
  } catch (error) {
    console.error('检查历史案件情况失败:', error);
    process.exit(1);
  }
}

checkHistoryCases();