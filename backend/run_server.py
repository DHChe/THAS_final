from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import os
from utils.pay_calculator import PayCalculator
from utils.insurance_calculator import InsuranceCalculator

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:3001"}})

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
EMPLOYEES_CSV = os.path.join(BASE_DIR, 'data', 'employees.csv')
ATTENDANCE_CSV = os.path.join(BASE_DIR, 'data', 'attendance.csv')

# 급여 지급일 설정 (매월 25일로 가정)
PAYROLL_DAY = 25  # *** 급여 지급일 설정 (변경 시 이 값을 수정하세요) ***

def load_employees():
    try:
        if not os.path.exists(EMPLOYEES_CSV):
            print(f"Error: {EMPLOYEES_CSV} 파일이 존재하지 않습니다.")
            return []
        
        print(f"Loading employees from {EMPLOYEES_CSV}")
        with open(EMPLOYEES_CSV, 'r', encoding='utf-8') as f:
            print(f"First few lines of {EMPLOYEES_CSV}:")
            for i, line in enumerate(f):
                if i < 3:
                    print(line.strip())
                else:
                    break
        
        df = pd.read_csv(
            EMPLOYEES_CSV,
            encoding='utf-8',
            delimiter=',',
            dtype={
                'employee_id': str,
                'base_salary': 'int',
                'family_count': 'int',
                'num_children': 'int',
                'name': str,
                'department': str,
                'status': str,
                'position': str
            },
            on_bad_lines='warn'
        )
        
        print(f"Total rows in CSV: {len(df)}")
        df = df[df['status'].str.strip().str.lower() == '재직중']
        print(f"Filtered rows where status is '재직중': {len(df)} rows")
        
        if df.empty:
            print("Warning: '재직중' 상태의 직원이 없습니다.")
            return []
        
        df['base_salary'] = df['base_salary'].fillna(0).astype(int)
        df['family_count'] = df['family_count'].fillna(0).astype(int)
        df['num_children'] = df['num_children'].fillna(0).astype(int)
        df['name'] = df['name'].fillna('').astype(str).str.strip()
        df['department'] = df['department'].fillna('').astype(str).str.strip()
        df['position'] = df['position'].fillna('').astype(str).str.strip()
        df['status'] = df['status'].fillna('').astype(str).str.strip()
        
        valid_data = df[
            (df['employee_id'].notna()) &
            (df['name'].notna() & (df['name'].str.strip() != '')) &
            (df['department'].notna() & (df['department'].str.strip() != ''))
        ]
        
        if valid_data.empty:
            print("Warning: 유효한 직원 데이터가 없습니다.")
            return []
        
        result = valid_data[['employee_id', 'name', 'department', 'position', 'base_salary', 'family_count', 'status']].to_dict('records')
        print(f"Loaded {len(result)} valid employees")
        return result
    except Exception as e:
        print(f"Error loading employees: {e}")
        return []

def load_attendance():
    try:
        if not os.path.exists(ATTENDANCE_CSV):
            print(f"Error: {ATTENDANCE_CSV} 파일이 존재하지 않습니다.")
            return []
        
        print(f"Loading attendance from {ATTENDANCE_CSV}")
        df = pd.read_csv(
            ATTENDANCE_CSV,
            encoding='utf-8',
            delimiter=',',
            on_bad_lines='warn'
        )
        
        df['check_in'] = df['check_in'].fillna('').astype(str).str.strip()
        df['check_out'] = df['check_out'].fillna('').astype(str).str.strip()
        df['attendance_type'] = df['attendance_type'].fillna('정상').astype(str).str.strip()
        df['date'] = df['date'].fillna('').astype(str).str.strip()
        
        return df.to_dict('records')
    except Exception as e:
        print(f"Error loading attendance: {e}")
        return []

@app.route('/api/employees', methods=['GET'])
def get_employees():
    employees = load_employees()
    print(f"Returning {len(employees)} employees via /api/employees")
    return jsonify(employees)

@app.route('/api/payroll/calculate', methods=['POST'])
def calculate_payroll():
    data = request.json
    start_date = data.get('start_date')
    end_date = data.get('end_date')
    employee_ids = data.get('employee_ids', [])
    attendance_data = data.get('attendance_data', [])

    if not start_date or not end_date or not employee_ids:
        return jsonify({'error': 'start_date, end_date, employee_ids는 필수입니다.'}), 400

    employees_df = pd.DataFrame(load_employees())
    attendance_df = pd.DataFrame(attendance_data if attendance_data else load_attendance())

    if employees_df.empty or attendance_df.empty:
        return jsonify({'error': '직원 또는 근태 데이터가 없습니다.'}), 404

    results = []
    pay_calculator = PayCalculator()
    insurance_calculator = InsuranceCalculator()

    for employee_id in employee_ids:
        if employee_id not in employees_df['employee_id'].values:
            print(f"Employee ID {employee_id} not found")
            continue

        employee = employees_df[employees_df['employee_id'] == employee_id].iloc[0]
        base_salary = employee['base_salary']
        dependents = employee['family_count']

        filtered_attendance = attendance_df[
            (attendance_df['employee_id'] == employee_id) &
            (attendance_df['date'] >= start_date) &
            (attendance_df['date'] <= end_date)
        ].to_dict('records')

        if not filtered_attendance:
            print(f"No attendance data for employee {employee_id}")
            continue

        try:
            gross_salary = pay_calculator.get_total_pay(base_salary, start_date, end_date, filtered_attendance)
            net_pay = insurance_calculator.get_net_pay(gross_salary, dependents)
            deductions = insurance_calculator.calculate_insurances(gross_salary)
            taxes = insurance_calculator.calculate_taxes(gross_salary, dependents)

            result = {
                'employee_id': employee_id,
                'basePay': pay_calculator.calculate_base_pay(base_salary, start_date, end_date, filtered_attendance),
                'overtimePay': pay_calculator.calculate_overtime_pay(filtered_attendance, (base_salary / 12) / 209),
                'nightPay': pay_calculator.calculate_night_pay(filtered_attendance, (base_salary / 12) / 209),
                'holidayPay': pay_calculator.calculate_holiday_pay(filtered_attendance, (base_salary / 12) / 209),
                'deductions': deductions,
                'taxes': taxes,
                'totalPay': gross_salary,
                'netPay': net_pay
            }
            results.append(result)
        except Exception as e:
            print(f"Error calculating payroll for {employee_id}: {e}")
            continue

    if not results:
        return jsonify({'error': '급여 계산 결과가 없습니다.'}), 404

    return jsonify({'results': results})

@app.route('/api/attendance', methods=['GET'])
def get_attendance():
    attendance = load_attendance()
    print(f"Returning {len(attendance)} attendance records via /api/attendance")
    return jsonify(attendance)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)