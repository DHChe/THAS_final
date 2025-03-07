import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import logging
import re

# 분석 프롬프트 템플릿 직접 정의
ANALYSIS_PROMPT_TEMPLATE = """
급여 데이터 분석을 요청합니다.

데이터 요약:
{data_summary}

사용자 질문:
{user_query}

위 정보를 바탕으로 급여 데이터를 분석하고 인사이트를 제공해주세요.
"""


def safe_int_convert(value):
    """문자열을 안전하게 정수로 변환"""
    try:
        if value is None:
            return 0

        if isinstance(value, (int, float)):
            return int(value)

        if isinstance(value, str):
            # 1. 공백 제거
            value = value.strip()

            # 2. 빈 문자열 체크
            if not value:
                return 0

            # 3. 숫자와 콤마만 추출 (정규식 사용)
            # 예: "100,000원" -> "100000"
            numbers_only = re.sub(r"[^0-9]", "", value)

            # 4. 숫자가 없는 경우
            if not numbers_only:
                return 0

            # 5. 정수로 변환
            return int(numbers_only)

        return 0

    except (ValueError, TypeError) as e:
        logging.warning(
            f"Failed to convert value to int: {value}, Type: {type(value)}, Error: {str(e)}"
        )
        return 0


def prepare_data_summary(search_data):
    """검색 데이터를 요약하여 문자열로 반환"""
    if not search_data:
        return "데이터가 없습니다."

    try:
        # 데이터 타입 검증
        if not isinstance(search_data, list):
            raise ValueError(f"Expected list but got {type(search_data)}")

        # 첫 번째 항목 로깅
        if search_data:
            first_item = search_data[0]
            logging.info(f"First item type: {type(first_item)}")
            logging.info(f"First item content: {first_item}")

            # 필수 필드 존재 확인
            required_fields = ["payment_date", "base_salary", "overtime_pay", "bonus"]
            missing_fields = [
                field for field in required_fields if field not in first_item
            ]
            if missing_fields:
                logging.warning(f"Missing required fields: {missing_fields}")

        # 기간 정보 추출
        dates = [item.get("payment_date", "") for item in search_data]
        date_range = f"{min(dates)} ~ {max(dates)}"

        # 급여 통계
        total_count = len(search_data)
        total_base = 0
        total_overtime = 0
        total_bonus = 0

        # 각 항목 처리
        for idx, item in enumerate(search_data):
            # 값 변환 전 로깅 (첫 항목만)
            if idx == 0:
                logging.info(f"Processing first item:")
                logging.info(
                    f"base_salary: {item.get('base_salary')} ({type(item.get('base_salary'))})"
                )
                logging.info(
                    f"overtime_pay: {item.get('overtime_pay')} ({type(item.get('overtime_pay'))})"
                )
                logging.info(f"bonus: {item.get('bonus')} ({type(item.get('bonus'))})")

            # 안전한 정수 변환
            base = safe_int_convert(item.get("base_salary", "0"))
            overtime = safe_int_convert(item.get("overtime_pay", "0"))
            bonus = safe_int_convert(item.get("bonus", "0"))

            # 변환 결과 로깅 (첫 항목만)
            if idx == 0:
                logging.info(
                    f"Converted values: base={base}, overtime={overtime}, bonus={bonus}"
                )

            total_base += base
            total_overtime += overtime
            total_bonus += bonus

        # 평균 계산
        avg_base = total_base / total_count if total_count > 0 else 0
        avg_overtime = total_overtime / total_count if total_count > 0 else 0
        avg_bonus = total_bonus / total_count if total_count > 0 else 0

        # 요약 문자열 생성
        summary = f"분석 기간: {date_range}\n"
        summary += f"총 데이터 수: {total_count}건\n\n"
        summary += "급여 통계:\n"
        summary += f"· 평균 기본급: {avg_base:,.0f}원\n"
        summary += f"· 평균 연장수당: {avg_overtime:,.0f}원\n"
        summary += f"· 평균 상여금: {avg_bonus:,.0f}원\n"

        return summary

    except Exception as e:
        logging.error(f"Error in prepare_data_summary: {str(e)}")
        logging.error(f"Error type: {type(e)}")
        logging.error(f"Error details: {str(e.__class__.__name__)}")
        raise


def create_analysis_prompt(data_summary, user_query):
    """분석용 프롬프트 생성"""
    return ANALYSIS_PROMPT_TEMPLATE.format(
        date_range="검색된 기간",
        total_records="검색된 데이터",
        unique_employees="검색된 직원",
        user_query=user_query,
        data_summary=data_summary,
    )
