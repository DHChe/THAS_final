// API 기본 URL 설정
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

// AI 분석 관련 엔드포인트
const AI_ENDPOINTS = {
  analyze: '/api/ai/analyze',  // AI 분석 엔드포인트
  chat: '/api/ai/chat',        // AI 채팅 엔드포인트
};

module.exports = {
  API_BASE_URL,
  AI_ENDPOINTS
};