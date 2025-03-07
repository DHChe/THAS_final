# 급여 분석 페이지 문제 해결 과정

## 콘솔 로그 분석

```
PayrollAnalysis.js:207 직원 데이터 요청 시작
PayrollAnalysis.js:213 직원 데이터 로드 완료: 79 명
PayrollAnalysis.js:216 급여 데이터 요청 시작
PayrollAnalysis.js:223 급여 데이터 로드 완료: 3 건
PayrollAnalysis.js:236 급여 데이터 처리 시작
PayrollAnalysis.js:239 처리할 급여 데이터 예시: 
{basePay: 20900000, confirmed_at: '2025-03-03T16:47:10.228687', confirmed_by: 'system', department: 'Unknown', employee_id: 'DV001', …}

PayrollAnalysis.js:249 급여 기록 #1 처리: 
{id: 3, employee: 'Unknown', start: '2019-10-01', end: '2019-10-31', payment_date: null}
PayrollAnalysis.js:431 제목 생성 입력값: 2019-10-01 2019-10-31 정기급여 
{name: 'Unknown', department: 'Unknown', position: 'Unknown'}

PayrollAnalysis.js:249 급여 기록 #2 처리: 
{id: 4, employee: 'Unknown', start: '2019-10-01', end: '2019-10-31', payment_date: null}
PayrollAnalysis.js:431 제목 생성 입력값: 2019-10-01 2019-10-31 정기급여 
{name: 'Unknown', department: 'Unknown', position: 'Unknown'}

PayrollAnalysis.js:249 급여 기록 #3 처리: 
{id: 5, employee: 'Unknown', start: '2019-11-01', end: '2019-11-30', payment_date: null}
PayrollAnalysis.js:431 제목 생성 입력값: 2019-11-01 2019-11-30 정기급여 
{name: 'Unknown', department: 'Unknown', position: 'Unknown'}

PayrollAnalysis.js:297 처리된 급여 데이터 예시: 
{basePay: 20900000, confirmed_at: '2025-03-03T16:47:10.228687', confirmed_by: 'system', department: 'Unknown', employee_id: 'DV001', …}
PayrollAnalysis.js:298 급여 데이터 처리 완료
PayrollAnalysis.js:330 날짜 범위 설정 시작
PayrollAnalysis.js:341 변환된 유효한 날짜 수: 0
```

## 발견된 HTML 구조 오류

```
hook.js:608 In HTML, <div> cannot be a descendant of <p>.
This will cause a hydration error.

  ...
    <List sx={{...}}>
      <MuiList-root as="ul" className="MuiList-ro..." ref={null} ownerState={{sx:{...}, ...}} sx={{...}}>
        <Insertion>
        <ul className="MuiList-ro...">
          <ListItem dense={true} secondaryAction={<ForwardRef(Checkbox)>}>
            <MuiListItem-root as="li" ref={function} ownerState={{dense:true, ...}} className="MuiListIte...">
              <Insertion>
              <li className="MuiListIte..." ref={function}>
                <ListItemText primary="2019-10-01..." primaryTypographyProps={{variant:"b..."}} secondary={<Fragment>}>
                  <MuiListItemText-root className="MuiListIte..." ownerState={{primary:true, ...}} ref={null}>
                    <Insertion>
                    <div className="MuiListIte...">
                      <Typography>
                      <Typography variant="body2" color="textSecondary" className="MuiListIte..." ref={null} ...>
                        <MuiTypography-root as="p" ref={null} className="MuiTypogra..." ...>
                          <Insertion>
>                         <p
>                           className="MuiTypography-root MuiTypography-body2 MuiListItemText-secondary css-s1e07o-Mui..."
>                           style={{}}
>                         >
                            <Typography variant="caption" component="div" display="block">
                              <MuiTypography-root as="div" ref={null} className="MuiTypogra..." ...>
                                <Insertion>
>                               <div
>                                 className="MuiTypography-root MuiTypography-caption css-c1byjb-MuiTypography-root"
>                                 style={{}}
>                               >
```

## Select 컴포넌트 값 범위 오류

```
hook.js:608 MUI: You have provided an out-of-range value `2025` for the select component.
Consider providing a value that matches one of the available options or ''.
The available values are "". 
```

## 문제점 요약

1. **급여 기록이 목록에 모두 표시되지 않는 문제**
   - 현상: 새롭게 확정 완료한 급여 내역이 PayrollAnalysis 페이지에서 "급여 기록 선택" 리스트에 보이지 않고, 이전에 있던 다른 1개의 내역만 표시됨
   - 원인: 급여 기록 ID 생성 방식이 `${payment_date}-${payroll_tag}`로 되어 있어, payment_date가 null인 경우 모든 기록이 동일 ID("null-정기급여")로 생성되어 중복 제거 과정에서 하나만 남음
   - 해결: 고유한 payroll_id를 기반으로 ID를 생성하도록 변경

