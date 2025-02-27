import json
import os

# tax_table_2024.json 파일 읽기
with open(os.path.join(os.path.dirname(__file__), '../data/tax_table_2024.json'), 'r', encoding='utf-8') as f:
    tax_data = json.load(f)
    tax_brackets = tax_data['tax_brackets']
    high_income_brackets = tax_data.get('high_income_brackets', {})

class InsuranceCalculator:
    def __init__(self):
        self.RATES = {
            'NATIONAL_PENSION': 0.045,  # 국민연금: 4.5%
            'HEALTH_INSURANCE': 0.03545,  # 건강보험: 3.545%
            'LONG_TERM_CARE': 0.1295,  # 장기요양: 건강보험의 12.95%
            'EMPLOYMENT_INSURANCE': 0.009  # 고용보험: 0.9%
        }
        self.NATIONAL_PENSION_LIMITS = {'MIN': 390000, 'MAX': 6170000}  # 국민연금 상한/하한

    def calculate_insurances(self, gross_salary):
        """4대 보험 공제 계산"""
        national_pension = self.calculate_national_pension(gross_salary)
        health_insurance = self.calculate_health_insurance(gross_salary)
        long_term_care = self.calculate_long_term_care(health_insurance)
        employment_insurance = self.calculate_employment_insurance(gross_salary)
        return {
            'nationalPension': national_pension,
            'healthInsurance': health_insurance,
            'longTermCare': long_term_care,
            'employmentInsurance': employment_insurance
        }

    def calculate_taxes(self, gross_salary, dependents):
        """소득세 및 지방소득세 계산"""
        taxable_income = self.calculate_taxable_income(gross_salary)
        income_tax = self._lookup_tax_table(taxable_income, dependents)
        local_income_tax = income_tax // 10  # 지방소득세는 소득세의 10%
        return {
            'incomeTax': income_tax,
            'localIncomeTax': local_income_tax
        }

    def get_net_pay(self, gross_salary, dependents):
        """실수령액 계산"""
        insurances = self.calculate_insurances(gross_salary)
        taxes = self.calculate_taxes(gross_salary, dependents)
        total_deduction = (insurances['nationalPension'] + insurances['healthInsurance'] + 
                          insurances['longTermCare'] + insurances['employmentInsurance'] + 
                          taxes['incomeTax'] + taxes['localIncomeTax'])
        return gross_salary - total_deduction

    def calculate_national_pension(self, monthly_income):
        """국민연금 계산"""
        base_income = max(min(monthly_income, self.NATIONAL_PENSION_LIMITS['MAX']), self.NATIONAL_PENSION_LIMITS['MIN'])
        return int(base_income * self.RATES['NATIONAL_PENSION'])

    def calculate_health_insurance(self, monthly_income):
        """건강보험 계산"""
        return int(monthly_income * self.RATES['HEALTH_INSURANCE'])

    def calculate_long_term_care(self, health_insurance):
        """장기요양보험 계산"""
        return int(health_insurance * self.RATES['LONG_TERM_CARE'] * 0.5)  # 직원 부담 50%

    def calculate_employment_insurance(self, monthly_income):
        """고용보험 계산"""
        return int(monthly_income * self.RATES['EMPLOYMENT_INSURANCE'])

    def calculate_taxable_income(self, salary):
        """과세 소득 계산"""
        tax_free_allowance = 200000  # 식대 비과세 한도
        total_insurances = (self.calculate_national_pension(salary) + 
                           self.calculate_health_insurance(salary) + 
                           self.calculate_employment_insurance(salary))
        taxable = max(0, salary - tax_free_allowance - total_insurances)
        return taxable

    def _lookup_tax_table(self, income, dependents):
        """세율 테이블 조회"""
        if income >= 10000000:
            for bracket, info in high_income_brackets.items():
                min_val, max_val = map(int, bracket.split('-'))
                if min_val <= income < max_val:
                    base_tax = info['base_tax'].get(str(dependents), 0)
                    rate = info['rate']
                    addition = info['addition']
                    excess_amount = income - 10000000
                    tax = int(base_tax + (excess_amount * 0.98 * rate) + addition)  # 2% 세액공제 적용
                    return tax

        for bracket, rates in tax_brackets.items():
            min_val, max_val = map(int, bracket.split('-'))
            if min_val <= income < max_val:
                tax = rates.get(str(dependents), 0)
                return tax
        return 0

# 마지막 줄 제거: InsuranceCalculator = InsuranceCalculator()