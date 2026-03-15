require('dotenv').config();
const { Pool } = require('pg');
const os = require('os');
const { PG_HOST, PG_PORT, PG_DATABASE, PG_PASSWORD, PG_SSL } = process.env;
// Use the system username as the database user
const PG_USER = process.env.PG_USER || os.userInfo().username;
const NODE_ENV = process.env.NODE_ENV || 'development';

class PostgresService {
  constructor() {
    this.pool = new Pool({
      host: PG_HOST,
      port: PG_PORT,
      // Default to the dedicated ledger database if PG_DATABASE is not set
      database: PG_DATABASE || 'mavenpay_ledger',
      user: PG_USER,
      password: PG_PASSWORD,
      ssl: PG_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 20, // max number of clients in the pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test the connection on initialization (but skip in test env and never crash the process here)
    if (NODE_ENV !== 'test') {
      this.testConnection().catch((error) => {
        console.error('❌ Initial PostgreSQL connection check failed:', error.message || error);
      });
    }
  }

  /**
   * Test the database connection
   */
  async testConnection() {
    try {
      const client = await this.pool.connect();
      console.log('✅ Connected to PostgreSQL database');
      client.release();
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to PostgreSQL:', error.message);
      throw error;
    }
  }

  /**
   * Execute a query with parameters
   * @param {string} text - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Object>} Query result
   */
  async query(text, params = []) {
    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Executed query', { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      console.error('Query error:', { text, error: error.message });
      throw error;
    }
  }

  /**
   * Get a client from the pool for transactions
   * @returns {Promise<import('pg').PoolClient>} A client from the pool
   */
  async getClient() {
    const client = await this.pool.connect();
    
    // Set a timeout for the client
    const timeout = setTimeout(() => {
      console.error('A client has been checked out for more than 30 seconds!');
      console.error(`The last executed query on this client was: ${client.lastQuery}`);
    }, 30000);
    
    // Monkey-patch the query method to keep track of the last query executed
    const { query } = client;
    client.query = (...args) => {
      client.lastQuery = args[0];
      return query.apply(client, args);
    };
    
    // Release the client back to the pool
    const { release } = client;
    let released = false;
    
    client.release = () => {
      if (released) return;
      released = true;
      clearTimeout(timeout);
      
      // Reset the client
      client.query = query;
      client.release = release;
      return release.apply(client);
    };
    
    return client;
  }

  /**
   * Execute a transaction
   * @param {Function} callback - Async function that receives a client and should return a Promise
   * @returns {Promise<*>} The result of the callback
   */
  async withTransaction(callback) {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Transaction error:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

// Create a single instance of the service
const postgresService = new PostgresService();

// Handle process termination to close the pool
process.on('exit', () => {
  if (postgresService.pool) {
    console.log('Closing PostgreSQL connection pool...');
    postgresService.pool.end();
  }
});

module.exports = postgresService;
