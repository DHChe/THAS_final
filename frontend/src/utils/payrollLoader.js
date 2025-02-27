import Papa from 'papaparse';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { ValidationError, DataLoadError } from './errors.js';
import { performanceMonitor } from './performanceMonitor';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const REQUIRED_FIELDS = [
  'employee_id', 'name', 'department', 'position', 
  'base_salary', 'net_salary', 'payment_date'
];

const validateCSVStructure = (data) => {
  if (!Array.isArray(data) || data.length === 0) {
    throw new ValidationError('CSV 데이터가 비어있거나 올바르지 않은 형식입니다.');
  }

  const missingFields = REQUIRED_FIELDS.filter(field => 
    !Object.keys(data[0]).includes(field)
  );

  if (missingFields.length > 0) {
    throw new ValidationError(
      `필수 필드가 누락되었습니다: ${missingFields.join(', ')}`
    );
  }
};

const parsePayrollData = (data) => {
  return data.map(row => ({
    ...row,
    base_salary: Number(row.base_salary),
    position_allowance: Number(row.position_allowance),
    overtime_pay: Number(row.overtime_pay),
    night_shift_pay: Number(row.night_shift_pay),
    holiday_pay: Number(row.holiday_pay),
    meal_allowance: Number(row.meal_allowance),
    transportation_allowance: Number(row.transportation_allowance),
    bonus: Number(row.bonus),
    gross_salary: Number(row.gross_salary),
    national_pension: Number(row.national_pension),
    health_insurance: Number(row.health_insurance),
    long_term_care: Number(row.long_term_care),
    employment_insurance: Number(row.employment_insurance),
    income_tax: Number(row.income_tax),
    local_income_tax: Number(row.local_income_tax),
    net_salary: Number(row.net_salary)
  }));
};

const validatePayrollData = (data) => {
  return data.filter(row => 
    row.employee_id && 
    !isNaN(row.net_salary) && 
    row.payment_date.match(/^\d{4}-\d{2}-\d{2}$/)
  );
};

const CACHE_CONFIG = {
  SALARY_DATA_TTL: 24 * 60 * 60 * 1000, // 24시간
  STATISTICS_TTL: 60 * 60 * 1000, // 1시간
  MAX_CACHE_SIZE: 50 * 1024 * 1024 // 50MB
};

let cache = {
  payrollData: null,
  statistics: null,
  lastPayrollUpdate: null,
  lastStatisticsUpdate: null,
  memoryUsage: 0
};

const calculateMemoryUsage = (data) => {
  return new Blob([JSON.stringify(data)]).size;
};

const isCacheValid = (type) => {
  const now = Date.now();
  if (type === 'payroll') {
    return cache.lastPayrollUpdate && 
           (now - cache.lastPayrollUpdate) < CACHE_CONFIG.SALARY_DATA_TTL;
  }
  return cache.lastStatisticsUpdate && 
         (now - cache.lastStatisticsUpdate) < CACHE_CONFIG.STATISTICS_TTL;
};

export const loadPayrollData = async () => {
  const loadTimer = performanceMonitor.startTimer('load');
  try {
    const response = await fetch('/data/payroll.csv');
    const csvData = await response.text();
    
    const parseTimer = performanceMonitor.startTimer('parse');
    const parseResult = Papa.parse(csvData, { 
      header: true,
      error: (error) => {
        throw new Error(`CSV 파싱 실패: ${error.message}`);
      }
    });

    const parsedData = parsePayrollData(parseResult.data);
    performanceMonitor.endTimer(parseTimer);
    
    const memoryUsage = calculateMemoryUsage(parsedData);
    performanceMonitor.recordMemoryUsage(memoryUsage);
    
    if (memoryUsage > CACHE_CONFIG.MAX_CACHE_SIZE) {
      console.warn('캐시 메모리 제한 초과. 캐시 저장하지 않음.');
      performanceMonitor.endTimer(loadTimer);
      return parsedData;
    }

    cache.payrollData = parsedData;
    cache.lastPayrollUpdate = Date.now();
    cache.memoryUsage = memoryUsage;

    performanceMonitor.endTimer(loadTimer);
    return parsedData;
  } catch (error) {
    performanceMonitor.endTimer(loadTimer);
    console.error('급여 데이터 로드 실패:', error);
    throw new DataLoadError('급여 데이터를 불러오는데 실패했습니다.');
  }
};

// 통계 데이터 캐시 관리
export const getPayrollStatistics = async () => {
  const statsTimer = performanceMonitor.startTimer('render');
  
  if (isCacheValid('statistics')) {
    performanceMonitor.endTimer(statsTimer);
    return cache.statistics;
  }

  const payrollData = await loadPayrollData();
  const statistics = calculateStatistics(payrollData);
  
  cache.statistics = statistics;
  cache.lastStatisticsUpdate = Date.now();
  
  performanceMonitor.endTimer(statsTimer);
  return statistics;
};

// 캐시 초기화 함수
export const clearCache = () => {
  cache = {
    payrollData: null,
    statistics: null,
    lastPayrollUpdate: null,
    lastStatisticsUpdate: null,
    memoryUsage: 0
  };
};

// 날짜 검증 함수
const validateDate = (dateStr) => {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new ValidationError(`올바르지 않은 날짜 형식: ${dateStr}`);
  }
  return dateStr;
};
