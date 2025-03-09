import HolidayKr from 'holiday-kr';

// 24:00:00 형식의 시간을 다음날 00:00:00으로 변환하는 유틸리티 함수
function processTimeString(timeStr) {
  if (!timeStr) return timeStr;
  
  // 24:00:00 형식 감지
  if (timeStr.includes(' 24:00:00')) {
    // 날짜와 시간 부분 분리
    const [datePart] = timeStr.split(' ');
    
    // 날짜를 Date 객체로 변환
    const date = new Date(datePart);
    
    // 하루 추가
    date.setDate(date.getDate() + 1);
    
    // 다음날 00:00:00 형식으로 반환
    const nextDay = date.toISOString().split('T')[0];
    return `${nextDay} 00:00:00`;
  }
  
  return timeStr;
}

export class OvertimeCalculator {
  constructor(startDate, endDate) {
    this.startDate = new Date(startDate);
    this.endDate = new Date(endDate);
    this.REGULAR_WORK_HOURS_PER_DAY = 8;  // 1일 소정근로시간
    this.MONTHLY_WORK_HOURS = 209;  // 월 소정근로시간
    this.NIGHT_START = '22:00';  // 야간근로 시작
    this.NIGHT_END = '06:00';    // 야간근로 종료
    this.REGULAR_END_TIME = 18;   // 정규 근무 종료 (18:00)
    this.REGULAR_START_TIME = 9;  // 정규 근무 시작 (09:00)
    this.REGULAR_WORK_START = 9;  // 소정근로 시작시간
    this.REGULAR_WORK_END = 18;   // 소정근로 종료시간
    this.NIGHT_WORK_START = 22;   // 야간근로 시작시간
    this.NIGHT_WORK_END = 6;      // 야간근로 종료시간
  }

  calculateRegularWage(monthlyPay) {
    return Math.floor(monthlyPay / this.MONTHLY_WORK_HOURS);
  }

  calculateWorkHours(checkIn, checkOut) {
    // 24:00:00 형식 처리
    checkOut = processTimeString(checkOut);
    
    const start = new Date(checkIn);
    const end = new Date(checkOut);

    // 총 근무시간 계산 (시간 단위)
    const duration = (end - start) / (1000 * 60 * 60);

    // 휴게시간 자동 차감
    if (duration >= 8) {
      return duration - 1;  // 1시간 휴게
    } else if (duration >= 4) {
      return duration - 0.5;  // 30분 휴게
    }
    return duration;
  }

  calculateOvertimePay(attendanceRecords, regularWage) {
    let totalOvertimeHours = 0;
    let totalNightHours = 0;

    attendanceRecords.forEach(record => {
      const start = new Date(record.check_in);
      const end = new Date(record.check_out);
      
      // 1. 연장근로시간 계산 (18:00 이후)
      let overtimeStart = new Date(start);
      overtimeStart.setHours(this.REGULAR_WORK_END, 0, 0);
      
      if (end > overtimeStart) {
        // 연장근로 시간 계산
        let overtimeHours = (end - overtimeStart) / (1000 * 60 * 60);
        
        // 연장근로 휴게시간 계산 (4시간 30분마다 30분)
        const breakTime = Math.floor(overtimeHours / 4.5) * 0.5;
        overtimeHours -= breakTime;
        
        totalOvertimeHours += overtimeHours;

        // 2. 야간근로시간 계산 (22:00-06:00)
        let nightStart = new Date(start);
        nightStart.setHours(this.NIGHT_WORK_START, 0, 0);
        
        if (end > nightStart) {
          let nightHours;
          if (end.getDate() > start.getDate()) {
            // 날짜가 넘어가는 경우
            nightHours = end.getHours() + 2; // 00:00~02:07 + 22:00~24:00
          } else {
            nightHours = end.getHours() - this.NIGHT_WORK_START;
          }
          
          totalNightHours += nightHours;
        }
      }
    });

    console.log('근로시간 계산:', {
      연장근로시간: totalOvertimeHours.toFixed(2),
      연장휴게시간: Math.floor(totalOvertimeHours / 4.5) * 0.5,
      야간근로시간: totalNightHours.toFixed(2)
    });

    // 연장근로수당 = 연장시간 × 통상시급 × 1.5
    const overtimePay = Math.floor(totalOvertimeHours * regularWage * 1.5);
    
    // 야간근로수당 = 야간시간 × 통상시급 × 0.5
    const nightPay = Math.floor(totalNightHours * regularWage * 0.5);

    console.log('수당 계산:', {
      연장근로수당: overtimePay.toLocaleString(),
      야간근로수당: nightPay.toLocaleString(),
      총액: (overtimePay + nightPay).toLocaleString()
    });

    return {
      overtimePay,  // 연장근로수당
      nightPay      // 야간근로수당
    };
  }

