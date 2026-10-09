-- ===================================================================
-- CampusEvents — MySQL Database Schema
-- Architecture: Relational schema for Node.js + Express REST API
-- ===================================================================

CREATE DATABASE IF NOT EXISTS campus_events_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE campus_events_db;

-- -------------------------------------------------------------------
-- 1. Users Table (Participants and Staff Admins)
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL UNIQUE,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NULL,
  google_id VARCHAR(100) NULL UNIQUE,
  phone VARCHAR(15) NULL,
  role ENUM('admin', 'participant') NOT NULL DEFAULT 'participant',
  department VARCHAR(50) NULL,
  admin_id VARCHAR(50) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------
-- 2. Events Table (Full event specifications & lifecycle)
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id VARCHAR(36) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  type ENUM('Individual', 'Team') NOT NULL DEFAULT 'Individual',
  category VARCHAR(50) NOT NULL,
  department VARCHAR(50) NOT NULL,
  description TEXT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  venue VARCHAR(150) NOT NULL,
  capacity INT NOT NULL,
  registered_count INT NOT NULL DEFAULT 0,
  payment_mode ENUM('Free', 'Online', 'Offline') NOT NULL DEFAULT 'Free',
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  registration_expiry DATE NOT NULL,
  rules TEXT NULL,
  instructions TEXT NULL,
  status ENUM('Draft', 'Published', 'Suspended', 'Cancelled') NOT NULL DEFAULT 'Draft',
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_events_status (status),
  INDEX idx_events_date (date),
  INDEX idx_events_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------
-- 3. Registrations Table
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS registrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  registration_id VARCHAR(36) NOT NULL UNIQUE,
  user_id INT NOT NULL,
  event_id INT NOT NULL,
  registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  payment_mode ENUM('Free', 'Online', 'Offline') NOT NULL,
  payment_status ENUM('Not Required', 'Pending', 'Success', 'Failed') NOT NULL,
  registration_status ENUM('Confirmed', 'Pending', 'Payment Failed', 'Cancelled') NOT NULL,
  ticket_id VARCHAR(50) NULL,
  checked_in BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_event (user_id, event_id),
  INDEX idx_reg_status (registration_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------
-- 4. Payments Table (Academic Simulation Logs)
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payment_id VARCHAR(36) NOT NULL UNIQUE,
  registration_id INT NOT NULL,
  user_id INT NOT NULL,
  event_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  mode ENUM('Free', 'Online', 'Offline') NOT NULL,
  status ENUM('Success', 'Pending', 'Failed', 'Not Required') NOT NULL,
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (registration_id) REFERENCES registrations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  INDEX idx_payments_status (status),
  INDEX idx_payments_mode (mode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------
-- 5. Tickets Table (Digital passes with QR data)
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id VARCHAR(50) NOT NULL UNIQUE,
  registration_id INT NOT NULL,
  user_id INT NOT NULL,
  event_id INT NOT NULL,
  qr_data TEXT NOT NULL,
  status ENUM('Confirmed', 'Checked In', 'Invalid', 'Cancelled') NOT NULL DEFAULT 'Confirmed',
  checked_in BOOLEAN NOT NULL DEFAULT FALSE,
  checked_in_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (registration_id) REFERENCES registrations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  INDEX idx_tickets_ticket_id (ticket_id),
  INDEX idx_tickets_checked_in (checked_in)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------
-- 6. Refunds Table
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refunds (
  id INT AUTO_INCREMENT PRIMARY KEY,
  refund_id VARCHAR(36) NOT NULL UNIQUE,
  registration_id INT NOT NULL,
  user_id INT NOT NULL,
  event_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
  rejection_reason TEXT NULL,
  request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_by INT NULL,
  processed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (registration_id) REFERENCES registrations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_refunds_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------
-- 7. Recently Accessed Table (For Recently Accessed feature)
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recently_accessed (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  event_id INT NOT NULL,
  accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_event_access (user_id, event_id),
  INDEX idx_recently_accessed_time (accessed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------
-- 8. Event Preferences Table (For Smart Event Recommendation System)
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  preferred_category VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_category_pref (user_id, preferred_category),
  INDEX idx_preferences_category (preferred_category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
