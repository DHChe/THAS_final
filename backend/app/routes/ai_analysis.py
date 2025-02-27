from flask import Blueprint, request, jsonify
import openai
from app.utils.prompt_templates import ANALYSIS_PROMPT_TEMPLATE
from app.utils.data_processor import prepare_data_summary, create_analysis_prompt
import logging

ai_analysis_bp = Blueprint("ai_analysis", __name__)


@ai_analysis_bp.route("/api/analyze", methods=["POST"])
def analyze_payroll():
    try:
        # 요청 데이터 받기
        data = request.json
        logging.info(f"Received data: {data}")  # 로깅 추가

        search_data = data.get("searchData", [])
        user_query = data.get("userQuery", "")

        # 데이터 검증
        if not search_data:
            return jsonify({"error": "검색 데이터가 없습니다."}), 400

        if not user_query:
            return jsonify({"error": "질문이 없습니다."}), 400

        # 데이터 요약 생성
        try:
            data_summary = prepare_data_summary(search_data)
            logging.info(f"Data summary created: {data_summary}")  # 로깅 추가
        except Exception as e:
            logging.error(f"Error in prepare_data_summary: {str(e)}")  # 로깅 추가
            raise

        # 프롬프트 생성
        try:
            prompt = create_analysis_prompt(data_summary, user_query)
            logging.info(f"Prompt created: {prompt}")  # 로깅 추가
        except Exception as e:
            logging.error(f"Error in create_analysis_prompt: {str(e)}")  # 로깅 추가
            raise

        # GPT-4로 분석 요청
        try:
            response = openai.ChatCompletion.create(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": "당신은 급여 데이터 분석 전문가입니다.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.7,
                max_tokens=1000,
            )
            logging.info("OpenAI API response received")  # 로깅 추가
        except Exception as e:
            logging.error(f"Error in OpenAI API call: {str(e)}")  # 로깅 추가
            raise

        return jsonify({"message": response.choices[0].message.content})

    except Exception as e:
        logging.error(f"Error during analysis: {str(e)}")  # 로깅 추가
        return jsonify({"error": f"분석 중 오류가 발생했습니다: {str(e)}"}), 500
