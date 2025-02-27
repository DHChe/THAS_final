const aiService = require('../services/aiService');

class AIController {
  async analyze(req, res) {
    try {
      console.log('AI 분석 요청 받음');
      const { prompt, data, query } = req.body;
      
      console.log('요청 데이터:', {
        promptLength: prompt?.length,
        dataLength: data?.length,
        query
      });

      if (!prompt || !data) {
        console.log('잘못된 요청 데이터');
        return res.status(400).json({
          message: '분석에 필요한 데이터가 부족합니다.'
        });
      }

      // 프롬프트에 컨텍스트 추가
      const enrichedPrompt = aiService.enrichPromptWithContext(prompt, data);
      
      // AI 분석 실행
      const result = await aiService.analyzeData(enrichedPrompt, data);
      
      console.log('분석 완료, 응답 전송');
      res.json(result);
    } catch (error) {
      console.error('AI 분석 컨트롤러 상세 오류:', error);
      res.status(500).json({
        message: '분석 처리 중 오류가 발생했습니다.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new AIController(); 