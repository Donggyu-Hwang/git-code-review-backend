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
      let owner, repo;
      try {
        const parsed = githubService.parseGitHubUrl(githubUrl);
        owner = parsed.owner;
        repo = parsed.repo;
      } catch (parseError) {
        // 유효하지 않은 저장소인 경우 간단한 레코드만 저장
        const reviewRecord = {
          github_url: githubUrl,
          repository_owner: null,
          repository_name: null,
          team_name: teamName || null,
          repository_language: null,
          repository_description: null,
          analysis_depth: analysisDepth,
          include_tests: includeTests,
          include_documentation: includeDocumentation,
          full_report: '유효한 저장소가 아닙니다',
          summary: '유효한 저장소가 아닙니다',
          repository_stats: null,
          created_at: new Date().toISOString()
        };

        const savedReview = await databaseService.saveCodeReview(reviewRecord);

        return res.status(201).json({
          success: true,
          message: 'Review saved (invalid repository)',
          review: {
            id: savedReview.id,
            githubUrl: savedReview.github_url,
            repositoryName: 'Invalid Repository',
            teamName: savedReview.team_name,
            summary: savedReview.summary,
            fullReport: savedReview.full_report,
            createdAt: savedReview.created_at,
            analysisDepth: savedReview.analysis_depth,
            repositoryStats: null
          }
        });
      }
      
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
      let repositoryAnalysis, codeSamples;
      try {
        repositoryAnalysis = await githubService.analyzeRepository(owner, repo);
        
        // 4. 코드 샘플 가져오기
        console.log('Fetching code samples...');
        codeSamples = await githubService.getCodeSamples(
          owner, 
          repo, 
          repositoryAnalysis.codeFiles,
          10 // 최대 10개 파일
        );
      } catch (analysisError) {
        // GitHub API 호출 실패 시 간단한 레코드만 저장
        const reviewRecord = {
          github_url: githubUrl,
          repository_owner: owner,
          repository_name: repo,
          team_name: teamName || null,
          repository_language: null,
          repository_description: null,
          analysis_depth: analysisDepth,
          include_tests: includeTests,
          include_documentation: includeDocumentation,
          full_report: '유효한 저장소가 아닙니다',
          summary: '유효한 저장소가 아닙니다',
          repository_stats: null,
          created_at: new Date().toISOString()
        };

        const savedReview = await databaseService.saveCodeReview(reviewRecord);

        return res.status(201).json({
          success: true,
          message: 'Review saved (repository analysis failed)',
          review: {
            id: savedReview.id,
            githubUrl: savedReview.github_url,
            repositoryName: `${owner}/${repo}`,
            teamName: savedReview.team_name,
            summary: savedReview.summary,
            fullReport: savedReview.full_report,
            createdAt: savedReview.created_at,
            analysisDepth: savedReview.analysis_depth,
            repositoryStats: null
          }
        });
      }

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

  // 대량 코드 리뷰 보고서 생성
  async generateBulkReviews(req, res, next) {
    try {
      const { repos, analysisDepth, includeTests, includeDocumentation } = req.body;
      
      console.log(`Starting bulk review generation for ${repos.length} repositories`);

      const results = [];
      let successful = 0;
      let failed = 0;

      // 각 저장소를 순차적으로 처리 (병렬 처리하면 API 제한에 걸릴 수 있음)
      for (const repo of repos) {
        const { githubUrl, teamName } = repo;
        
        try {
          console.log(`Processing repository: ${githubUrl}`);

          // 1. GitHub URL 파싱
          let owner, repoName;
          try {
            const parsed = githubService.parseGitHubUrl(githubUrl);
            owner = parsed.owner;
            repoName = parsed.repo;
          } catch (parseError) {
            // 유효하지 않은 저장소인 경우 간단한 레코드만 저장
            const reviewRecord = {
              github_url: githubUrl,
              repository_owner: null,
              repository_name: null,
              team_name: teamName || null,
              repository_language: null,
              repository_description: null,
              analysis_depth: analysisDepth,
              include_tests: includeTests,
              include_documentation: includeDocumentation,
              full_report: '유효한 저장소가 아닙니다',
              summary: '유효한 저장소가 아닙니다',
              repository_stats: null,
              created_at: new Date().toISOString()
            };

            const savedReview = await databaseService.saveCodeReview(reviewRecord);

            results.push({
              githubUrl,
              success: true,
              reviewId: savedReview.id,
              note: 'Invalid repository - simple record saved'
            });

            successful++;
            console.log(`Saved simple record for invalid repository: ${githubUrl}`);
            continue;
          }
          
          // 2. 기존 리뷰 확인
          const existingReview = await databaseService.getReviewByGitHubUrl(githubUrl);
          if (existingReview) {
            results.push({
              githubUrl,
              success: false,
              error: 'Review already exists for this repository'
            });
            failed++;
            continue;
          }

          // 3. GitHub 저장소 분석
          let repositoryAnalysis, codeSamples;
          try {
            repositoryAnalysis = await githubService.analyzeRepository(owner, repoName);
            
            // 4. 코드 샘플 가져오기
            codeSamples = await githubService.getCodeSamples(
              owner, 
              repoName, 
              repositoryAnalysis.codeFiles,
              10
            );
          } catch (analysisError) {
            // GitHub API 호출 실패 시에도 간단한 레코드 저장
            const reviewRecord = {
              github_url: githubUrl,
              repository_owner: owner,
              repository_name: repoName,
              team_name: teamName || null,
              repository_language: null,
              repository_description: null,
              analysis_depth: analysisDepth,
              include_tests: includeTests,
              include_documentation: includeDocumentation,
              full_report: '유효한 저장소가 아닙니다',
              summary: '유효한 저장소가 아닙니다',
              repository_stats: null,
              created_at: new Date().toISOString()
            };

            const savedReview = await databaseService.saveCodeReview(reviewRecord);

            results.push({
              githubUrl,
              success: true,
              reviewId: savedReview.id,
              note: 'Repository analysis failed - simple record saved'
            });

            successful++;
            console.log(`Saved simple record for failed analysis: ${githubUrl} - ${analysisError.message}`);
            continue;
          }

          // 5. Bedrock으로 리뷰 보고서 생성
          const repositoryData = {
            ...repositoryAnalysis,
            codeSamples
          };
          
          const fullReport = await bedrockService.generateCodeReviewReport(
            repositoryData, 
            analysisDepth
          );

          // 6. 요약 생성
          const summary = await bedrockService.generateSummary(fullReport);

          // 7. 데이터베이스에 저장
          const reviewRecord = {
            github_url: githubUrl,
            repository_owner: owner,
            repository_name: repoName,
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

          results.push({
            githubUrl,
            success: true,
            reviewId: savedReview.id
          });

          successful++;
          console.log(`Successfully processed: ${githubUrl}`);

        } catch (error) {
          console.error(`Error processing ${githubUrl}:`, error.message);
          
          results.push({
            githubUrl,
            success: false,
            error: error.message || 'Unknown error occurred'
          });
          
          failed++;
        }

        // API 제한을 피하기 위한 짧은 딜레이
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log(`Bulk review generation completed. Success: ${successful}, Failed: ${failed}`);

      res.status(201).json({
        success: true,
        message: `Bulk review generation completed. ${successful} successful, ${failed} failed.`,
        results,
        summary: {
          total: repos.length,
          successful,
          failed
        }
      });

    } catch (error) {
      console.error('Error in bulk review generation:', error);
      next(error);
    }
  }

  // 샘플 CSV 다운로드
  async downloadSampleCsv(req, res, next) {
    try {
      const sampleData = `githubUrl,teamName
https://github.com/facebook/react,Frontend Team
https://github.com/microsoft/vscode,Editor Team
https://github.com/nodejs/node,Backend Team
https://github.com/vuejs/vue,Frontend Team
https://github.com/angular/angular,Frontend Team`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="bulk-review-sample.csv"');
      res.send(sampleData);

    } catch (error) {
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
