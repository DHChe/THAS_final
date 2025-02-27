import { performance } from 'perf_hooks';
import { loadPayrollData } from '../payrollLoader.js';
import aiDataProcessor from '../aiDataProcessor.js';

const { 
  preprocessPayrollData, 
  optimizeForLLM, 
  aggregatePayrollData 
} = aiDataProcessor;

/**
 * 성능 측정을 위한 래퍼 함수
 */
const measurePerformance = async (fn, name) => {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  return {
    name,
    duration: end - start,
    result
  };
};

// ... (이전에 공유한 성능 테스트 코드) 