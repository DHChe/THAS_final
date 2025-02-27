import taxTable from '../data/tax_table_2024.json';

class InsuranceCalculator {
  constructor() {
    // 2025년 기준 보험요율
    this.RATES = {
      NATIONAL_PENSION: 0.045,    // 국민연금 4.5%
      HEALTH_INSURANCE: 0.03545,  // 건강보험 3.545%
      LONG_TERM_CARE: 0.1295,    // 장기요양보험 12.95%
      EMPLOYMENT_INSURANCE: 0.009 // 고용보험 0.9%
    };

    // 국민연금 기준소득월액 상한/하한
    this.NATIONAL_PENSION_LIMITS = {
      MIN: 390000,   // 하한액
      MAX: 6170000   // 상한액
    };
  }

  calculateAll(salary, dependents, numChildren) {
    const nationalPension = this.calculateNationalPension(salary);
    const healthInsurance = this.calculateHealthInsurance(salary);
    const longTermCare = this.calculateLongTermCare(healthInsurance);
    const employmentInsurance = this.calculateEmploymentInsurance(salary);
    
    // 세금 계산
    const taxableIncome = this.calculateTaxableIncome(salary);
    const incomeTax = this._lookupTaxTable(taxableIncome, dependents);
    const localIncomeTax = Math.floor(incomeTax * 0.1); // 지방소득세는 소득세의 10%

    return {
      nationalPension,
      healthInsurance,
      longTermCare,
      employmentInsurance,
      incomeTax,
      localIncomeTax,
      totalDeduction: nationalPension + healthInsurance + longTermCare + 
                     employmentInsurance + incomeTax + localIncomeTax
    };
  }

  calculateTaxableIncome(salary) {
    // 비과세액 공제 (식대 등)
    const taxFreeAllowance = 200000; // 식대 비과세 한도
    
    // 4대보험 공제
    const insurances = 
      this.calculateNationalPension(salary) +
      this.calculateHealthInsurance(salary) +
      this.calculateEmploymentInsurance(salary);

    return Math.max(0, salary - taxFreeAllowance - insurances);
  }

  calculateNationalPension(monthlyIncome) {
    const baseIncome = Math.max(
      Math.min(monthlyIncome, this.NATIONAL_PENSION_LIMITS.MAX),
      this.NATIONAL_PENSION_LIMITS.MIN
    );
    return Math.floor(baseIncome * this.RATES.NATIONAL_PENSION);
  }

  calculateHealthInsurance(monthlyIncome) {
    return Math.floor(monthlyIncome * this.RATES.HEALTH_INSURANCE);
  }

  calculateLongTermCare(healthInsurance) {
    return Math.floor(healthInsurance * this.RATES.LONG_TERM_CARE * 0.5);
  }

  calculateEmploymentInsurance(monthlyIncome) {
    return Math.floor(monthlyIncome * this.RATES.EMPLOYMENT_INSURANCE);
  }

  _lookupTaxTable(income, dependents) {
    // 고액 구간 확인 (1000만원 이상)
    if (income >= 10000000) {
      const highBracket = Object.keys(taxTable.high_income_brackets).find(range => {
        const [min, max] = range.split('-').map(Number);
        return income >= min && income < max;
      });

      if (highBracket) {
        const calcInfo = taxTable.high_income_brackets[highBracket];
        return this._calculateHighIncomeTax(income, calcInfo, dependents);
      }
    }

    // 일반 구간 처리
    const bracket = Object.keys(taxTable.tax_brackets).find(range => {
      const [min, max] = range.split('-').map(Number);
      return income >= min && income < max;
    });

    if (!bracket) {
      return 0;
    }

    return taxTable.tax_brackets[bracket][dependents.toString()] || 0;
  }

  _calculateHighIncomeTax(income, calcInfo, dependents) {
    const baseTax = calcInfo.base_tax[dependents.toString()];
    const rate = calcInfo.rate;
    const addition = calcInfo.addition;

    // 계산식: 기준세액 + (초과금액 × 98% × 세율) + 추가금액
    const excessAmount = income - 10000000; // 1000만원 초과분
    return Math.floor(baseTax + (excessAmount * 0.98 * rate) + addition);
  }
}

class TaxCalculator {
  constructor() {
    // 세액표 데이터 로드
    if (!taxTable) {
      throw new Error('세액표 로드 실패');
    }
    this.taxTable = taxTable.tax_brackets;
  }

  calculateTax(monthlyIncome, dependents, numChildren) {
    const baseTax = this._lookupTaxTable(monthlyIncome, dependents);
    const childCredit = this._calculateChildTaxCredit(numChildren);

    // 최종 세액 계산
    const incomeTax = Math.max(0, baseTax - childCredit);
    const localIncomeTax = Math.floor(incomeTax * 0.1); // 지방소득세는 소득세의 10%

    return { incomeTax, localIncomeTax };
  }

  _lookupTaxTable(income, dependents) {
    // 세액표에서 해당 구간 찾기
    const bracket = Object.keys(this.taxTable).find(range => {
      const [min, max] = range.split('-').map(Number);
      return income >= min && income < max;
    });

    if (!bracket) {
      return 0;
    }

    // 부양가족 수에 따른 세액 반환
    return this.taxTable[bracket][dependents.toString()] || 0;
  }

  _calculateChildTaxCredit(numChildren) {
    if (numChildren === 0) return 0;
    if (numChildren === 1) return 12500;
    if (numChildren === 2) return 29160;
    return 29160 + ((numChildren - 2) * 25000);
  }

  _calculateHighIncomeTax(income, calcInfo, dependents) {
    const baseTax = calcInfo.base_tax[dependents.toString()];
    const rate = calcInfo.rate;
    const addition = calcInfo.addition;

    // 계산식: 기준세액 + (초과금액 × 98% × 세율) + 추가금액
    const excessAmount = income - 10000000;
    return baseTax + Math.floor(excessAmount * 0.98 * rate) + addition;
  }
}

export const insuranceCalculator = new InsuranceCalculator();
export const taxCalculator = new TaxCalculator(); 