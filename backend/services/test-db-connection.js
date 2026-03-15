require('dotenv').config();
const postgresService = require('./postgresService');

async function testConnection() {
  try {
    console.log('Testing PostgreSQL connection...');
    const result = await postgresService.query('SELECT version()');
    console.log('✅ PostgreSQL connection successful!');
    console.log('PostgreSQL version:', result.rows[0].version);
    process.exit(0);
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();
