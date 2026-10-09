import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'campus_events_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
};

const pool = mysql.createPool(poolConfig);

/**
 * Execute a parameterized query using the pool.
 */
export async function query(sql, params = []) {
  const [rows, fields] = await pool.query(sql, params);
  return rows;
}

/**
 * Get a connection from the pool for manual transaction control.
 */
export async function getConnection() {
  return await pool.getConnection();
}

/**
 * Test connectivity to the MySQL server and database.
 */
export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    const [result] = await connection.query('SELECT 1 + 1 AS solution');
    connection.release();
    return {
      connected: true,
      database: poolConfig.database,
      host: poolConfig.host,
      port: poolConfig.port,
      user: poolConfig.user,
      solution: result[0].solution,
    };
  } catch (err) {
    return {
      connected: false,
      database: poolConfig.database,
      host: poolConfig.host,
      port: poolConfig.port,
      user: poolConfig.user,
      error: err.message,
      code: err.code,
    };
  }
}

export default pool;
