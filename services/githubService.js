const axios = require('axios');

class GitHubService {
  constructor() {
    this.baseURL = 'https://api.github.com';
    this.headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Code-Review-Backend'
    };
    
    // GitHub 토큰이 있으면 인증 헤더 추가
    if (process.env.GITHUB_TOKEN) {
      this.headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }
  }

  // GitHub/GitLab URL에서 owner와 repo 추출
  parseGitHubUrl(url) {
    console.log('Parsing URL:', url);
    
    // GitHub, GitLab, Bitbucket URL 처리
    let match;
    
    // 일반적인 저장소 URL: https://github.com/owner/repo
    match = url.match(/(?:github\.com|gitlab\.com|bitbucket\.org)\/([^\/]+)\/([^\/\?#]+)/);
    if (match) {
      const owner = match[1];
      let repo = match[2].replace(/\.git$/, '');
      
      // 조직 페이지나 사용자 페이지인 경우 처리
      if (repo === 'repositories' || repo === 'repos') {
        throw new Error('ORGANIZATION_PAGE');
      }
      
      console.log('Parsed owner:', owner, 'repo:', repo);
      return { owner, repo };
    }
    
    // 조직 URL 패턴: https://github.com/orgs/orgname/repositories
    match = url.match(/github\.com\/orgs\/([^\/]+)/);
    if (match) {
      throw new Error('ORGANIZATION_PAGE');
    }
    
    // 사용자 프로필 URL: https://github.com/username (저장소 없음)
    match = url.match(/(?:github\.com|gitlab\.com|bitbucket\.org)\/([^\/\?#]+)\/?$/);
    if (match) {
      throw new Error('USER_PROFILE_PAGE');
    }
    
    throw new Error('Invalid repository URL format. Please provide a direct link to a repository.');
  }

  // 조직의 모든 저장소 가져오기
  async getOrganizationRepositories(orgName, maxRepos = 20) {
    try {
      console.log(`Fetching repositories for organization: ${orgName}`);
      const response = await axios.get(`${this.baseURL}/orgs/${orgName}/repos`, {
        headers: this.headers,
        params: {
          type: 'public',
          sort: 'updated',
          per_page: maxRepos
        }
      });

      return response.data.map(repo => ({
        name: repo.name,
        full_name: repo.full_name,
        html_url: repo.html_url,
        description: repo.description,
        language: repo.language,
        stargazers_count: repo.stargazers_count,
        updated_at: repo.updated_at
      }));
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('Organization not found or has no public repositories');
      }
      if (error.response?.status === 403) {
        throw new Error('GitHub API rate limit exceeded or access forbidden');
      }
      throw new Error(`Failed to fetch organization repositories: ${error.message}`);
    }
  }

  // 사용자의 모든 저장소 가져오기
  async getUserRepositories(username, maxRepos = 20) {
    try {
      console.log(`Fetching repositories for user: ${username}`);
      const response = await axios.get(`${this.baseURL}/users/${username}/repos`, {
        headers: this.headers,
        params: {
          type: 'public',
          sort: 'updated',
          per_page: maxRepos
        }
      });

      return response.data.map(repo => ({
        name: repo.name,
        full_name: repo.full_name,
        html_url: repo.html_url,
        description: repo.description,
        language: repo.language,
        stargazers_count: repo.stargazers_count,
        updated_at: repo.updated_at
      }));
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('User not found or has no public repositories');
      }
      if (error.response?.status === 403) {
        throw new Error('GitHub API rate limit exceeded or access forbidden');
      }
      throw new Error(`Failed to fetch user repositories: ${error.message}`);
    }
  }

  // URL에서 조직/사용자 정보 추출
  extractOwnerFromUrl(url) {
    let match;
    
    // 조직 URL 패턴들
    // 1. https://github.com/orgs/orgname
    // 2. https://github.com/orgs/orgname/repositories
    match = url.match(/github\.com\/orgs\/([^\/\?#]+)/);
    if (match) {
      return { type: 'organization', name: match[1] };
    }
    
    // 3. https://github.com/orgname/repositories (조직이 repositories 페이지를 가진 경우)
    match = url.match(/github\.com\/([^\/\?#]+)\/repositories\/?$/);
    if (match) {
      return { type: 'organization', name: match[1] };
    }
    
    // 4. 일반 사용자/조직 URL: https://github.com/username
    match = url.match(/github\.com\/([^\/\?#]+)\/?$/);
    if (match) {
      // 먼저 조직인지 확인해보고, 실패하면 사용자로 처리
      return { type: 'user_or_org', name: match[1] };
    }
    
    return null;
  }

  // 조직인지 사용자인지 확인하는 헬퍼 함수
  async checkIfOrganization(name) {
    try {
      // 조직 정보 확인 시도
      await axios.get(`${this.baseURL}/orgs/${name}`, {
        headers: this.headers
      });
      return true; // 조직임
    } catch (error) {
      return false; // 조직이 아님 (사용자일 가능성)
    }
  }

  // 저장소 정보 가져오기
  async getRepositoryInfo(owner, repo) {
    try {
      const response = await axios.get(`${this.baseURL}/repos/${owner}/${repo}`, {
        headers: this.headers
      });
      return {
        name: response.data.name,
        description: response.data.description,
        language: response.data.language,
        stargazers_count: response.data.stargazers_count,
        forks_count: response.data.forks_count,
        size: response.data.size,
        created_at: response.data.created_at,
        updated_at: response.data.updated_at,
        topics: response.data.topics || []
      };
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('Repository not found or is private');
      }
      if (error.response?.status === 403) {
        throw new Error('GitHub API rate limit exceeded or access forbidden');
      }
      throw new Error(`Failed to fetch repository info: ${error.message}`);
    }
  }

  // 저장소 파일 트리 가져오기
  async getRepositoryTree(owner, repo, sha = 'HEAD') {
    try {
      const response = await axios.get(
        `${this.baseURL}/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`,
        { headers: this.headers }
      );
      return response.data.tree;
    } catch (error) {
      if (error.response?.status === 403) {
        throw new Error('GitHub API rate limit exceeded or access forbidden');
      }
      throw new Error(`Failed to fetch repository tree: ${error.message}`);
    }
  }

  // 파일 내용 가져오기
  async getFileContent(owner, repo, path) {
    try {
      const response = await axios.get(
        `${this.baseURL}/repos/${owner}/${repo}/contents/${path}`,
        { headers: this.headers }
      );
      
      if (response.data.type !== 'file') {
        throw new Error('Path is not a file');
      }

      // Base64 디코딩
      const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
      return {
        content,
        size: response.data.size,
        path: response.data.path
      };
    } catch (error) {
      if (error.response?.status === 403) {
        throw new Error('GitHub API rate limit exceeded or access forbidden');
      }
      throw new Error(`Failed to fetch file content: ${error.message}`);
    }
  }

  // 주요 파일들 분석
  async analyzeRepository(owner, repo) {
    try {
      const [repoInfo, tree] = await Promise.all([
        this.getRepositoryInfo(owner, repo),
        this.getRepositoryTree(owner, repo)
      ]);

      // 파일 타입별 분류
      const analysis = {
        repository: repoInfo,
        structure: {
          totalFiles: tree.length,
          directories: tree.filter(item => item.type === 'tree').length,
          files: tree.filter(item => item.type === 'blob').length
        },
        languages: {},
        importantFiles: {
          readme: null,
          packageJson: null,
          dockerfile: null,
          gitignore: null
        },
        codeFiles: []
      };

      // 언어별 파일 수 계산
      const codeExtensions = {
        '.js': 'JavaScript',
        '.ts': 'TypeScript',
        '.py': 'Python',
        '.java': 'Java',
        '.cpp': 'C++',
        '.c': 'C',
        '.cs': 'C#',
        '.php': 'PHP',
        '.rb': 'Ruby',
        '.go': 'Go',
        '.rs': 'Rust',
        '.swift': 'Swift',
        '.kt': 'Kotlin'
      };

      for (const item of tree) {
        if (item.type === 'blob') {
          const ext = item.path.substring(item.path.lastIndexOf('.'));
          const language = codeExtensions[ext];
          
          if (language) {
            analysis.languages[language] = (analysis.languages[language] || 0) + 1;
            analysis.codeFiles.push(item.path);
          }

          // 중요한 파일들 체크
          const fileName = item.path.toLowerCase();
          if (fileName.includes('readme')) {
            analysis.importantFiles.readme = item.path;
          } else if (fileName === 'package.json') {
            analysis.importantFiles.packageJson = item.path;
          } else if (fileName === 'dockerfile') {
            analysis.importantFiles.dockerfile = item.path;
          } else if (fileName === '.gitignore') {
            analysis.importantFiles.gitignore = item.path;
          }
        }
      }

      return analysis;
    } catch (error) {
      throw new Error(`Repository analysis failed: ${error.message}`);
    }
  }

  // 주요 코드 파일들의 내용 가져오기 (샘플링)
  async getCodeSamples(owner, repo, codeFiles, maxFiles = 10) {
    const samples = [];
    const filesToAnalyze = codeFiles.slice(0, maxFiles);

    for (const filePath of filesToAnalyze) {
      try {
        const fileContent = await this.getFileContent(owner, repo, filePath);
        samples.push({
          path: filePath,
          content: fileContent.content.substring(0, 2000), // 처음 2000자만
          size: fileContent.size
        });
      } catch (error) {
        console.warn(`Failed to fetch content for ${filePath}:`, error.message);
      }
    }

    return samples;
  }
}

module.exports = new GitHubService();
