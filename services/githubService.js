const axios = require('axios');

class GitHubService {
  constructor() {
    this.baseURL = 'https://api.github.com';
  }

  // GitHub URL에서 owner와 repo 추출
  parseGitHubUrl(url) {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      throw new Error('Invalid GitHub URL format');
    }
    return {
      owner: match[1],
      repo: match[2].replace(/\.git$/, '')
    };
  }

  // 저장소 정보 가져오기
  async getRepositoryInfo(owner, repo) {
    try {
      const response = await axios.get(`${this.baseURL}/repos/${owner}/${repo}`);
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
      throw new Error(`Failed to fetch repository info: ${error.message}`);
    }
  }

  // 저장소 파일 트리 가져오기
  async getRepositoryTree(owner, repo, sha = 'HEAD') {
    try {
      const response = await axios.get(
        `${this.baseURL}/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`
      );
      return response.data.tree;
    } catch (error) {
      throw new Error(`Failed to fetch repository tree: ${error.message}`);
    }
  }

  // 파일 내용 가져오기
  async getFileContent(owner, repo, path) {
    try {
      const response = await axios.get(
        `${this.baseURL}/repos/${owner}/${repo}/contents/${path}`
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
