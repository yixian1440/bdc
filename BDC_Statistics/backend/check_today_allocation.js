import db from './config/database.js';

async function checkTodayAllocation() {
  try {
    console.log('=== 检查今天的案件分配情况 ===');
    
    // 获取今天的日期
    const today = new Date().toISOString().split('T')[0];
    console.log('检查日期:', today);
    
    // 1. 查询今天的案件分配记录
    console.log('\n1. 今天的案件分配记录:');
    const [allocationRecords] = await db.execute(`
      SELECT 
        c.id as case_id,
        c.case_number,
        c.case_type,
        u1.real_name as creator,
        u2.real_name as receiver,
        u2.role as receiver_role,
        u2.status as receiver_status,
        c.created_at
      FROM cases c
      LEFT JOIN users u1 ON c.user_id = u1.id
      LEFT JOIN users u2 ON c.receiver_id = u2.id
      WHERE DATE(c.created_at) = ?
      ORDER BY c.created_at DESC
    `, [today]);
    
    if (allocationRecords.length === 0) {
      console.log('今天没有案件分配记录');
    } else {
      allocationRecords.forEach(record => {
        console.log(`案件ID: ${record.case_id}, 编号: ${record.case_number}, 类型: ${record.case_type}`);
        console.log(`  创建人: ${record.creator}, 接收人: ${record.receiver}, 角色: ${record.receiver_role}, 状态: ${record.receiver_status}`);
        console.log(`  创建时间: ${record.created_at}`);
        console.log('  -----------------------------------');
      });
    }
    
    // 2. 查询国资企业专窗用户状态
    console.log('\n2. 国资企业专窗用户状态:');
    const [stateOwnedUsers] = await db.execute(`
      SELECT id, real_name, role, status FROM users WHERE role = '国资企业专窗' ORDER BY id
    `);
    
    if (stateOwnedUsers.length === 0) {
      console.log('没有国资企业专窗用户');
    } else {
      stateOwnedUsers.forEach(user => {
        console.log(`用户ID: ${user.id}, 姓名: ${user.real_name}, 角色: ${user.role}, 状态: ${user.status}`);
      });
    }
    
    // 3. 查询收件人用户状态
    console.log('\n3. 收件人用户状态:');
    const [receiverUsers] = await db.execute(`
      SELECT id, real_name, role, status FROM users WHERE role = '收件人' ORDER BY id
    `);
    
    if (receiverUsers.length === 0) {
      console.log('没有收件人用户');
    } else {
      receiverUsers.forEach(user => {
        console.log(`用户ID: ${user.id}, 姓名: ${user.real_name}, 角色: ${user.role}, 状态: ${user.status}`);
      });
    }
    
    // 4. 查询今天的开发商转移案件
    console.log('\n4. 今天的开发商转移案件:');
    const [developerCases] = await db.execute(`
      SELECT 
        id,
        case_number,
        case_type,
        receiver_id,
        created_at
      FROM cases 
      WHERE DATE(created_at) = ? 
        AND (case_type = '开发商转移' OR case_type = '开发商转移登记')
      ORDER BY created_at DESC
    `, [today]);
    
    if (developerCases.length === 0) {
      console.log('今天没有开发商转移案件');
    } else {
      developerCases.forEach(caseItem => {
        console.log(`案件ID: ${caseItem.id}, 编号: ${caseItem.case_number}, 类型: ${caseItem.case_type}`);
        console.log(`  接收人ID: ${caseItem.receiver_id}, 创建时间: ${caseItem.created_at}`);
        console.log('  -----------------------------------');
      });
    }
    
    // 5. 检查可用的接收人员
    console.log('\n5. 可用的接收人员（状态正常）:');
    const [availableReceivers] = await db.execute(`
      SELECT id, real_name, role, status 
      FROM users 
      WHERE (role = '收件人' OR role = '国资企业专窗') AND status = '正常' 
      ORDER BY role, id
    `);
    
    if (availableReceivers.length === 0) {
      console.log('没有可用的接收人员');
    } else {
      console.log(`可用接收人员总数: ${availableReceivers.length}`);
      availableReceivers.forEach(user => {
        console.log(`用户ID: ${user.id}, 姓名: ${user.real_name}, 角色: ${user.role}, 状态: ${user.status}`);
      });
    }
    
    // 6. 统计每个角色的案件数量
    console.log('\n6. 今天各角色的案件分配统计:');
    const [roleStatistics] = await db.execute(`
      SELECT 
        u.role,
        COUNT(*) as case_count
      FROM cases c
      LEFT JOIN users u ON c.receiver_id = u.id
      WHERE DATE(c.created_at) = ?
      GROUP BY u.role
      ORDER BY case_count DESC
    `, [today]);
    
    if (roleStatistics.length === 0) {
      console.log('今天没有案件分配');
    } else {
      roleStatistics.forEach(stat => {
        console.log(`${stat.role}: ${stat.case_count} 件`);
      });
    }
    
    console.log('\n=== 检查完成 ===');
    
  } catch (error) {
    console.error('检查案件分配情况失败:', error);
    process.exit(1);
  }
}

checkTodayAllocation();