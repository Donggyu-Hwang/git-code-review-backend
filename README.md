# Git Code Review Backend

해커톤 심사위원들을 위한 GitHub 저장소 코드 리뷰 보고서 생성 백엔드 API

## 프로젝트 개요

이 프로젝트는 공개된 GitHub 저장소 URL을 입력받아 Amazon Bedrock API(Claude)를 활용하여 상세한 코드 리뷰 보고서를 생성하는 Node.js 백엔드 서비스입니다. 해커톤에서 실제 기술 구현 여부를 판별하고 코드 품질을 평가하는 데 도움을 줍니다.

## 주요 기능

- 📊 GitHub 저장소 자동 분석
- 🤖 Amazon Bedrock Claude를 활용한 상세 코드 리뷰 보고서 생성
- 💾 Supabase 데이터베이스를 통한 리뷰 데이터 저장
- 🔍 실제 구현 vs LLM 생성 코드 판별
- 📈 통계 및 분석 데이터 제공
- 🚀 대량 업로드 기능 (CSV 지원)
- 📋 샘플 CSV 템플릿 제공

## 기술 스택

- **Backend**: Node.js, Express.js
- **Database**: Supabase (PostgreSQL)
- **AI**: Amazon Bedrock (Claude)
- **External API**: GitHub API
- **Validation**: Joi
- **Security**: Helmet, CORS

## API 엔드포인트

### 코드 리뷰 생성
```
POST /api/reviews/generate
```

**Request Body:**
```json
{
  "githubUrl": "https://github.com/owner/repository",
  "teamName": "우리팀",
  "analysisDepth": "detailed",
  "includeTests": true,
  "includeDocumentation": true
}
```

### 대량 코드 리뷰 생성
```
POST /api/reviews/bulk
```

**Request Body:**
```json
{
  "repos": [
    {
      "githubUrl": "https://github.com/facebook/react",
      "teamName": "Frontend Team"
    },
    {
      "githubUrl": "https://github.com/nodejs/node",
      "teamName": "Backend Team"
    }
  ],
  "analysisDepth": "detailed",
  "includeTests": true,
  "includeDocumentation": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bulk review generation completed. 2 successful, 0 failed.",
  "results": [
    {
      "githubUrl": "https://github.com/facebook/react",
      "success": true,
      "reviewId": "123e4567-e89b-12d3-a456-426614174000"
    }
  ],
  "summary": {
    "total": 2,
    "successful": 2,
    "failed": 0
  }
}
```

### 샘플 CSV 다운로드
```
GET /api/reviews/bulk/sample-csv
```

CSV 형식 예시:
```csv
githubUrl,teamName
https://github.com/facebook/react,Frontend Team
https://github.com/microsoft/vscode,Editor Team
```

### 리뷰 조회
```
GET /api/reviews/:id
GET /api/reviews?page=1&limit=10
GET /api/reviews/team/:teamName?page=1&limit=10
```

### 통계 조회
```
GET /api/reviews/stats
```

### 리뷰 삭제
```
DELETE /api/reviews/:id
```

## 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
`.env` 파일을 생성하고 다음 내용을 추가:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# GitHub Configuration  
GITHUB_TOKEN=your_github_personal_access_token

# AWS Bedrock Configuration
AWS_BEDROCK_REGION=us-west-2
AWS_BEDROCK_ACCESS_KEY=your_aws_access_key
AWS_BEDROCK_SECRET_KEY=your_aws_secret_key
AWS_BEDROCK_PROFILE_ARN=your_bedrock_profile_arn

# Server Configuration
PORT=3000
NODE_ENV=development
```

**GitHub 토큰 설정:**
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. "Generate new token" 클릭
3. repo 권한 선택
4. 생성된 토큰을 `GITHUB_TOKEN`에 설정

### 3. 데이터베이스 설정

Supabase 대시보드에서 SQL 에디터를 열고 `database/schema.sql` 파일의 내용을 실행하여 필요한 테이블을 생성합니다.

### 4. 서버 실행

**개발 모드:**
```bash
npm run dev
```

**프로덕션 모드:**
```bash
npm start
```

## 데이터베이스 스키마

### code_reviews 테이블

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | UUID | 기본 키 |
| github_url | TEXT | GitHub 저장소 URL |
| repository_owner | TEXT | 저장소 소유자 |
| repository_name | TEXT | 저장소 이름 |
| team_name | TEXT | 팀명 (선택사항) |
| repository_language | TEXT | 주 프로그래밍 언어 |
| repository_description | TEXT | 저장소 설명 |
| analysis_depth | TEXT | 분석 깊이 (basic/detailed/comprehensive) |
| include_tests | BOOLEAN | 테스트 포함 여부 |
| include_documentation | BOOLEAN | 문서화 포함 여부 |
| full_report | TEXT | 전체 리뷰 보고서 |
| summary | TEXT | 요약 |
| repository_stats | JSONB | 저장소 통계 |
| created_at | TIMESTAMP | 생성 시간 |
| updated_at | TIMESTAMP | 수정 시간 |

## 사용 예시

### 코드 리뷰 생성 요청

```bash
curl -X POST http://localhost:3000/api/reviews/generate \
  -H "Content-Type: application/json" \
  -d '{
    "githubUrl": "https://github.com/facebook/react",
    "teamName": "우리팀",
    "analysisDepth": "detailed"
  }'
```

### 응답 예시

```json
{
  "success": true,
  "message": "Code review report generated successfully",
  "review": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "githubUrl": "https://github.com/facebook/react",
    "repositoryName": "facebook/react",
    "teamName": "우리팀",
    "summary": "React는 잘 구조화된 대규모 JavaScript 라이브러리로...",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "analysisDepth": "detailed"
  }
}
```

## 보고서 구성 요소

생성되는 코드 리뷰 보고서는 다음 항목들을 포함합니다:

1. **프로젝트 개요 및 목적**
2. **기술 스택 분석**
3. **아키텍처 및 코드 구조 평가**
4. **코드 품질 분석**
5. **실제 구현 vs LLM 생성 코드 판별**
6. **테스트 및 문서화 수준**
7. **배포 및 운영 준비도**
8. **개선 제안사항**
9. **해커톤 심사 관점에서의 종합 평가**
10. **결론 및 총평**

## 에러 처리

API는 적절한 HTTP 상태 코드와 함께 구조화된 에러 응답을 제공합니다:

```json
{
  "error": "Repository not found or is private",
  "status": 404
}
```

## 보안 고려사항

- CORS 설정으로 허용된 도메인에서만 접근 가능
- Helmet.js를 통한 기본 보안 헤더 설정
- 입력값 검증 및 sanitization
- 환경 변수를 통한 민감한 정보 관리

## 라이센스

MIT License

## 기여

이슈나 풀 리퀘스트를 통해 기여해주세요.

## 연락처

프로젝트 관련 문의사항이 있으시면 이슈를 생성해주세요.
