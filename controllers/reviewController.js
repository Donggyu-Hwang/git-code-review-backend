const githubService = require('../services/githubService');
const bedrockService = require('../services/bedrockService');
const databaseService = require('../services/databaseService');

class ReviewController {
  // 코드 리뷰 보고서 생성
  async generateReview(req, res, next) {
    try {
      const { githubUrl, teamName, analysisDepth, includeTests, includeDocumentation } = req.body;
      
      console.log(`Starting review generation for: ${githubUrl}`);

      // 1. GitHub URL 파싱
      const { owner, repo } = githubService.parseGitHubUrl(githubUrl);
      
      // 2. 기존 리뷰 확인 (선택사항)
      const existingReview = await databaseService.getReviewByGitHubUrl(githubUrl);
      if (existingReview && req.query.force !== 'true') {
        return res.json({
          message: 'Review already exists for this repository',
          existingReview: {
            id: existingReview.id,
            createdAt: existingReview.created_at,
            summary: existingReview.summary
          },
          hint: 'Add ?force=true to generate a new review'
        });
      }

      // 3. GitHub 저장소 분석
      console.log('Analyzing GitHub repository...');
      const repositoryAnalysis = await githubService.analyzeRepository(owner, repo);
      
      // 4. 코드 샘플 가져오기
      console.log('Fetching code samples...');
      const codeSamples = await githubService.getCodeSamples(
        owner, 
        repo, 
        repositoryAnalysis.codeFiles,
        10 // 최대 10개 파일
      );

      // 5. Bedrock으로 리뷰 보고서 생성
      console.log('Generating review report with Amazon Bedrock...');
      const repositoryData = {
        ...repositoryAnalysis,
        codeSamples
      };
      
      const fullReport = await bedrockService.generateCodeReviewReport(
        repositoryData, 
        analysisDepth
      );

      // 6. 요약 생성
      console.log('Generating summary...');
      const summary = await bedrockService.generateSummary(fullReport);

      // 7. 데이터베이스에 저장
      console.log('Saving to database...');
      const reviewRecord = {
        github_url: githubUrl,
        repository_owner: owner,
        repository_name: repo,
        team_name: teamName || null,
        repository_language: repositoryAnalysis.repository.language,
        repository_description: repositoryAnalysis.repository.description,
        analysis_depth: analysisDepth,
        include_tests: includeTests,
        include_documentation: includeDocumentation,
        full_report: fullReport,
        summary: summary,
        repository_stats: {
          stars: repositoryAnalysis.repository.stargazers_count,
          forks: repositoryAnalysis.repository.forks_count,
          size: repositoryAnalysis.repository.size,
          files: repositoryAnalysis.structure.totalFiles,
          languages: repositoryAnalysis.languages
        },
        created_at: new Date().toISOString()
      };

      const savedReview = await databaseService.saveCodeReview(reviewRecord);

      console.log('Review generation completed successfully');

      res.status(201).json({
        success: true,
        message: 'Code review report generated successfully',
        review: {
          id: savedReview.id,
          githubUrl: savedReview.github_url,
          repositoryName: `${owner}/${repo}`,
          teamName: savedReview.team_name,
          summary: savedReview.summary,
          fullReport: savedReview.full_report,
          createdAt: savedReview.created_at,
          analysisDepth: savedReview.analysis_depth,
          repositoryStats: savedReview.repository_stats
        }
      });

    } catch (error) {
      console.error('Error generating review:', error);
      next(error);
    }
  }

  // 특정 리뷰 조회
  async getReview(req, res, next) {
    try {
      const { id } = req.params;
      
      const review = await databaseService.getCodeReviewById(id);
      
      if (!review) {
        return res.status(404).json({
          error: 'Review not found'
        });
      }

      res.json({
        success: true,
        review: {
          id: review.id,
          githubUrl: review.github_url,
          repositoryName: `${review.repository_owner}/${review.repository_name}`,
          teamName: review.team_name,
          repositoryLanguage: review.repository_language,
          repositoryDescription: review.repository_description,
          summary: review.summary,
          fullReport: review.full_report,
          createdAt: review.created_at,
          analysisDepth: review.analysis_depth,
          repositoryStats: review.repository_stats
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // 모든 리뷰 목록 조회
  async getAllReviews(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const result = await databaseService.getAllCodeReviews(page, limit);

      const reviews = result.reviews.map(review => ({
        id: review.id,
        githubUrl: review.github_url,
        repositoryName: `${review.repository_owner}/${review.repository_name}`,
        teamName: review.team_name,
        repositoryLanguage: review.repository_language,
        summary: review.summary,
        createdAt: review.created_at,
        analysisDepth: review.analysis_depth
      }));

      res.json({
        success: true,
        reviews,
        pagination: {
          currentPage: result.currentPage,
          totalPages: result.totalPages,
          totalCount: result.totalCount,
          limit
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // 리뷰 삭제
  async deleteReview(req, res, next) {
    try {
      const { id } = req.params;
      
      await databaseService.deleteCodeReview(id);
      
      res.json({
        success: true,
        message: 'Review deleted successfully'
      });

    } catch (error) {
      next(error);
    }
  }

  // 통계 조회
  async getStatistics(req, res, next) {
    try {
      const stats = await databaseService.getStatistics();
      
      res.json({
        success: true,
        statistics: stats
      });

    } catch (error) {
      next(error);
    }
  }

  // 팀명으로 리뷰 검색
  async getReviewsByTeam(req, res, next) {
    try {
      const { teamName } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const result = await databaseService.getReviewsByTeamName(teamName, page, limit);

      const reviews = result.reviews.map(review => ({
        id: review.id,
        githubUrl: review.github_url,
        repositoryName: `${review.repository_owner}/${review.repository_name}`,
        teamName: review.team_name,
        repositoryLanguage: review.repository_language,
        summary: review.summary,
        createdAt: review.created_at,
        analysisDepth: review.analysis_depth
      }));

      res.json({
        success: true,
        teamName,
        reviews,
        pagination: {
          currentPage: result.currentPage,
          totalPages: result.totalPages,
          totalCount: result.totalCount,
          limit
        }
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ReviewController();
