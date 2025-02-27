from openai import OpenAI
import os
from dotenv import load_dotenv
import logging
import json

load_dotenv()


class AIService:
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.logger = logging.getLogger(__name__)

    def analyze_data(self, prompt, data):
        try:
            self.logger.info("OpenAI API 호출 시작")
            self.logger.info(f"프롬프트: {prompt[:100]}...")
            self.logger.info(f"데이터 크기: {len(str(data))} bytes")

            # 데이터 구조 확인
            payroll_data = data.get("payrollData", [])
            employee_data = data.get("employeeData", [])

            self.logger.info(f"급여 데이터 수: {len(payroll_data)}")
            self.logger.info(f"직원 데이터 수: {len(employee_data)}")

            enriched_prompt = self._enrich_prompt_with_context(prompt, data)
            self.logger.info(f"생성된 프롬프트: {enriched_prompt[:200]}...")

            completion = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "system",
                        "content": "당신은 급여 데이터 분석 전문가입니다. 주어진 데이터를 기반으로 정확하고 통찰력 있는 분석을 제공하세요.",
                    },
                    {"role": "user", "content": enriched_prompt},
                ],
                temperature=0.2,
                max_tokens=1000,
            )

            self.logger.info("OpenAI API 응답 받음")
            return {
                "analysis": completion.choices[0].message.content,
                "status": "success",
            }
        except Exception as e:
            self.logger.error(f"OpenAI API 호출 중 오류: {str(e)}", exc_info=True)
            raise Exception(f"AI 분석 중 오류 발생: {str(e)}")

    def _enrich_prompt_with_context(self, prompt, data):
        payroll_data = data.get("payrollData", [])
        employee_data = data.get("employeeData", [])

        # 검색 결과 데이터를 문자열로 변환
        result_summary = self._create_data_summary(payroll_data, employee_data)

        return f"""
[현재 검색된 데이터 요약]
{result_summary}

[사용자 질문]
{prompt}

다음 지침을 따라 응답해주세요:
1. 검색된 데이터에서 직접 찾을 수 있는 정보는 정확한 수치로 답변하세요.
2. 데이터에서 찾을 수 없는 정보라면 "검색 결과에서 해당 정보를 찾을 수 없습니다"라고 명확히 답변하세요.
3. 가능한 경우 관련된 추가 정보나 맥락을 제공하세요.
"""

    def _create_data_summary(self, payroll_data, employee_data):
        # 급여 데이터를 직원별로 정리
        payroll_by_employee = {}
        for record in payroll_data:
            emp_id = record["employee_id"]
            if emp_id not in payroll_by_employee:
                payroll_by_employee[emp_id] = []
            payroll_by_employee[emp_id].append(record)

        # 검색된 직원들의 정보를 요약
        summary_lines = []
        for emp in employee_data:
            emp_id = emp["employee_id"]
            if emp_id in payroll_by_employee:
                payroll_records = payroll_by_employee[emp_id]
                latest_payroll = max(payroll_records, key=lambda x: x["payment_date"])

                summary_lines.append(
                    f"""
직원ID: {emp_id}
이름: {emp['name']}
부서: {emp['department']}
직급: {emp['position']}
최근 급여 정보 (지급일: {latest_payroll['payment_date']}):
- 기본급: {latest_payroll['base_salary']}
- 총 급여: {latest_payroll['gross_salary']}
"""
                )

        return "\n".join(summary_lines)
