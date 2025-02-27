from flask import Blueprint, request, jsonify, current_app
from ..services.ai_service import AIService

ai_bp = Blueprint("ai", __name__)
ai_service = AIService()


@ai_bp.route("/analyze", methods=["POST"])
def analyze():
    try:
        data = request.get_json()
        current_app.logger.info(f"AI 분석 요청 받음: {data}")

        if not data or "prompt" not in data or "data" not in data:
            current_app.logger.error("잘못된 요청 데이터")
            return jsonify({"message": "분석에 필요한 데이터가 부족합니다."}), 400

        try:
            result = ai_service.analyze_data(data["prompt"], data["data"])
            current_app.logger.info("AI 분석 완료")
            return jsonify(result)
        except Exception as e:
            current_app.logger.error(f"AI 서비스 오류: {str(e)}", exc_info=True)
            return (
                jsonify(
                    {"message": "AI 분석 중 오류가 발생했습니다.", "error": str(e)}
                ),
                500,
            )

    except Exception as e:
        current_app.logger.error(f"요청 처리 중 오류: {str(e)}", exc_info=True)
        return (
            jsonify({"message": "요청 처리 중 오류가 발생했습니다.", "error": str(e)}),
            500,
        )
