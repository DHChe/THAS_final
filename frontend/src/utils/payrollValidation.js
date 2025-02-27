export const validatePayrollData = (data) => {
  const errors = [];
  
  data.forEach((record, index) => {
    // 필수 필드 존재 여부 확인
    if (!record.employeeId || !record.date) {
      errors.push(`Row ${index + 1}: Missing required fields`);
    }
    
    // 숫자 필드 유효성 검사
    const numericFields = ['baseSalary', 'overtime', 'bonus', 'mealAllowance', 'transportation'];
    numericFields.forEach(field => {
      if (isNaN(Number(record[field]))) {
        errors.push(`Row ${index + 1}: Invalid ${field} value`);
      }
    });
    
    // 날짜 형식 검사 (YYYY-MM)
    const datePattern = /^\d{4}-(0[1-9]|1[0-2])$/;
    if (!datePattern.test(record.date)) {
      errors.push(`Row ${index + 1}: Invalid date format`);
    }
  });
  
  return errors;
};
