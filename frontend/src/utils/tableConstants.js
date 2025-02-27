export const VIEW_MODES = {
  STANDARD: 'standard',
  MONTHLY: 'monthly',
  COMPARISON: 'comparison',
  TREND: 'trend',
  SUMMARY: 'summary'
};

export const COLUMN_GROUPS = {
  // 기본 컬럼 (항상 표시)
  BASE: [
    { id: 'payment_date', label: '지급월' },
    { id: 'employee_id', label: '사번' },
    { id: 'name', label: '이름' },
    { id: 'department', label: '부서' },
    { id: 'position', label: '직급' }
  ],
  
  // 급여 항목 컬럼
  SALARY: [
    { id: 'base_salary', label: '기본급', numeric: true },
    { id: 'overtime_pay', label: '연장수당', numeric: true },
    { id: 'night_shift_pay', label: '야간수당', numeric: true },
    { id: 'holiday_pay', label: '휴일수당', numeric: true },
    { id: 'total_salary', label: '총 지급액', numeric: true }
  ],

  // 통계 컬럼 (부서/직급 필터 선택 시)
  STATISTICS: [
    { id: 'dept_avg', label: '부서평균', numeric: true },
    { id: 'position_avg', label: '직급평균', numeric: true },
    { id: 'deviation', label: '편차(%)', numeric: true }
  ],

  // 추세 컬럼 (3개월 이상 기간 선택 시)
  TREND: [
    { id: 'trend_indicator', label: '추세', 
      renderer: (value) => {
        if (value > 0) return '↑';
        if (value < 0) return '↓';
        return '→';
      }
    },
    { id: 'three_month_avg', label: '3개월 평균', numeric: true }
  ]
};

export const getActiveColumns = (filters) => {
  let columns = [...COLUMN_GROUPS.BASE];

  // 급여 항목 필터 체크 시 해당 컬럼 추가
  if (Object.values(filters.salaryItems).some(v => v)) {
    columns = columns.concat(
      COLUMN_GROUPS.SALARY.filter(col => 
        filters.salaryItems[col.id] || col.id === 'total_salary'
      )
    );
  }

  // 부서나 직급 필터 선택 시
  if (Object.values(filters.departments).some(v => v) || 
      Object.values(filters.positions).some(v => v)) {
    columns = columns.concat(COLUMN_GROUPS.STATISTICS);
  }

  // 3개월 이상의 기간 선택 시
  if (filters.startDate && filters.endDate && 
      filters.endDate.diff(filters.startDate, 'month') >= 3) {
    columns = columns.concat(COLUMN_GROUPS.TREND);
  }

  return columns;
};

export const TABLE_COLUMNS = {
  standard: [
    { id: 'payment_date', label: '지급월' },
    { id: 'employee_id', label: '사번' },
    { id: 'name', label: '이름' },
    { id: 'department', label: '부서' },
    { id: 'position', label: '직급' },
    { id: 'base_salary', label: '기본급', numeric: true },
    { id: 'overtime_pay', label: '연장수당', numeric: true },
    { id: 'night_shift_pay', label: '야간수당', numeric: true },
    { id: 'holiday_pay', label: '휴일수당', numeric: true }
  ],
  monthly: [
    { id: 'month', label: '월' },
    { id: 'total_employees', label: '인원수', numeric: true },
    { id: 'total_salary', label: '총 지급액', numeric: true },
    { id: 'avg_salary', label: '평균 급여', numeric: true },
    { id: 'max_salary', label: '최고 급여', numeric: true },
    { id: 'min_salary', label: '최저 급여', numeric: true }
  ],
  comparison: [
    { id: 'category', label: '구분' },
    { id: 'period1_value', label: '이전 기간', numeric: true },
    { id: 'period2_value', label: '현재 기간', numeric: true },
    { id: 'difference', label: '증감', numeric: true },
    { id: 'percentage', label: '증감률(%)', numeric: true }
  ],
  trend: [
    { id: 'month', label: '월' },
    { id: 'total_salary', label: '총 급여', numeric: true },
    { id: 'avg_salary', label: '평균 급여', numeric: true },
    { id: 'employee_count', label: '인원수', numeric: true }
  ],
  summary: [
    { id: 'metric', label: '지표' },
    { id: 'value', label: '값', numeric: true },
    { id: 'previous', label: '이전 기간', numeric: true },
    { id: 'change', label: '변동률(%)', numeric: true }
  ]
};

export const SALARY_TABS = {
  TOTAL: { id: 'total_salary', label: '합계' },
  BASE: { id: 'base_salary', label: '기본' },
  OVERTIME: { id: 'overtime_pay', label: '연장' },
  NIGHT: { id: 'night_shift_pay', label: '야간' },
  HOLIDAY: { id: 'holiday_pay', label: '휴일' }
};

export const BASE_COLUMNS = [
  { id: 'employee_id', label: '사번' },
  { id: 'name', label: '이름' },
  { id: 'department', label: '부서' },
  { id: 'position', label: '직급' }
]; 