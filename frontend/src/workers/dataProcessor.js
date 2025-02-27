import { 
  preprocessPayrollData, 
  optimizeForLLM, 
  aggregatePayrollData 
} from '../utils/aiDataProcessor.js';

self.onmessage = async (event) => {
  const { rawData } = event.data;
  
  try {
    // 데이터 처리 파이프라인 실행
    const preprocessed = preprocessPayrollData(rawData, rawData);
    if (!preprocessed.success) throw preprocessed.error;
    
    const optimized = optimizeForLLM(preprocessed);
    if (!optimized.success) throw optimized.error;
    
    const aggregated = aggregatePayrollData(optimized);
    if (!aggregated.success) throw aggregated.error;

    self.postMessage({ success: true, data: aggregated.data });
  } catch (error) {
    self.postMessage({ success: false, error });
  }
}; 