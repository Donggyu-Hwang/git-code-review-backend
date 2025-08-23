const Joi = require('joi');

const validateGitHubUrl = (req, res, next) => {
  const schema = Joi.object({
    githubUrl: Joi.string()
      .uri()
      .pattern(/^https:\/\/github\.com\/[^\/]+\/[^\/]+\/?$/)
      .required()
      .messages({
        'string.pattern.base': 'Invalid GitHub repository URL format. Expected: https://github.com/owner/repo',
        'string.uri': 'Must be a valid URL',
        'any.required': 'GitHub URL is required'
      }),
    teamName: Joi.string()
      .min(1)
      .max(100)
      .trim()
      .optional()
      .messages({
        'string.min': 'Team name must be at least 1 character long',
        'string.max': 'Team name must be less than 100 characters',
        'string.empty': 'Team name cannot be empty'
      }),
    analysisDepth: Joi.string()
      .valid('basic', 'detailed', 'comprehensive')
      .default('detailed'),
    includeTests: Joi.boolean().default(true),
    includeDocumentation: Joi.boolean().default(true)
  });

  const { error, value } = schema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.details[0].message
    });
  }

  req.body = value;
  next();
};

const validateBulkReviewRequest = (req, res, next) => {
  const repoSchema = Joi.object({
    githubUrl: Joi.string()
      .uri()
      .pattern(/^https:\/\/github\.com\/[^\/]+\/[^\/]+\/?$/)
      .required()
      .messages({
        'string.pattern.base': 'Invalid GitHub repository URL format. Expected: https://github.com/owner/repo',
        'string.uri': 'Must be a valid URL',
        'any.required': 'GitHub URL is required'
      }),
    teamName: Joi.string()
      .min(1)
      .max(100)
      .trim()
      .optional()
      .messages({
        'string.min': 'Team name must be at least 1 character long',
        'string.max': 'Team name must be less than 100 characters',
        'string.empty': 'Team name cannot be empty'
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
    return res.status(400).json({
      error: 'Validation failed',
      details: error.details[0].message
    });
  }

  // 중복 URL 체크
  const urls = value.repos.map(repo => repo.githubUrl.toLowerCase());
  const uniqueUrls = new Set(urls);
  if (urls.length !== uniqueUrls.size) {
    return res.status(400).json({
      error: 'Validation failed',
      details: 'Duplicate repository URLs are not allowed'
    });
  }

  req.body = value;
  next();
};

module.exports = { validateGitHubUrl, validateBulkReviewRequest };
