const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// AI 분석 API 라우터 사용
const aiAnalysisRouter = require('./routes/aiAnalysis');
app.use('/api/ai-analysis', aiAnalysisRouter);

app.listen(port, () => {
  console.log(`서버가 포트 ${port}에서 실행중입니다.`);
});
