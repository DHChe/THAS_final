export const checkLangSmithSetup = () => {
  const debugInfo = {
    environment: {
      LANGCHAIN_API_KEY: process.env.REACT_APP_LANGCHAIN_API_KEY ? '설정됨' : '미설정',
      LANGCHAIN_TRACING_V2: process.env.REACT_APP_LANGCHAIN_TRACING_V2,
      LANGCHAIN_PROJECT: process.env.REACT_APP_LANGCHAIN_PROJECT,
      LANGCHAIN_ENDPOINT: process.env.REACT_APP_LANGCHAIN_ENDPOINT,
      NODE_ENV: process.env.NODE_ENV
    }
  };

  console.group('🔍 LangSmith 설정 디버그 정보');
  console.table(debugInfo.environment);
  console.groupEnd();

  return debugInfo;
};

export const debugLangSmithTrace = async (client, action, data) => {
  console.group(`🔄 LangSmith ${action}`);
  try {
    console.log('요청 데이터:', data);
    const result = await client[action](data);
    console.log('응답 결과:', result);
    console.groupEnd();
    return result;
  } catch (error) {
    console.error('오류 발생:', error);
    console.groupEnd();
    throw error;
  }
}; 