  calculateNightShiftPay(attendanceRecords, regularWage) {
    let totalNightHours = 0;

    attendanceRecords.forEach(record => {
      if (!['정상', '지각'].includes(record.attendance_type)) return;

      const start = new Date(record.check_in);
      const end = new Date(record.check_out);

      // 야간근로시간 계산 (22:00-06:00)
      const nightStart = new Date(start);
      nightStart.setHours(22, 0, 0);
      
      const nightEnd = new Date(start);
      nightEnd.setDate(nightEnd.getDate() + 1);
      nightEnd.setHours(6, 0, 0);

      // 야간근로 시간 계산
      if (end > nightStart) {
        const nightHours = Math.min(
          (end - nightStart) / (1000 * 60 * 60),
          8  // 최대 8시간
        );
        totalNightHours += nightHours;
      }
    });

    const nightShiftPay = Math.floor(totalNightHours * regularWage * 0.5);
    console.log('야간근로수당 계산:', {
      야간근로시간: totalNightHours.toFixed(2),
      통상시급: regularWage.toLocaleString(),
      수당: nightShiftPay.toLocaleString()
    });

    return nightShiftPay;
  }

  calculateHolidayPay(attendanceRecords, regularWage) {
    try {
      let totalHolidayPay = 0;

      // 날짜별로 그룹화
      const groupedByDate = this.groupByDate(attendanceRecords);

      for (const [date, dayRecords] of Object.entries(groupedByDate)) {
        // 휴일근무 데이터만 필터링
        const holidayRecords = dayRecords.filter(record => 
          record.attendance_type === '휴일근무' || 
          (['정상', '지각'].includes(record.attendance_type) && this.isHoliday(new Date(date)))
        );

        if (holidayRecords.length > 0) {
          const dailyHours = holidayRecords.reduce((sum, record) => 
            sum + this.calculateWorkHours(record.check_in, record.check_out), 0
          );

          // 8시간 이내 계산 (1.5배)
          const regularHolidayHours = Math.min(dailyHours, this.REGULAR_WORK_HOURS_PER_DAY);
          const regularHolidayPay = Math.floor(regularHolidayHours * regularWage * 1.5);

          // 8시간 초과분 계산 (2배)
          let overtimeHolidayPay = 0;
          if (dailyHours > this.REGULAR_WORK_HOURS_PER_DAY) {
            const overtimeHolidayHours = dailyHours - this.REGULAR_WORK_HOURS_PER_DAY;
            overtimeHolidayPay = Math.floor(overtimeHolidayHours * regularWage * 2);
          }

          totalHolidayPay += regularHolidayPay + overtimeHolidayPay;
        }
      }

      console.log(`휴일근로수당 계산 완료: ${totalHolidayPay.toLocaleString()}원`);
      return totalHolidayPay;

    } catch (error) {
      console.error('휴일근로수당 계산 중 오류 발생:', error);
      return 0;
    }
  }

  // 헬퍼 메서드들
  adjustBreakTime(workHours) {
    if (workHours >= 8) {
      return workHours - 1;  // 1시간 휴게
    } else if (workHours >= 4) {
      return workHours - 0.5;  // 30분 휴게
    }
    return workHours;
  }

