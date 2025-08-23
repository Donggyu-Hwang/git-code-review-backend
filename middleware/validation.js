const Joi = require('joi');

const validateGitHubUrl = (req, res, next) => {
  const schema = Joi.object({
    githubUrl: Joi.string()
      .required()
      .messages({
        'any.required': 'Repository URL is required',
        'string.empty': 'Repository URL cannot be empty'
      }),
    teamName: Joi.string()
      .max(100)
      .trim()
      .optional()
      .allow('', null)
      .messages({
        'string.max': 'Team name must be less than 100 characters'
      }),
    analysisDepth: Joi.string()
      .valid('basic', 'detailed', 'comprehensive')
      .default('detailed'),
    includeTests: Joi.boolean().default(true),
    includeDocumentation: Joi.boolean().default(true)
  });

  const { error, value } = schema.validate(req.body);
  
  if (error) {
    console.error('Single review validation error:', error.details);
    return res.status(400).json({
      error: 'Validation failed',
      details: error.details[0].message,
      field: error.details[0].path?.join('.'),
      receivedValue: error.details[0].context?.value
    });
  }

  req.body = value;
  next();
};

const validateBulkReviewRequest = (req, res, next) => {
  console.log('Validating bulk review request:', JSON.stringify(req.body, null, 2));
  
  const repoSchema = Joi.object({
    githubUrl: Joi.string()
      .required()
      .messages({
        'any.required': 'Repository URL is required',
        'string.empty': 'Repository URL cannot be empty'
      }),
    teamName: Joi.string()
      .max(100)
      .trim()
      .optional()
      .allow('', null)
      .messages({
        'string.max': 'Team name must be less than 100 characters'
      })
  });

  const schema = Joi.object({
    repos: Joi.array()
      .items(repoSchema)
      .min(1)
      .max(50) // 최대 50개 저장소로 제한
      .required()
      .messages({
        'array.min': 'At least one repository is required',
        'array.max': 'Maximum 50 repositories allowed per bulk request',
        'any.required': 'Repositories array is required'
      }),
    analysisDepth: Joi.string()
      .valid('basic', 'detailed', 'comprehensive')
      .default('detailed'),
    includeTests: Joi.boolean().default(true),
    includeDocumentation: Joi.boolean().default(true)
  });

  const { error, value } = schema.validate(req.body);
  
  if (error) {
    console.error('Validation error:', error.details);
    return res.status(400).json({
      error: 'Validation failed',
      details: error.details[0].message,
      field: error.details[0].path?.join('.'),
      receivedValue: error.details[0].context?.value
    });
  }

  // 중복 URL 체크
  const urls = value.repos.map(repo => repo.githubUrl.toLowerCase());
  const uniqueUrls = new Set(urls);
  if (urls.length !== uniqueUrls.size) {
    console.error('Duplicate URLs found:', urls);
    return res.status(400).json({
      error: 'Validation failed',
      details: 'Duplicate repository URLs are not allowed'
    });
  }

  console.log('Validation successful, processed data:', JSON.stringify(value, null, 2));
  req.body = value;
  next();
};

module.exports = { validateGitHubUrl, validateBulkReviewRequest };
