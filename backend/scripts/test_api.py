"""
API 테스트 스크립트
데이터베이스 설정 및 API 엔드포인트 기능 테스트
"""

import sys
import os
import requests
import json
from datetime import datetime

# 서버 URL
BASE_URL = 'http://localhost:5000'

def test_employees_api():
    """직원 조회 API 테스트"""
    print("\n====== 직원 조회 API 테스트 ======")
    
    response = requests.get(f"{BASE_URL}/api/employees")
    
    if response.status_code == 200:
        employees = response.json()
        print(f"성공: {len(employees)}명의 직원 정보를 조회했습니다.")
        if employees:
            print(f"첫 번째 직원: {employees[0]}")
        return employees
    else:
        print(f"실패: 상태 코드 {response.status_code}")
        print(response.text)
        return []

def test_attendance_api():
    """근태 조회 API 테스트"""
    print("\n====== 근태 조회 API 테스트 ======")
    
    response = requests.get(f"{BASE_URL}/api/attendance")
    
    if response.status_code == 200:
        attendance = response.json()
        print(f"성공: {len(attendance)}개의 근태 기록을 조회했습니다.")
        if attendance:
            print(f"첫 번째 근태 기록: {attendance[0]}")
            # 근태 데이터의 날짜 범위 확인
            dates = [record.get('date') for record in attendance if record.get('date')]
            if dates:
                dates.sort()
                print(f"근태 데이터 날짜 범위: {dates[0]} ~ {dates[-1]}")
        return attendance
    else:
        print(f"실패: 상태 코드 {response.status_code}")
        print(response.text)
        return []

def test_calculate_payroll(employee_ids, start_date="2023-01-01", end_date="2023-01-31"):
    """급여 계산 API 테스트"""
    print("\n====== 급여 계산 API 테스트 ======")
    
    payload = {
        "start_date": start_date,
        "end_date": end_date,
        "employee_ids": employee_ids
    }
    
    print(f"요청 데이터: {json.dumps(payload, indent=2)}")
    
    response = requests.post(
        f"{BASE_URL}/api/payroll/calculate",
        json=payload
    )
    
    if response.status_code == 200:
        results = response.json()
        print(f"성공: {len(results.get('results', []))}명의 급여가 계산되었습니다.")
        if results.get('results'):
            print(f"첫 번째 직원 급여 결과: {json.dumps(results['results'][0], indent=2)}")
        return results.get('results', [])
    else:
        print(f"실패: 상태 코드 {response.status_code}")
        print(response.text)
        return []

def test_confirm_payroll(payroll_ids):
    """급여 확정 API 테스트"""
    print("\n====== 급여 확정 API 테스트 ======")
    
    payload = {
        "payroll_ids": payroll_ids,
        "remarks": "테스트 확정"
    }
    
    print(f"요청 데이터: {json.dumps(payload, indent=2)}")
    
    response = requests.put(
        f"{BASE_URL}/api/payroll/confirm",
        json=payload
    )
    
    if response.status_code == 200:
        result = response.json()
        print(f"성공: {result.get('message', '확정 완료')}")
        return result
    else:
        print(f"실패: 상태 코드 {response.status_code}")
        print(response.text)
        return None

def test_payroll_records(status=None):
    """급여 기록 조회 API 테스트"""
    print("\n====== 급여 기록 조회 API 테스트 ======")
    
    url = f"{BASE_URL}/api/payroll/records"
    if status:
        url += f"?status={status}"
    
    response = requests.get(url)
    
    if response.status_code == 200:
        records = response.json()
        print(f"성공: {len(records)}개의 급여 기록을 조회했습니다.")
        if records:
            print(f"첫 번째 급여 기록: {json.dumps(records[0], indent=2)}")
        return records
    else:
        print(f"실패: 상태 코드 {response.status_code}")
        print(response.text)
        return []

def main():
    """테스트 실행"""
    print("API 테스트를 시작합니다...")
    
    # 1. 직원 조회 테스트
    employees = test_employees_api()
    
    if not employees:
        print("직원 정보를 가져올 수 없어 테스트를 중단합니다.")
        return
    
    # 2. 근태 조회 테스트
    attendance = test_attendance_api()
    
    # 근태 데이터에서 사용 가능한 날짜 범위를 가져옴
    # 2023년 데이터로 설정 (실제 데이터에 맞게 조정 필요)
    start_date = "2023-01-01"
    end_date = "2023-01-31"
    
    # 테스트용 직원 ID 추출 (최대 3명)
    employee_ids = [emp['employee_id'] for emp in employees[:3]]
    
    # 3. 급여 계산 테스트
    payroll_results = test_calculate_payroll(employee_ids, start_date, end_date)
    
    if not payroll_results:
        print("급여 계산 결과가 없어 확정 테스트를 건너뜁니다.")
    else:
        # 테스트용 급여 코드 추출
        payroll_codes = [result['payroll_code'] for result in payroll_results]
        
        # 4. 급여 확정 테스트
        confirm_result = test_confirm_payroll(payroll_codes)
    
    # 5. 급여 기록 조회 테스트
    records = test_payroll_records()
    
    print("\n모든 테스트가 완료되었습니다.")

if __name__ == "__main__":
    main()