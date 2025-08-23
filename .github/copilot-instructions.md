<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# GitHub Code Review Backend - Copilot Instructions

이 프로젝트는 GitHub 저장소 분석 및 코드 리뷰 보고서 생성을 위한 Node.js Express 백엔드입니다.

## 프로젝트 구조 및 패턴

- **MVC 패턴**: Controllers, Services, Routes로 분리
- **서비스 계층**: GitHub API, OpenAI API, Database 로직 분리
- **미들웨어**: 유효성 검사, 에러 처리
- **환경 설정**: dotenv를 통한 환경 변수 관리

## 코딩 스타일 가이드라인

- ES6+ 문법 사용 (async/await, destructuring 등)
- 명확한 함수명과 변수명 사용
- 에러 처리는 try-catch와 next() 미들웨어 활용
- console.log 대신 적절한 로깅 시스템 사용
- 주석은 한국어로 작성하되 기술 용어는 영어 유지

## API 설계 원칙

- RESTful API 패턴 준수
- 일관된 응답 형식: { success, message, data }
- 적절한 HTTP 상태 코드 사용
- 입력값 검증은 Joi 스키마 활용
- 페이지네이션 지원

## 데이터베이스

- Supabase PostgreSQL 사용
- UUID 기본 키 사용
- created_at, updated_at 자동 관리
- JSONB 타입으로 복잡한 데이터 저장
- 적절한 인덱스 설정

## 외부 API 연동

- **GitHub API**: 저장소 정보, 파일 트리, 파일 내용 조회
- **OpenAI API**: GPT-4를 활용한 코드 리뷰 보고서 생성
- 에러 처리 및 재시도 로직 포함
- API 요청 제한 고려

## 보안 고려사항

- 환경 변수로 민감한 정보 관리
- Helmet.js 보안 헤더 설정
- CORS 설정
- 입력값 검증 및 sanitization
- SQL 인젝션 방지

## 테스트 및 문서화

- Jest 테스트 프레임워크 사용
- API 문서화는 코드 주석과 README 활용
- 에러 시나리오 테스트 포함
