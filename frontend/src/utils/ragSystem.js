import { OpenAIEmbeddings } from '@langchain/openai';
import { ChatOpenAI } from '@langchain/openai';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { Client } from 'langsmith';
import { debugLangSmithTrace } from './debugLangSmith';

export class PayrollRAGSystem {
  constructor(apiKey) {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: apiKey
    });
    
    this.llm = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: 'gpt-3.5-turbo',
      temperature: 0.3,
      maxTokens: 500
    });

    // LangSmith 클라이언트 초기화
    this.langSmithClient = new Client({
      apiUrl: process.env.REACT_APP_LANGCHAIN_ENDPOINT,
      apiKey: process.env.REACT_APP_LANGCHAIN_API_KEY,
      projectName: process.env.REACT_APP_LANGCHAIN_PROJECT
    });

    console.log('🚀 RAG 시스템 초기화');
    this.testLangSmithConnection();

    this.initializePrompts();
  }

  initializePrompts() {
    this.qaTemplate = PromptTemplate.fromTemplate(`
당신은 기업 급여 분석 전문가입니다. 다음 정보와 지침을 바탕으로 분석을 수행해주세요.

[분석 환경]
- 대상: 중견기업 급여 데이터 (직원 수: ~100명)
- 데이터 구조: 직급별 기본급, 수당, 공제내역, 실수령액, 인사정보 포함
- 시간 범위: 최근 12개월 급여 데이터

[분석 지침]
1. 통계적 접근
   - 기술통계: 평균, 중앙값, 표준편차, 사분위수
   - 분포 분석: 직급별, 부서별, 고용형태별
   - 시계열 분석: 월별 추이, 전년 동기 대비

2. 공정성 검증
   - 직급 내 급여 편차
   - 동일 직무 급여 비교
   - 성과급 분포 분석

3. 법적 준수사항
   - 최저임금 기준 충족
   - 법정수당 적정성
   - 공제항목 적정성

[제공된 컨텍스트]
{context}

[분석 요청 사항]
{question}

[응답 형식]
1. 핵심 분석 결과
   - 명확한 수치와 함께 제시
   - 통계적 유의성 언급 (해당되는 경우)

2. 세부 분석
   - 관련 데이터 포인트 제시
   - 특이사항 또는 예외 케이스 설명

3. 시사점
   - 발견된 패턴이나 추세
   - 잠재적 개선 포인트

4. 권장 사항
   - 데이터 기반 제안사항
   - 추가 분석이 필요한 영역

주의사항:
- 개인식별정보는 제외하고 응답
- 수치는 반올림하여 제시
- 불확실한 부분은 명시적으로 언급
- 한국어로 명확하게 응답
`);
  }

  async testLangSmithConnection() {
    console.group('📡 LangSmith 연결 테스트');
    try {
      const projects = await debugLangSmithTrace(
        this.langSmithClient, 
        'listProjects',
        {}
      );
      console.log('✅ 연결 성공');
      console.log('프로젝트 목록:', projects);
    } catch (error) {
      console.error('❌ 연결 실패:', {
        error: error.message,
        stack: error.stack,
        config: {
          apiUrl: process.env.REACT_APP_LANGCHAIN_ENDPOINT,
          projectName: process.env.REACT_APP_LANGCHAIN_PROJECT,
          hasApiKey: !!process.env.REACT_APP_LANGCHAIN_API_KEY
        }
      });
    }
    console.groupEnd();
  }

  async processQuery(query, vectorStore) {
    console.group('📊 쿼리 처리');
    try {
      // 트레이스 생성
      const trace = await debugLangSmithTrace(
        this.langSmithClient,
        'createTrace',
        {
          name: "급여 데이터 분석",
          metadata: {
            queryType: "payroll_analysis",
            timestamp: new Date().toISOString()
          }
        }
      );

      // 1. 관련 문서 검색
      const retrievalStart = await debugLangSmithTrace(
        this.langSmithClient,
        'createRun',
        {
          name: "문서 검색",
          run_type: "retrieval",
          inputs: { query },
          parent_run_id: trace.id
        }
      );

      const relevantDocs = await vectorStore.similaritySearch(query, 3);
      
      await debugLangSmithTrace(
        this.langSmithClient,
        'updateRun',
        {
          id: retrievalStart.id,
          outputs: { 
            documents: relevantDocs.map(doc => doc.pageContent)
          },
          end_time: new Date()
        }
      );

      // 2. 컨텍스트 준비
      const context = relevantDocs.map(doc => doc.pageContent).join('\n\n');
      
      // 3. RAG 체인 실행
      const llmStart = await debugLangSmithTrace(
        this.langSmithClient,
        'createRun',
        {
          name: "LLM 추론",
          run_type: "llm",
          inputs: { 
            query,
            context
          },
          parent_run_id: trace.id
        }
      );

      const chain = RunnableSequence.from([
        {
          context: () => context,
          question: () => query
        },
        this.qaTemplate,
        this.llm,
        new StringOutputParser()
      ]);

      const response = await chain.invoke({});

      await debugLangSmithTrace(
        this.langSmithClient,
        'updateRun',
        {
          id: llmStart.id,
          outputs: { response },
          end_time: new Date()
        }
      );

      // 트레이스 완료
      await debugLangSmithTrace(
        this.langSmithClient,
        'updateTrace',
        {
          id: trace.id,
          end_time: new Date()
        }
      );

      console.groupEnd();
      return {
        response,
        sources: relevantDocs.map(doc => doc.metadata),
        traceId: trace.id
      };
    } catch (error) {
      console.error('❌ 쿼리 처리 실패:', error);
      console.groupEnd();
      throw error;
    }
  }
} 