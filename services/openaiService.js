const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

class BedrockService {
  constructor() {
    this.client = new BedrockRuntimeClient({
      region: process.env.AWS_BEDROCK_REGION,
      credentials: {
        accessKeyId: process.env.AWS_BEDROCK_ACCESS_KEY,
        secretAccessKey: process.env.AWS_BEDROCK_SECRET_KEY
      }
    });
    this.modelArn = process.env.AWS_BEDROCK_PROFILE_ARN;
  }

  // 코드 리뷰 보고서 생성
  async generateCodeReviewReport(repositoryData, analysisDepth = 'detailed') {
    try {
      const prompt = this.buildPrompt(repositoryData, analysisDepth);
      
      const systemMessage = `당신은 경험이 풍부한 시니어 개발자이자 코드 리뷰어입니다. 
GitHub 저장소를 분석하여 해커톤 심사위원들이 참고할 수 있는 상세한 코드 리뷰 보고서를 작성해주세요.
보고서는 한국어로 작성하되, 기술적인 용어는 영어 원문을 병기해주세요.
실제 구현된 기술과 단순히 LLM으로 생성된 것처럼 보이는 부분을 구분하여 평가해주세요.`;

      const input = {
        modelId: this.modelArn,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 4000,
          temperature: 0.3,
          messages: [
            {
              role: 'user',
              content: `${systemMessage}\n\n${prompt}`
            }
          ]
        })
      };

      const command = new InvokeModelCommand(input);
      const response = await this.client.send(command);
      
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      return responseBody.content[0].text;
    } catch (error) {
      throw new Error(`Bedrock API request failed: ${error.message}`);
    }
  }

  // 프롬프트 생성
  buildPrompt(repositoryData, analysisDepth) {
    const { repository, structure, languages, importantFiles, codeSamples } = repositoryData;

    let prompt = `다음 GitHub 저장소에 대한 코드 리뷰 보고서를 작성해주세요:

## 저장소 정보
- 이름: ${repository.name}
- 설명: ${repository.description || '설명 없음'}
- 주 언어: ${repository.language || '미확인'}
- 별표 수: ${repository.stargazers_count}
- 포크 수: ${repository.forks_count}
- 생성일: ${repository.created_at}
- 최근 업데이트: ${repository.updated_at}
- 토픽: ${repository.topics.join(', ') || '없음'}

## 프로젝트 구조
- 총 파일 수: ${structure.totalFiles}
- 디렉토리 수: ${structure.directories}
- 코드 파일 수: ${structure.files}

## 사용된 언어
${Object.entries(languages).map(([lang, count]) => `- ${lang}: ${count}개 파일`).join('\n')}

## 주요 파일
- README: ${importantFiles.readme || '없음'}
- Package.json: ${importantFiles.packageJson || '없음'}
- Dockerfile: ${importantFiles.dockerfile || '없음'}
- .gitignore: ${importantFiles.gitignore || '없음'}

## 코드 샘플
${codeSamples.map(sample => `
### ${sample.path} (${sample.size} bytes)
\`\`\`
${sample.content}
\`\`\`
`).join('\n')}

## 분석 요청사항
분석 깊이: ${analysisDepth}

다음 항목들을 포함하여 보고서를 작성해주세요:

1. **프로젝트 개요 및 목적**
2. **기술 스택 분석**
3. **아키텍처 및 코드 구조 평가**
4. **코드 품질 분석**
   - 코딩 스타일 일관성
   - 에러 처리
   - 보안 고려사항
   - 성능 최적화
5. **실제 구현 vs LLM 생성 코드 판별**
   - 실제 개발자가 작성한 것으로 보이는 부분
   - LLM으로 생성된 것 같은 부분과 그 근거
6. **테스트 및 문서화 수준**
7. **배포 및 운영 준비도**
8. **개선 제안사항**
9. **해커톤 심사 관점에서의 종합 평가**
   - 기술적 완성도 (1-10점)
   - 창의성 및 혁신성 (1-10점)
   - 실용성 (1-10점)
   - 코드 품질 (1-10점)
10. **결론 및 총평**

각 섹션은 구체적인 코드 예시와 함께 상세히 분석해주세요.`;

    return prompt;
  }

  // 짧은 요약 생성
  async generateSummary(fullReport) {
    try {
      const input = {
        modelId: this.modelArn,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 200,
          temperature: 0.3,
          messages: [
            {
              role: 'user',
              content: `다음 코드 리뷰 보고서를 2-3문장으로 요약해주세요.\n\n${fullReport}`
            }
          ]
        })
      };

      const command = new InvokeModelCommand(input);
      const response = await this.client.send(command);
      
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      return responseBody.content[0].text;
    } catch (error) {
      throw new Error(`Summary generation failed: ${error.message}`);
    }
  }
}

module.exports = new BedrockService();
