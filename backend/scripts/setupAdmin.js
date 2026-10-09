import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

function generateAdminUserId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars[Math.floor(Math.random() * chars.length)];
  }
  return `USR-ADMIN-${Date.now().toString(36).toUpperCase()}-${rand}`;
}

async function setupAdmin() {
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@campusevents.edu';
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'AdminSecure@2026';
  const adminName = process.env.INITIAL_ADMIN_NAME || 'System Administrator';
  const adminId = process.env.INITIAL_ADMIN_ID || 'STAFF-001';
  const adminPhone = process.env.INITIAL_ADMIN_PHONE || '9876543210';

  console.log('Connecting to database to provision initial administrator...');

  const connectionConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'campus_events_db',
  };

  let connection;
  try {
    connection = await mysql.createConnection(connectionConfig);

    // Check if an admin with this email or adminId already exists
    const [existing] = await connection.query(
      'SELECT id, user_id, email, role, admin_id FROM users WHERE email = ? OR admin_id = ?',
      [adminEmail, adminId]
    );

    if (existing.length > 0) {
      console.log(`Admin account already exists for email '${adminEmail}' or Staff ID '${adminId}'.`);
      console.log(`Existing Admin User ID: ${existing[0].user_id}`);
      return;
    }

    // Hash the password securely with bcrypt
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(adminPassword, saltRounds);
    const userId = generateAdminUserId();

    await connection.query(
      `INSERT INTO users (user_id, full_name, email, password_hash, phone, role, admin_id)
       VALUES (?, ?, ?, ?, ?, 'admin', ?)`,
      [userId, adminName, adminEmail, passwordHash, adminPhone, adminId]
    );

    console.log('==============================================');
    console.log('Initial administrator account created successfully!');
    console.log(`Admin User ID : ${userId}`);
    console.log(`Admin Email   : ${adminEmail}`);
    console.log(`Staff/Admin ID: ${adminId}`);
    console.log(`Role          : admin`);
    console.log('Password has been securely hashed with bcrypt.');
    console.log('==============================================');

  } catch (err) {
    console.error('Failed to provision administrator:');
    console.error(`Error code: ${err.code}`);
    console.error(`Message: ${err.message}`);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupAdmin();
