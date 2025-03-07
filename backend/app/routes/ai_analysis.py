from flask import Blueprint, request, jsonify
import openai
from utils.prompt_templates import ANALYSIS_PROMPT_TEMPLATE
from utils.data_processor import prepare_data_summary, create_analysis_prompt
import logging
import os

ai_analysis_bp = Blueprint("ai_analysis", __name__)


@ai_analysis_bp.route("/api/ai/analyze", methods=["POST"])
def analyze_payroll():
    try:
        # 요청 데이터 받기
        data = request.json
        logging.info(f"Received analysis request")

        # 새로운 API 형식에 맞게 데이터 추출
        payroll_data = data.get("payrollData", [])
        employee_data = data.get("employeeData", [])
        query = data.get("query", "")
        metadata = data.get("metadata", {})

        # 데이터 검증
        if not payroll_data:
            return jsonify({"error": "급여 데이터가 없습니다."}), 400

        if not query:
            return jsonify({"error": "질문이 없습니다."}), 400

        # 데이터 요약 생성
        try:
            # 급여 데이터와 직원 데이터를 통합하여 요약
            data_summary = create_data_summary(payroll_data, employee_data)
            logging.info(f"Data summary created successfully")
        except Exception as e:
            logging.error(f"Error in data summary creation: {str(e)}")
            raise

        # 프롬프트 생성
        try:
            prompt = create_analysis_prompt_v2(data_summary, query)
            logging.info(f"Analysis prompt created successfully")
        except Exception as e:
            logging.error(f"Error in prompt creation: {str(e)}")
            raise

        # OpenAI API 키 확인
        openai_api_key = os.environ.get("OPENAI_API_KEY")
        if not openai_api_key:
            logging.error("OPENAI_API_KEY not found in environment variables")
            return jsonify({"error": "OpenAI API 키가 설정되지 않았습니다."}), 500

        openai.api_key = openai_api_key

        # GPT-4로 분석 요청
        try:
            response = openai.ChatCompletion.create(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": "당신은 급여 데이터 분석 전문가입니다. 주어진 데이터를 분석하고 인사이트를 제공하세요.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,  # 더 정확한 응답을 위해 temperature 낮춤
                max_tokens=1500,
            )
            logging.info("OpenAI API response received")
        except Exception as e:
            logging.error(f"Error in OpenAI API call: {str(e)}")
            raise

        # 응답 포맷 구성
        result = {"analysis": response.choices[0].message.content, "status": "success"}

        return jsonify(result)

    except Exception as e:
        logging.error(f"Error during analysis: {str(e)}")
        return (
            jsonify(
                {"error": f"분석 중 오류가 발생했습니다: {str(e)}", "status": "error"}
            ),
            500,
        )


def create_data_summary(payroll_data, employee_data):
    """
    급여 데이터와 직원 데이터를 통합하여 요약 정보 생성
    """
    # 직원별 급여 정보 그룹화
    employee_payrolls = {}
    for record in payroll_data:
        emp_id = record.get("employee_id")
        if emp_id not in employee_payrolls:
            employee_payrolls[emp_id] = []
        employee_payrolls[emp_id].append(record)

    # 부서별 정보 집계
    department_stats = {}

    for emp_id, records in employee_payrolls.items():
        # 직원 정보 찾기
        employee = next(
            (e for e in employee_data if e.get("employee_id") == emp_id), {}
        )
        department = employee.get("department", "부서 미지정")

        # 부서별 통계 초기화
        if department not in department_stats:
            department_stats[department] = {
                "count": 0,
                "total_salary": 0,
                "total_base": 0,
            }

        # 개별 직원의 급여 통계 계산
        latest_record = max(records, key=lambda x: x.get("payment_date", ""))

        # 부서 통계 업데이트
        department_stats[department]["count"] += 1
        department_stats[department]["total_salary"] += float(
            latest_record.get("gross_salary", 0)
        )
        department_stats[department]["total_base"] += float(
            latest_record.get("base_salary", 0)
        )

    # 평균 계산
    summary = {
        "total_employees": len(employee_data),
        "total_records": len(payroll_data),
        "departments": {},
    }

    for dept, stats in department_stats.items():
        avg_salary = stats["total_salary"] / stats["count"] if stats["count"] > 0 else 0
        avg_base = stats["total_base"] / stats["count"] if stats["count"] > 0 else 0

        summary["departments"][dept] = {
            "employee_count": stats["count"],
            "average_salary": avg_salary,
            "average_base": avg_base,
        }

    return summary


def create_analysis_prompt_v2(data_summary, query):
    """
    분석 프롬프트 생성 (버전 2)
    """
    # 부서별 통계 정보 포맷팅
    department_info = ""
    for dept, stats in data_summary["departments"].items():
        department_info += f"\n- {dept}:\n"
        department_info += f"  직원 수: {stats['employee_count']}명\n"
        department_info += f"  평균 급여: {stats['average_salary']:,.0f}원\n"
        department_info += f"  평균 기본급: {stats['average_base']:,.0f}원\n"

    # 기본 프롬프트 템플릿
    prompt = f"""
분석 대상 데이터 요약:
- 총 직원 수: {data_summary["total_employees"]}명
- 총 급여 기록 수: {data_summary["total_records"]}건
- 부서별 통계:{department_info}

사용자 질문: {query}

위 데이터에 대해 사용자의 질문을 자세히 분석하여 답변해주세요. 각 분석 결과는 구체적인 수치와 함께 제시하고, 의미 있는 인사이트를 제공해주세요.
답변 내용이 다음 사항을 포함하도록 해주세요:
1. 사용자 질문에 대한 직접적인 답변
2. 데이터 분석 기반의 인사이트
3. 필요 시 부서별 또는 직급별 비교 분석
4. 중요한 패턴이나 이상치 지적

답변 형식은 다음과 같이 구성해주세요:
1. 간단한 요약
2. 상세 분석 (필요 시 통계 정보)
3. 결론
"""
    return prompt
