const express = require('express');
const router = express.Router();
const { Configuration, OpenAIApi } = require('openai');

// OpenAI API 설정 (환경변수에서 API 키 사용)
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

router.post('/', async (req, res) => {
  const { filteredData, searchSummary, userQuery, analysisPrompt } = req.body;
  
  // AI에게 보낼 메시지 목록 구성
  // (필요에 따라 추가 정보를 전달할 수 있습니다.)
  const messages = [
    { role: "system", content: analysisPrompt },
    { role: "assistant", content: `검색 결과 요약: ${searchSummary}` },
    { role: "user", content: userQuery }
  ];

  try {
    const completion = await openai.createChatCompletion({
      model: "gpt-4",
      messages: messages,
      temperature: 0.5,
    });

    const aiResponse = completion.data.choices[0].message.content;
    res.status(200).json({ aiResponse });
  } catch (error) {
    console.error("OpenAI API 에러:", error);
    res.status(500).json({ error: "AI 분석 중 오류가 발생했습니다." });
  }
});

module.exports = router;