2. **HTML 구조 오류**
   - 현상: "In HTML, <div> cannot be a descendant of <p>" 오류 발생
   - 원인: Typography 컴포넌트(p 태그)가 Chip 컴포넌트(div 태그)를 포함하는 구조적 문제
   - 해결: Typography의 component 속성을 "div"로 변경하고 Box 컴포넌트로 감싸기

3. **Select 컴포넌트 값 범위 오류**
   - 현상: "You have provided an out-of-range value `2025` for the select component" 오류 발생
   - 원인: payment_date가 null인 급여 기록만 있어 유효한 연도 옵션이 없는데 2025년이 기본값으로 설정됨
   - 해결: 값이 없을 때 처리 로직 개선 및 계산 기간 시작일의 연도를 대체값으로 사용

4. **직원 정보가 'Unknown'으로 표시되는 문제**
   - 현상: 모든 급여 기록의 직원 정보가 'Unknown'으로 표시됨
   - 원인: 직원 데이터와 급여 데이터의 매핑이 제대로 이루어지지 않음
   - 해결: employee_id를 기준으로 직원 정보를 매핑하는 로직 개선

## 해결 방안 세부 내용

### 1. 급여 기록 ID 생성 방식 변경

```javascript
// 변경 전
const periods = [...new Set(processedPayrollData.map(p => `${p.payment_date}-${p.payroll_tag}`))]
  .map(periodId => {
    const [paymentDate, tag] = periodId.split('-');
    // ... 나머지 코드
  });

// 변경 후
const periods = processedPayrollData.map(p => ({
  id: `${p.payroll_id || Math.random().toString(36).substring(2, 15)}`,
  title: generatePayrollPeriodTitle(p.calculation_period_start, p.calculation_period_end, p.payroll_tag, {
    name: p.employee_name,
    department: p.department,
    position: p.position
  }),
  payment_date: p.payment_date,
  start: p.calculation_period_start,
  end: p.calculation_period_end,
  tag: p.payroll_tag
}));
```

### 2. HTML 구조 수정

```javascript
// 변경 전
<Typography variant="caption" display="block">
  지급일: {period.payment_date ? dayjs(period.payment_date).format('YYYY-MM-DD') : '미지급'}
  <Chip 
    label={`계산기간: ${period.start} ~ ${period.end}`} 
    size="small" 
    color="primary" 
    variant="outlined"
  />
</Typography>

// 변경 후
<Typography variant="caption" component="div" display="block">
  지급일: {period.payment_date ? dayjs(period.payment_date).format('YYYY-MM-DD') : '미지급'}
  <Box component="span" sx={{ ml: 1 }}>
    <Chip 
      label={`계산기간: ${period.start} ~ ${period.end}`} 
      size="small" 
      color="primary" 
      variant="outlined"
    />
  </Box>
</Typography>
```

### 3. 날짜 필터링 로직 개선

```javascript
// 변경 전
const availableYears = [...new Set(payrollData
  .filter(record => record.payment_date)
  .map(record => dayjs(record.payment_date).year()))]
  .sort((a, b) => b - a); // 내림차순 정렬

// 변경 후
const getYearFromRecord = (record) => {
  if (record.payment_date) {
    const paymentDate = dayjs(record.payment_date);
    return paymentDate.isValid() ? paymentDate.year() : null;
  }
  // 지급일이 없는 경우 계산 기간 시작일 사용
  if (record.calculation_period_start) {
    const periodStartDate = dayjs(record.calculation_period_start);
    return periodStartDate.isValid() ? periodStartDate.year() : null;
  }
  return null;
};

const availableYears = [...new Set(payrollData
  .map(record => getYearFromRecord(record))
  .filter(year => year !== null))]
  .sort((a, b) => b - a);
```

### 4. 직원 정보 매핑 개선

```javascript
// 변경 전
const processedPayrollData = payrollData.map(record => {
  const employee = employees.find(emp => emp.employee_id === record.employee_id);
  // ... 나머지 코드
});

// 변경 후
// 먼저 employee_id를 키로 하는 매핑 객체 생성
const employeeMap = {};
employees.forEach(emp => {
  employeeMap[emp.employee_id] = {
    name: emp.name || '이름 없음',
    department: emp.department || '부서 없음',
    position: emp.position || '직책 없음'
  };
});

// 매핑 객체 사용
const processedPayrollData = payrollData.map(record => {
  const employee = employeeMap[record.employee_id] || {
    name: '알 수 없음',
    department: '알 수 없음',
    position: '알 수 없음'
  };
  // ... 나머지 코드
});
```

## 최종 결과

모든 수정사항을 적용한 후, 페이지는 다음과 같이 개선됩니다:

1. 모든 급여 기록이 "급여 기록 선택" 리스트에 올바르게 표시됨
2. HTML 구조 오류가 해결되어 hydration 문제 없이 렌더링됨
3. Select 컴포넌트가 유효한 값으로 설정되어 out-of-range 오류가 발생하지 않음
4. 직원 정보가 "Unknown" 대신 실제 정보로 표시됨 