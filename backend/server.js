import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { testConnection } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import registrationRoutes from './routes/registrationRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import refundRoutes from './routes/refundRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import discoveryRoutes from './routes/discoveryRoutes.js';
import preferenceRoutes from './routes/preferenceRoutes.js';
import assistantRoutes from './routes/assistantRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env'), override: true });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/refunds', refundRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/discovery', discoveryRoutes);
app.use('/api/preferences', preferenceRoutes);
app.use('/api/assistant', assistantRoutes);

// Health Check Endpoint (Phase 1 Requirement)
app.get('/api/health', async (req, res) => {
  const dbStatus = await testConnection();

  const healthData = {
    status: dbStatus.connected ? 'OK' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    service: 'CampusEvents Backend API',
    version: '1.0.0',
    database: {
      connected: dbStatus.connected,
      host: dbStatus.host,
      port: dbStatus.port,
      database: dbStatus.database,
      user: dbStatus.user,
      ...(dbStatus.connected ? {} : { error: dbStatus.error, code: dbStatus.code }),
    },
  };

  const httpStatus = dbStatus.connected ? 200 : 503;
  return res.status(httpStatus).json(healthData);
});

// Root welcome route
app.get('/', (req, res) => {
  res.json({
    message: 'CampusEvents REST API is active',
    healthCheck: '/api/health',
    version: '1.0.0',
  });
});

// 404 Not Found Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.method} ${req.originalUrl} not found.`,
  });
});

// Centralized Error Handler
app.use((err, req, res, next) => {
  console.error('[SERVER_ERROR]', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error.',
  });
});

// Start Server
const server = app.listen(PORT, () => {
  console.log(`==============================================`);
  console.log(`CampusEvents Backend running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`==============================================`);
});

export default app;
