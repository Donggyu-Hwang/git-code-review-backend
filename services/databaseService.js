const supabase = require('../config/database');

class DatabaseService {
  // 코드 리뷰 보고서 저장
  async saveCodeReview(reviewData) {
    try {
      const { data, error } = await supabase
        .from('code_reviews')
        .insert([reviewData])
        .select();

      if (error) {
        throw new Error(`Database insert failed: ${error.message}`);
      }

      return data[0];
    } catch (error) {
      throw new Error(`Failed to save review: ${error.message}`);
    }
  }

  // 리뷰 조회 (ID로)
  async getCodeReviewById(id) {
    try {
      const { data, error } = await supabase
        .from('code_reviews')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw new Error(`Failed to get review: ${error.message}`);
    }
  }

  // 모든 리뷰 조회 (페이지네이션)
  async getAllCodeReviews(page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      
      const { data, error, count } = await supabase
        .from('code_reviews')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }

      return {
        reviews: data,
        totalCount: count,
        currentPage: page,
        totalPages: Math.ceil(count / limit)
      };
    } catch (error) {
      throw new Error(`Failed to get reviews: ${error.message}`);
    }
  }

  // 특정 저장소 URL로 기존 리뷰 검색
  async getReviewByGitHubUrl(githubUrl) {
    try {
      const { data, error } = await supabase
        .from('code_reviews')
        .select('*')
        .eq('github_url', githubUrl)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }

      return data.length > 0 ? data[0] : null;
    } catch (error) {
      throw new Error(`Failed to search review: ${error.message}`);
    }
  }

  // 리뷰 삭제
  async deleteCodeReview(id) {
    try {
      const { error } = await supabase
        .from('code_reviews')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Database delete failed: ${error.message}`);
      }

      return true;
    } catch (error) {
      throw new Error(`Failed to delete review: ${error.message}`);
    }
  }

  // 통계 조회
  async getStatistics() {
    try {
      const { data: totalCount, error: countError } = await supabase
        .from('code_reviews')
        .select('id', { count: 'exact' });

      if (countError) {
        throw new Error(`Count query failed: ${countError.message}`);
      }

      const { data: recentReviews, error: recentError } = await supabase
        .from('code_reviews')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .select('id', { count: 'exact' });

      if (recentError) {
        throw new Error(`Recent reviews query failed: ${recentError.message}`);
      }

      const { data: languages, error: langError } = await supabase
        .from('code_reviews')
        .select('repository_language')
        .not('repository_language', 'is', null);

      if (langError) {
        throw new Error(`Languages query failed: ${langError.message}`);
      }

      // 언어별 통계 계산
      const languageStats = {};
      languages.forEach(item => {
        const lang = item.repository_language;
        languageStats[lang] = (languageStats[lang] || 0) + 1;
      });

      return {
        totalReviews: totalCount.length,
        recentReviews: recentReviews.length,
        languageStatistics: languageStats
      };
    } catch (error) {
      throw new Error(`Failed to get statistics: ${error.message}`);
    }
  }

  // 팀명으로 리뷰 검색
  async getReviewsByTeamName(teamName, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      
      const { data, error, count } = await supabase
        .from('code_reviews')
        .select('*', { count: 'exact' })
        .eq('team_name', teamName)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }

      return {
        reviews: data,
        totalCount: count,
        currentPage: page,
        totalPages: Math.ceil(count / limit)
      };
    } catch (error) {
      throw new Error(`Failed to get reviews by team name: ${error.message}`);
    }
  }
}

module.exports = new DatabaseService();
