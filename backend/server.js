require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const { connectDB, getConnectionStatus } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());

// Static uploads serving for PDF attachments
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============================================================
// THREE-LAYER ARCHITECTURE ROUTES
// ============================================================
app.use('/admin/courses', require('./application/routes/courseRoutes'));
app.use('/assignments', require('./application/routes/assignmentRoutes'));
app.use('/auth', require('./application/routes/authRoutes'));

// ============================================================
// SYSTEM & FEATURE ROUTES
// ============================================================
app.use('/admin', require('./routes/admin'));
app.use('/courses', require('./routes/courses'));
app.use('/live-sessions', require('./routes/liveSessions'));
app.use('/attendance', require('./routes/attendance'));
app.use('/materials', require('./routes/materials'));
app.use('/users', require('./routes/users'));
app.use('/summaries', require('./routes/summaries'));

// Health check with real database connection status
app.get('/health', (req, res) => {
  const dbStatus = getConnectionStatus();
  res.json({
    status: 'ok',
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/status', (req, res) => {
  const dbStatus = getConnectionStatus();
  res.json({
    server: 'running',
    port: PORT,
    database: dbStatus,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  const status = err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✨ ISKCON LMS Backend running on port ${PORT}`);
    console.log(`   Database status: readyState ${getConnectionStatus().readyState}`);
  });
}

module.exports = app;