  calculateNightHours(start, end) {
    const startTime = start.getHours();
    const endTime = end.getHours();

    // 날짜가 바뀌는 경우
    if (start.getDate() !== end.getDate()) {
      if (startTime >= this.NIGHT_START) {
        return (24 - startTime) + Math.min(endTime, this.NIGHT_END);
      } else {
        return Math.min(endTime, this.NIGHT_END);
      }
    }
    // 같은 날인 경우
    else {
      if (startTime >= this.NIGHT_START) {
        return end.getHours() - startTime;
      }
      return 0;
    }
  }

  isHoliday(date) {
    // 토요일(6) 또는 일요일(0)
    return date.getDay() === 0 || date.getDay() === 6;
    // 공휴일 판단 로직은 별도 라이브러리 또는 API 사용 필요
  }

  groupByDate(records) {
    return records.reduce((groups, record) => {
      const date = record.check_in.split(' ')[0];
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(record);
      return groups;
    }, {});
  }

  // 총 근로시간 계산 메서드 추가
  getTotalOvertimeHours(attendanceRecords) {
    let totalHours = 0;
    
    attendanceRecords.forEach(record => {
      if (!['정상', '지각'].includes(record.attendance_type)) return;
      
      // 24:00:00 형식 처리
      record.check_out = processTimeString(record.check_out);
      
      const start = new Date(record.check_in);
      const end = new Date(record.check_out);
      
      // 당일 근무
      if (start.getDate() === end.getDate()) {
        const dayEnd = new Date(start);
        dayEnd.setHours(this.REGULAR_END_TIME, 0, 0);
        
        if (end > dayEnd) {
          const overtime = (end - dayEnd) / (1000 * 60 * 60);
          totalHours += overtime;
        }
      }
      // 익일 근무
      else {
        const nextDay = new Date(start);
        nextDay.setDate(nextDay.getDate() + 1);
        nextDay.setHours(this.REGULAR_START_TIME, 0, 0);
        
        const dayEnd = new Date(start);
        dayEnd.setHours(this.REGULAR_END_TIME, 0, 0);
        
        const overtime = (nextDay - dayEnd) / (1000 * 60 * 60);
        totalHours += overtime;
      }
    });

    return totalHours;
  }

  // 총 야간근로시간 계산 메서드 추가
  getTotalNightHours(attendanceRecords) {
    let totalNightHours = 0;
    
    attendanceRecords.forEach(record => {
      // 24:00:00 형식 처리
      record.check_out = processTimeString(record.check_out);
      
      const start = new Date(record.check_in);
      const end = new Date(record.check_out);
      
      // 22:00 이후 또는 06:00 이전 근무시간 계산
      const startHour = start.getHours();
      const endHour = end.getHours();
      
      // 같은 날 근무
      if (start.getDate() === end.getDate()) {
        // 22:00 이후 근무
        if (startHour >= this.NIGHT_START) {
          totalNightHours += Math.min(24 - startHour, endHour >= this.NIGHT_START ? endHour - startHour : 24 - startHour);
        }
        // 06:00 이전 근무
        if (endHour < this.NIGHT_END) {
          totalNightHours += endHour;
        }
      } 
      // 익일 근무
      else {
        // 22:00 이후 근무
        if (startHour >= this.NIGHT_START) {
          totalNightHours += (24 - startHour);
        }
        // 06:00 이전 근무
        if (endHour < this.NIGHT_END) {
          totalNightHours += endHour;
        }
        // 00:00~06:00 사이 근무
        if (startHour < this.NIGHT_END && endHour >= this.NIGHT_END) {
          totalNightHours += this.NIGHT_END - startHour;
        }
      }
    });

    return totalNightHours;
  }

  // 주의 시작일(월요일) 구하기
  getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  // 일일 근무시간 계산
  calculateDailyWorkHours(record) {
    if (!record.check_in || !record.check_out) {
      return 0;
    }

    // 24:00:00 형식 처리
    record.check_out = processTimeString(record.check_out);
    
    const checkIn = new Date(record.check_in);
    const checkOut = new Date(record.check_out);
    
    return (checkOut - checkIn) / (1000 * 60 * 60);
  }
} 