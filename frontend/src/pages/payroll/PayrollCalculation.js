import React, { useState } from 'react';
import axios from 'axios';
import { Alert, Radio } from 'antd';
import moment from 'moment';

const PayrollCalculation = () => {
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [startDate, setStartDate] = useState(moment());
  const [endDate, setEndDate] = useState(moment());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [warnings, setWarnings] = useState(null);
  const [calculationResults, setCalculationResults] = useState([]);
  const [isCalculated, setIsCalculated] = useState(false);
  const [payrollType, setPayrollType] = useState('regular'); // 급여 유형 (regular: 정기급여, special: 특별급여)

  // 급여 계산 함수
  const calculatePayroll = async () => {
    setIsLoading(true);
    setError(null);
    setWarnings(null);

    try {
      const response = await axios.post('/api/payroll/calculate', {
        employee_ids: selectedEmployees,
        start_date: startDate.format('YYYY-MM-DD'),
        end_date: endDate.format('YYYY-MM-DD'),
        payroll_type: payrollType
      });

      // 경고 메시지가 있는지 확인
      if (response.data.warnings) {
        setWarnings(response.data.warnings);
      }

      setCalculationResults(response.data.results);
      setIsCalculated(true);
    } catch (error) {
      console.error('급여 계산 오류:', error);
      setError(error.response?.data?.error || '급여 계산 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 급여 확정 함수
  const confirmPayroll = async () => {
    if (!isCalculated || calculationResults.length === 0) {
      setError('먼저 급여를 계산해주세요.');
      return;
    }

    // 중복 기간 경고가 있는 경우 확인 요청
    if (warnings && warnings.overlapping_periods) {
      const confirmed = window.confirm(
        '일부 직원의 급여 기간이 기존 데이터와 중복됩니다. 계속 진행하시겠습니까?\n\n' +
        '중복 기간이 있는 직원: ' + Object.keys(warnings.overlapping_periods).join(', ')
      );
      
      if (!confirmed) {
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/payroll/confirm', {
        payroll_data: calculationResults,
        payment_period: {
          start: startDate.format('YYYY-MM-DD'),
          end: endDate.format('YYYY-MM-DD')
        },
        payroll_type: payrollType
      });

      // 확정 성공 처리
      alert('급여가 성공적으로 확정되었습니다.');
      setCalculationResults([]);
      setIsCalculated(false);
    } catch (error) {
      console.error('급여 확정 오류:', error);
      setError(error.response?.data?.error || '급여 확정 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="payroll-calculation-container">
      {/* 급여 유형 선택 */}
      <div className="payroll-type-selector" style={{ marginBottom: '20px' }}>
        <h3>급여 유형</h3>
        <Radio.Group 
          value={payrollType} 
          onChange={(e) => setPayrollType(e.target.value)}
          style={{ marginBottom: '10px' }}
        >
          <Radio.Button value="regular">정기급여</Radio.Button>
          <Radio.Button value="special">특별급여</Radio.Button>
        </Radio.Group>
        <div className="payroll-type-description" style={{ fontSize: '0.9em', color: '#666' }}>
          {payrollType === 'regular' ? 
            '정기급여: 매월 지급되는 기본 급여입니다. 같은 기간에 중복 지급이 불가능합니다.' : 
            '특별급여: 특정 기간에 대한 추가 급여입니다. 정기급여와 기간이 중복되어도 지급 가능합니다.'}
        </div>
      </div>
      
      {/* 기존 UI 요소들 */}
      
      {/* 경고 메시지 표시 */}
      {warnings && (
        <Alert 
          message="급여 기간 중복 경고" 
          description={
            <div>
              <p>{warnings.message}</p>
              <ul>
                {Object.entries(warnings.overlapping_periods).map(([empId, overlaps]) => (
                  <li key={empId}>
                    직원 ID: {empId}
                    <ul>
                      {overlaps.map((overlap, idx) => (
                        <li key={idx}>
                          기간: {overlap.payment_period_start} ~ {overlap.payment_period_end} (상태: {overlap.status})
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          }
          type="warning" 
          showIcon 
          style={{ marginBottom: '20px' }}
        />
      )}
      
      {/* 나머지 UI 요소들 */}
    </div>
  );
};

export default PayrollCalculation; 