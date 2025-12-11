import db from './backend/config/database.js';

async function checkUsers() {
  try {
    // 查询用户表中的所有数据
    const [users] = await db.execute('SELECT * FROM users');
    console.log('数据库中的用户信息:');
    users.forEach(user => {
      console.log(`ID: ${user.id}, 用户名: ${user.username}, 角色: ${user.role}, 真实姓名: ${user.real_name}`);
    });
    
    // 查询用户表结构
    const [columns] = await db.execute('SHOW COLUMNS FROM users');
    console.log('\n用户表结构:');
    columns.forEach(col => {
      console.log(`${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : ''}`);
    });
    
    // 特别检查收件人角色的用户
    const [recipients] = await db.execute('SELECT * FROM users WHERE role = ?', ['收件人']);
    console.log(`\n收件人角色用户数量: ${recipients.length}`);
    
  } catch (error) {
    console.error('查询数据库时出错:', error);
  } finally {
    // 关闭数据库连接
    await db.end();
  }
}

checkUsers();
