// types/payroll.ts
interface Employee {
    id: string;          // 사원번호
    name: string;        // 이름
    department: string;  // 부서
    position: string;    // 직급
    joinDate: string;    // 입사일
  }
  
  interface PayrollRecord {
    employeeId: string;  // 사원번호
    date: string;        // 지급월
    baseSalary: number;  // 기본급
    overtime: number;    // 연장근로수당
    bonus: number;       // 상여금
    mealAllowance: number; // 식대
    transportation: number; // 교통비
    totalSalary: number;   // 총 지급액
  }

  export type { Employee, PayrollRecord };
