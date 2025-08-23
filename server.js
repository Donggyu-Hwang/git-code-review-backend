const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const reviewRoutes = require('./routes/reviewRoutes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Git Code Review Backend API',
    version: '1.0.0',
    endpoints: {
      'POST /api/reviews/generate': 'Generate code review report from GitHub repository',
      'POST /api/reviews/bulk': 'Generate multiple code review reports (bulk upload)',
      'GET /api/reviews/bulk/sample-csv': 'Download sample CSV for bulk upload',
      'GET /api/reviews': 'Get all code reviews',
      'GET /api/reviews/:id': 'Get specific code review',
      'GET /api/reviews/stats': 'Get statistics',
      'GET /api/reviews/team/:teamName': 'Get reviews by team name',
      'DELETE /api/reviews/:id': 'Delete code review'
    }
  });
});

app.use('/api/reviews', reviewRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
