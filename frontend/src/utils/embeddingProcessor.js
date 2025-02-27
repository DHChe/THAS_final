import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';

export class PayrollEmbeddingProcessor {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('OpenAI API 키가 설정되지 않았습니다.');
    }

    console.log('OpenAI API 키 설정 상태:', !!apiKey);

    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: apiKey,
      modelName: 'text-embedding-ada-002',
      maxConcurrency: 3,
      maxRetries: 5,
      timeout: 30000,
      backoffFactor: 2
    });

    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1500,  // 청크 크기 증가 (통합 데이터 수용)
      chunkOverlap: 300,
      separators: ["\n\n", "\n", " ", ""],
      lengthFunction: (text) => text.length,
    });
  }

  calculateStatistics(employeePayroll, allPayrollData, employeesData) {
    const currentPayment = employeePayroll;
    const employeeId = currentPayment.employee_id;
    const department = employeesData.find(e => e.employee_id === employeeId)?.department;
    const position = employeesData.find(e => e.employee_id === employeeId)?.position;

    // 전년 동월 데이터 찾기
    const lastYear = new Date(currentPayment.payment_date);
    lastYear.setFullYear(lastYear.getFullYear() - 1);
    const lastYearPayment = allPayrollData.find(p => 
      p.employee_id === employeeId && 
      new Date(p.payment_date).getMonth() === lastYear.getMonth() &&
      new Date(p.payment_date).getFullYear() === lastYear.getFullYear()
    );

    // 부서/직급 평균 계산
    const sameMonthPayments = allPayrollData.filter(p => 
      new Date(p.payment_date).getMonth() === new Date(currentPayment.payment_date).getMonth() &&
      new Date(p.payment_date).getFullYear() === new Date(currentPayment.payment_date).getFullYear()
    );

    const deptAvg = sameMonthPayments
      .filter(p => employeesData.find(e => e.employee_id === p.employee_id)?.department === department)
      .reduce((sum, p) => sum + Number(p.net_salary), 0) / 
      sameMonthPayments.filter(p => employeesData.find(e => e.employee_id === p.employee_id)?.department === department).length;

    const positionAvg = sameMonthPayments
      .filter(p => employeesData.find(e => e.employee_id === p.employee_id)?.position === position)
      .reduce((sum, p) => sum + Number(p.net_salary), 0) / 
      sameMonthPayments.filter(p => employeesData.find(e => e.employee_id === p.employee_id)?.position === position).length;

    return {
      yearOverYear: lastYearPayment ? 
        ((currentPayment.net_salary - lastYearPayment.net_salary) / lastYearPayment.net_salary * 100).toFixed(1) : 
        null,
      deptComparison: ((currentPayment.net_salary - deptAvg) / deptAvg * 100).toFixed(1),
      positionComparison: ((currentPayment.net_salary - positionAvg) / positionAvg * 100).toFixed(1)
    };
  }

  formatIntegratedRecord(payrollRecord, employeeData, stats) {
    return `
직원상세:
  직원ID: ${employeeData.employee_id}
  이름: ${employeeData.name}
  부서: ${employeeData.department}
  직급: ${employeeData.position}
  입사일: ${employeeData.join_date}
  재직상태: ${employeeData.status}
  가족사항: 자녀 ${employeeData.num_children}명${employeeData.children_ages ? ` (${employeeData.children_ages})` : ''}

급여이력:
  지급월: ${payrollRecord.payment_date.substring(0, 7)}
  기본급: ${payrollRecord.base_salary}
  수당내역:
    직책수당: ${payrollRecord.position_allowance}
    시간외수당: ${payrollRecord.overtime_pay}
    야간근로수당: ${payrollRecord.night_shift_pay}
    휴일근로수당: ${payrollRecord.holiday_pay}
    식대: ${payrollRecord.meal_allowance}
    교통비: ${payrollRecord.transportation_allowance}
    상여금: ${payrollRecord.bonus}
  공제내역:
    국민연금: ${payrollRecord.national_pension}
    건강보험: ${payrollRecord.health_insurance}
    장기요양: ${payrollRecord.long_term_care}
    고용보험: ${payrollRecord.employment_insurance}
    소득세: ${payrollRecord.income_tax}
    지방소득세: ${payrollRecord.local_income_tax}
  총지급액: ${payrollRecord.gross_salary}
  실수령액: ${payrollRecord.net_salary}

통계정보:
  전년동월대비: ${stats.yearOverYear ? `${stats.yearOverYear}%` : '비교불가'}
  부서평균대비: ${stats.deptComparison}%
  직급평균대비: ${stats.positionComparison}%
    `.trim();
  }

  async processChunk(chunk) {
    try {
      // 문서 형식으로 변환
      const docs = chunk.map(record => ({
        pageContent: this.formatRecord(record),
        metadata: {
          employee_id: record.employee_id,
          payment_date: record.payment_date,
          department: record.department,
          position: record.position
        }
      }));

      // 벡터 스토어 생성
      return docs;  // 벡터 스토어 대신 문서 배열 반환
    } catch (error) {
      console.error('청크 처리 중 오류:', error);
      throw error;
    }
  }

  async combineChunks(processedChunks) {
    try {
      console.log('청크 결합 시작...');
      
      // 모든 문서를 하나의 배열로 결합
      const allDocs = processedChunks.flat();
      
      console.log(`총 ${allDocs.length}개의 문서 결합됨`);

      // 결합된 문서로 단일 벡터 스토어 생성
      const vectorStore = await MemoryVectorStore.fromDocuments(
        allDocs,
        this.embeddings
      );

      console.log('벡터 스토어 생성 완료');
      return vectorStore;
    } catch (error) {
      console.error('청크 결합 중 오류:', {
        error: error.message,
        stack: error.stack,
        processedChunksLength: processedChunks.length,
        firstChunkSample: processedChunks[0]?.slice(0, 1)
      });
      throw error;
    }
  }

  formatRecord(record) {
    return `
직원ID: ${record.employee_id}
지급일: ${record.payment_date}
기본급: ${record.base_salary}
직책수당: ${record.position_allowance}
시간외수당: ${record.overtime_pay}
야간근로수당: ${record.night_shift_pay}
휴일근로수당: ${record.holiday_pay}
식대: ${record.meal_allowance}
교통비: ${record.transportation_allowance}
상여금: ${record.bonus}
총급여: ${record.gross_salary}
국민연금: ${record.national_pension}
건강보험: ${record.health_insurance}
    `.trim();
  }

  async processPayrollData(payrollData, employeesData) {
    try {
      console.log('임베딩 처리 시작...');
      
      const CHUNK_SIZE = 100;
      const chunks = [];
      
      for (let i = 0; i < payrollData.length; i += CHUNK_SIZE) {
        chunks.push(payrollData.slice(i, i + CHUNK_SIZE));
      }

      console.log(`${chunks.length}개의 청크로 분할됨 (각 ${CHUNK_SIZE}개)`);
      
      // 청크별 순차 처리
      const processedChunks = [];
      for (const chunk of chunks) {
        console.log(`청크 처리 중... (${processedChunks.length + 1}/${chunks.length})`);
        
        // 청크 처리 중 딜레이 추가
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const processedDocs = await this.processChunk(chunk);
        processedChunks.push(processedDocs);

        // 진행 상황 로깅
        if ((processedChunks.length % 10) === 0) {
          console.log(`진행률: ${Math.round((processedChunks.length / chunks.length) * 100)}%`);
        }
      }

      console.log('모든 청크 처리 완료, 결합 시작...');
      return this.combineChunks(processedChunks);
    } catch (error) {
      console.error('임베딩 처리 중 상세 오류:', error);
      throw new Error('급여 데이터 임베딩 처리 실패');
    }
  }

  async similaritySearch(vectorStore, query, k = 3) {
    try {
      const results = await vectorStore.similaritySearch(query, k);
      return results;
    } catch (error) {
      console.error('유사도 검색 중 오류 발생:', error);
      throw new Error('유사도 검색 실패');
    }
  }
}

// 콘솔 필터링 추가
const originalConsoleError = console.error;
console.error = (...args) => {
  if (!args[0]?.includes('runtime.lastError')) {
    originalConsoleError.apply(console, args);
  }
}; 