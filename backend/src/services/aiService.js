const openai = require('../config/openaiConfig');

class AIService {
  async analyzeData(prompt, data) {
    try {
      console.log('AI 분석 시작 - 입력된 프롬프트:', prompt.substring(0, 100) + '...');
      console.log('분석할 데이터 샘플:', JSON.stringify(data).substring(0, 100) + '...');

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `당신은 급여 데이터 분석 전문가입니다. 
            주어진 데이터를 기반으로 정확하고 통찰력 있는 분석을 제공하세요.
            답변은 한국어로 제공하며, 가능한 경우 수치와 통계를 포함하세요.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      console.log('AI 응답 받음:', completion.choices[0].message.content.substring(0, 100) + '...');

      return {
        analysis: completion.choices[0].message.content,
        status: 'success'
      };
    } catch (error) {
      console.error('OpenAI API 호출 중 상세 오류:', error);
      console.error('오류 응답:', error.response?.data);
      console.error('오류 상태:', error.response?.status);
      throw new Error(`AI 분석 중 오류가 발생했습니다: ${error.message}`);
    }
  }

  // 프롬프트에 컨텍스트 추가
  enrichPromptWithContext(prompt, data) {
    const contextPrompt = `
[분석 요청 데이터]
${JSON.stringify(data, null, 2)}

[사용자 질문]
${prompt}

다음 가이드라인에 따라 분석해주세요:
1. 주어진 데이터만을 기반으로 객관적인 분석을 제공하세요.
2. 가능한 경우 구체적인 수치와 통계를 포함하세요.
3. 분석 결과는 명확하고 이해하기 쉽게 설명하세요.
4. 필요한 경우 추가적인 인사이트나 제안을 포함하세요.
    `;

    console.log('생성된 프롬프트:', contextPrompt.substring(0, 200) + '...');
    return contextPrompt;
  }
}

module.exports = new AIService(); 