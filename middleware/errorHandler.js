const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error
  let error = {
    message: err.message || 'Internal Server Error',
    status: err.status || 500
  };

  // Validation error
  if (err.name === 'ValidationError') {
    error.status = 400;
    error.message = err.details ? err.details[0].message : err.message;
  }

  // Bedrock API error
  if (err.response && err.response.status) {
    error.status = err.response.status;
    error.message = `Bedrock API Error: ${err.response.data?.error?.message || err.message}`;
  }

  // AWS SDK error
  if (err.name === 'ValidationException' || err.name === 'AccessDeniedException') {
    error.status = 400;
    error.message = `AWS Bedrock Error: ${err.message}`;
  }

  // GitHub API error
  if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
    error.status = 503;
    error.message = 'External service unavailable';
  }

  res.status(error.status).json({
    error: error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = { errorHandler };
