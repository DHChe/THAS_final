/**
 * 급여 데이터의 기본 통계를 계산하는 유틸리티 클래스
 */
class StatisticsCalculator {
    /**
     * 급여 데이터의 기본 통계 계산
     * @param {Array} payrollData - 급여 데이터 배열
     * @param {Array} employeesData - 직원 데이터 배열
     * @returns {Object} 계산된 통계 정보
     */
    static calculateStatistics(payrollData, employeesData) {
        const stats = {
            overall: this._calculateOverallStats(payrollData),
            departmental: this._calculateDepartmentStats(payrollData, employeesData),
            timeSeries: this._calculateTimeSeriesStats(payrollData)
        };

        return stats;
    }

    /**
     * 전체 급여 통계 계산
     * @private
     */
    static _calculateOverallStats(payrollData) {
        const baseSalaries = payrollData.map(p => Number(p.base_salary));
        const totalSalaries = payrollData.map(p => Number(p.gross_salary));

        return {
            baseSalary: {
                average: this._average(baseSalaries),
                median: this._median(baseSalaries),
                min: Math.min(...baseSalaries),
                max: Math.max(...baseSalaries)
            },
            totalSalary: {
                average: this._average(totalSalaries),
                median: this._median(totalSalaries),
                min: Math.min(...totalSalaries),
                max: Math.max(...totalSalaries)
            },
            count: payrollData.length
        };
    }

    /**
     * 부서별 통계 계산
     * @private
     */
    static _calculateDepartmentStats(payrollData, employeesData) {
        const deptStats = {};

        payrollData.forEach(payroll => {
            const employee = employeesData.find(e => e.employee_id === payroll.employee_id);
            if (!employee) return;

            const dept = employee.department;
            if (!deptStats[dept]) {
                deptStats[dept] = {
                    count: 0,
                    baseSalaries: [],
                    totalSalaries: []
                };
            }

            deptStats[dept].count++;
            deptStats[dept].baseSalaries.push(Number(payroll.base_salary));
            deptStats[dept].totalSalaries.push(Number(payroll.gross_salary));
        });

        // 부서별 평균 등 계산
        Object.keys(deptStats).forEach(dept => {
            const stats = deptStats[dept];
            stats.averageBase = this._average(stats.baseSalaries);
            stats.averageTotal = this._average(stats.totalSalaries);
            stats.medianBase = this._median(stats.baseSalaries);
            stats.medianTotal = this._median(stats.totalSalaries);
        });

        return deptStats;
    }

    /**
     * 시계열 통계 계산
     * @private
     */
    static _calculateTimeSeriesStats(payrollData) {
        const monthlyStats = {};

        payrollData.forEach(payroll => {
            const month = payroll.payment_date.substring(0, 7); // YYYY-MM
            if (!monthlyStats[month]) {
                monthlyStats[month] = {
                    baseSalaries: [],
                    totalSalaries: []
                };
            }

            monthlyStats[month].baseSalaries.push(Number(payroll.base_salary));
            monthlyStats[month].totalSalaries.push(Number(payroll.gross_salary));
        });

        // 월별 평균 계산
        Object.keys(monthlyStats).forEach(month => {
            const stats = monthlyStats[month];
            stats.averageBase = this._average(stats.baseSalaries);
            stats.averageTotal = this._average(stats.totalSalaries);
        });

        return monthlyStats;
    }

    // 유틸리티 메서드들
    static _average(numbers) {
        return numbers.reduce((acc, val) => acc + val, 0) / numbers.length;
    }

    static _median(numbers) {
        const sorted = [...numbers].sort((a, b) => a - b);
        const middle = Math.floor(sorted.length / 2);
        
        if (sorted.length % 2 === 0) {
            return (sorted[middle - 1] + sorted[middle]) / 2;
        }
        return sorted[middle];
    }
}

export default StatisticsCalculator;