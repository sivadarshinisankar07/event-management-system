import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

async function initDatabase() {
  console.log('Connecting to MySQL to initialize database schema...');

  const connectionConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  };

  let connection;
  try {
    connection = await mysql.createConnection(connectionConfig);
    console.log('Connected to MySQL server.');

    const schemaPath = path.join(__dirname, '..', 'config', 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Executing schema.sql...');
    await connection.query(sql);

    console.log('Database and all tables created successfully!');

    // Verify created tables
    await connection.query('USE campus_events_db');
    const [tables] = await connection.query('SHOW TABLES');
    console.log('Verified database tables:');
    tables.forEach((t) => {
      const tableName = Object.values(t)[0];
      console.log(` - ${tableName}`);
    });

  } catch (err) {
    console.error('Failed to initialize database:');
    console.error(`Error code: ${err.code}`);
    console.error(`Message: ${err.message}`);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initDatabase();
