// frontend/src/utils/payrollFilters.js

export const filterPayrollData = (data, filters) => {
  return data.filter(item => {
    // 부서 필터
    if (Object.values(filters.departments).some(v => v) && !filters.departments[item.department]) {
      return false;
    }

    // 직급 필터
    if (Object.values(filters.positions).some(v => v) && !filters.positions[item.position]) {
      return false;
    }

    // 이름 검색
    if (filters.nameQuery && !item.name.includes(filters.nameQuery)) {
      return false;
    }

    // 날짜 범위
    const itemDate = item.date;
    if (itemDate < filters.startDate || itemDate > filters.endDate) {
      return false;
    }

    return true;
  });
};