import { insuranceCalculator, taxCalculator } from './insuranceCalculator';
import { isHoliday } from 'holiday-kr';
import { format } from 'date-fns';

export class SalaryCalculator {
  constructor(startDate, endDate) {
    this.startDate = new Date(startDate);
    this.endDate = new Date(endDate);
    this.REGULAR_WORK_HOURS_PER_DAY = 8;  // 1일 소정근로시간
    this.MONTHLY_WORK_HOURS = 209;  // 월 소정근로시간
    this.NIGHT_START = '22:00';  // 야간근로 시작
    this.NIGHT_END = '06:00';    // 야간근로 종료
  }

  calculateBasicPay(annualSalary) {
    const monthlyBasePay = Math.floor(annualSalary / 12);
    const dailyBasePay = Math.floor(monthlyBasePay / 30);
    
    // 선택된 일수 계산
    const selectedDays = Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24)) + 1;
    
    return dailyBasePay * selectedDays;
  }

  calculateRegularWage(annualSalary) {
    const monthlyBasePay = Math.floor(annualSalary / 12);
    return Math.floor(monthlyBasePay / this.MONTHLY_WORK_HOURS);
  }

  calculateWorkHours(checkIn, checkOut) {
    // 근무시간 계산 (휴게시간 자동 차감)
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    
    // 총 근무시간 계산 (시간 단위)
    const totalHours = (end - start) / (1000 * 60 * 60);

    // 휴게시간 차감
    return this.adjustBreakTime(totalHours);
  }

  adjustBreakTime(workHours) {
    if (workHours >= 8) {
      return workHours - 1;  // 1시간 휴게
    } else if (workHours >= 4) {
      return workHours - 0.5;  // 30분 휴게
    }
    return workHours;
  }

  isHoliday(dateStr) {
    const date = new Date(dateStr);
    const day = date.getDay();
    
    // 공휴일 체크 (패키지의 isHoliday 함수 사용)
    const isPublicHoliday = isHoliday(date);
    
    return day === 0 || day === 6 || isPublicHoliday;
  }

  calculateTotalPay(attendanceData, employee) {
    const regularWage = this.calculateRegularWage(employee.base_salary);
    
    const overtimePay = this.calculateOvertimePay(attendanceData, regularWage);
    const nightShiftPay = this.calculateNightShiftPay(attendanceData, regularWage);
    const holidayPay = this.calculateHolidayPay(attendanceData, regularWage);

    const totalPay = this.calculateBasicPay(employee.base_salary) + overtimePay + nightShiftPay + holidayPay;
    
    // 4대보험 및 소득세 계산
    const deductions = insuranceCalculator.calculateAll(
      totalPay, 
      employee.dependents, 
      employee.tax_deductible_children
    );

    // 세금 계산
    const taxes = taxCalculator.calculateTax(
      totalPay,
      employee.dependents,
      employee.tax_deductible_children
    );

    return {
      regularWage,
      overtimePay,
      nightShiftPay,
      holidayPay,
      totalPay,
      ...deductions,
      ...taxes
    };
  }

  calculateOvertimePay(attendanceData, regularWage) {
    let totalOvertimeHours = 0;

    attendanceData.forEach(record => {
      if (!['정상', '지각'].includes(record.attendance_type)) return;

      const start = new Date(record.check_in);
      const end = new Date(record.check_out);
      const dayEnd = new Date(start);
      dayEnd.setHours(18, 0, 0);

      if (end > dayEnd) {
        const overtime = (end - dayEnd) / (1000 * 60 * 60);
        totalOvertimeHours += this.adjustBreakTime(overtime);
      }
    });

    return Math.floor(totalOvertimeHours * regularWage * 1.5);
  }

  calculateNightShiftPay(attendanceData, regularWage) {
    let totalNightHours = 0;

    attendanceData.forEach(record => {
      if (!['정상', '지각'].includes(record.attendance_type)) return;

      const start = new Date(record.check_in);
      const end = new Date(record.check_out);
      
      // 야간근로시간 계산 (22:00-06:00)
      if (start.getHours() >= 22 || end.getHours() < 6) {
        const nightHours = this.calculateNightHours(start, end);
        totalNightHours += nightHours;
      }
    });

    return Math.floor(totalNightHours * regularWage * 0.5);
  }

  calculateHolidayPay(attendanceData, regularWage) {
    let totalHolidayPay = 0;
    const groupedByDate = this.groupByDate(attendanceData);

    Object.entries(groupedByDate).forEach(([date, records]) => {
      // 휴일근무 or 공휴일 근무 체크
      const isHolidayWork = this.isHoliday(date) || 
        records.some(r => r.attendance_type === '휴일근무');

      if (isHolidayWork) {
        let dailyHours = records.reduce((sum, record) => {
          if (!['정상', '지각', '휴일근무'].includes(record.attendance_type)) return sum;
          return sum + this.calculateWorkHours(record.check_in, record.check_out);
        }, 0);

        // 8시간 초과분 계산
        const regularHours = Math.min(dailyHours, 8);
        const overtimeHours = Math.max(dailyHours - 8, 0);

        totalHolidayPay += Math.floor(regularHours * regularWage * 1.5) +
                          Math.floor(overtimeHours * regularWage * 2);
      }
    });

    return totalHolidayPay;
  }

  calculateNightHours(start, end) {
    // 야간근로시간 계산 헬퍼 함수
    const nightStart = new Date(start);
    nightStart.setHours(22, 0, 0);
    const nightEnd = new Date(start);
    nightEnd.setHours(29, 0, 0); // 다음날 06:00를 29:00으로 표현

    const workStart = start.getHours() >= 22 ? start : nightStart;
    const workEnd = end.getHours() < 6 ? end : nightEnd;

    return Math.max(0, (workEnd - workStart) / (1000 * 60 * 60));
  }

  groupByDate(attendanceData) {
    return attendanceData.reduce((acc, record) => {
      const date = record.check_in.split(' ')[0];
      if (!acc[date]) acc[date] = [];
      acc[date].push(record);
      return acc;
    }, {});
  }
}