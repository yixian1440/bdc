import db from '../config/database.js';

/**
 * 创建developer表并同步初始数据
 */
async function createDeveloperTable() {
    try {
        console.log('开始创建developer表...');
        
        // 1. 创建developer表
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS developers (
                id INT PRIMARY KEY AUTO_INCREMENT,
                developer_name VARCHAR(100) NOT NULL UNIQUE,
                agent VARCHAR(100),
                contact_phone VARCHAR(20),
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
               