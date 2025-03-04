"""
데이터베이스 모델 정의
급여 지급 및 분석을 위한 데이터베이스 모델 클래스
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    Text,
    ForeignKey,
    BigInteger,
    Date,
    JSON,
    Boolean,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func, text
from sqlalchemy.orm import relationship
from datetime import datetime
import logging

from config.database import Base

logging.basicConfig()
logging.getLogger("sqlalchemy.engine").setLevel(logging.INFO)


class Employee(Base):
    """직원 정보 모델"""

    __tablename__ = "employees"

    employee_id = Column(String(10), primary_key=True, comment="직원 ID")
    name = Column(String(100), nullable=False, comment="이름")
    department = Column(String(50), nullable=False, comment="부서")
    position = Column(String(50), nullable=False, comment="직급")
    join_date = Column(Date, nullable=True, comment="입사일")
    birth = Column(Date, nullable=True, comment="생년월일")
    sex = Column(String(10), nullable=True, comment="성별")
    base_salary = Column(BigInteger, nullable=False, default=0, comment="연봉")
    status = Column(String(20), nullable=False, default="재직중", comment="상태")
    resignation_date = Column(Date, nullable=True, comment="퇴사일")
    family_count = Column(Integer, nullable=False, default=0, comment="가족 수")
    num_children = Column(Integer, nullable=False, default=0, comment="자녀 수")
    children_ages = Column(String(100), nullable=True, comment="자녀 나이")
    created_at = Column(
        DateTime, nullable=False, default=func.now(), comment="생성일시"
    )
    updated_at = Column(
        DateTime,
        nullable=False,
        default=func.now(),
        onupdate=func.now(),
        comment="수정일시",
    )

    # 관계 설정
    payrolls = relationship("Payroll", back_populates="employee")
    attendances = relationship("Attendance", back_populates="employee")

    def __repr__(self):
        return f"<Employee(id={self.employee_id}, name={self.name})>"


class Attendance(Base):
    """근태 기록 모델"""

    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="ID")
    employee_id = Column(
        String(10),
        ForeignKey("employees.employee_id"),
        nullable=False,
        comment="직원 ID",
    )
    date = Column(Date, nullable=False, comment="날짜")
    check_in = Column(String(19), nullable=True, comment="출근시간")
    check_out = Column(String(19), nullable=True, comment="퇴근시간")
    attendance_type = Column(
        String(20), nullable=False, default="정상", comment="근태유형"
    )
    remarks = Column(Text, nullable=True, comment="비고")
    created_at = Column(
        DateTime, nullable=False, default=func.now(), comment="생성일시"
    )
    updated_at = Column(
        DateTime,
        nullable=False,
        default=func.now(),
        onupdate=func.now(),
        comment="수정일시",
    )

    # 관계 설정
    employee = relationship("Employee", back_populates="attendances")

    def __repr__(self):
        return f"<Attendance(id={self.id}, employee_id={self.employee_id}, date={self.date})>"


class Payroll(Base):
    """급여 데이터 모델"""

    __tablename__ = "payroll"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="ID")
    payroll_code = Column(String(20), unique=True, nullable=False, comment="급여코드")
    employee_id = Column(
        String(10),
        ForeignKey("employees.employee_id"),
        nullable=False,
        comment="직원 ID",
    )
    payment_period_start = Column(Date, nullable=False, comment="급여기간 시작")
    payment_period_end = Column(Date, nullable=False, comment="급여기간 종료")
    payment_date = Column(Date, nullable=True, comment="지급일")
    base_pay = Column(BigInteger, nullable=False, comment="기본급")
    overtime_pay = Column(BigInteger, nullable=False, default=0, comment="초과근무수당")
    night_shift_pay = Column(
        BigInteger, nullable=False, default=0, comment="야간근무수당"
    )
    holiday_pay = Column(BigInteger, nullable=False, default=0, comment="휴일근무수당")
    total_allowances = Column(BigInteger, nullable=False, default=0, comment="총 수당")
    gross_pay = Column(BigInteger, nullable=False, comment="총 지급액")
    income_tax = Column(BigInteger, nullable=False, default=0, comment="소득세")
    residence_tax = Column(BigInteger, nullable=False, default=0, comment="주민세")
    national_pension = Column(BigInteger, nullable=False, default=0, comment="국민연금")
    health_insurance = Column(BigInteger, nullable=False, default=0, comment="건강보험")
    employment_insurance = Column(
        BigInteger, nullable=False, default=0, comment="고용보험"
    )
    total_deductions = Column(
        BigInteger, nullable=False, default=0, comment="총 공제액"
    )
    net_pay = Column(BigInteger, nullable=False, comment="실수령액")
    status = Column(String(20), nullable=False, default="draft", comment="상태")
    confirmed_at = Column(DateTime, nullable=True, comment="확정일시")
    confirmed_by = Column(String(50), nullable=True, comment="확정자")
    payment_method = Column(String(20), nullable=True, comment="지급방법")
    remarks = Column(Text, nullable=True, comment="비고")
    created_at = Column(
        DateTime, nullable=False, default=func.now(), comment="생성일시"
    )
    updated_at = Column(
        DateTime,
        nullable=False,
        default=func.now(),
        onupdate=func.now(),
        comment="수정일시",
    )

    # 관계 설정
    employee = relationship("Employee", back_populates="payrolls")

    def __repr__(self):
        return f"<Payroll(code={self.payroll_code}, employee_id={self.employee_id})>"


class PayrollAudit(Base):
    """급여 감사 추적 모델"""

    __tablename__ = "payroll_audit"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="ID")
    action = Column(String(50), nullable=False, comment="작업유형")
    user_id = Column(String(50), nullable=False, comment="사용자ID")
    timestamp = Column(
        DateTime, nullable=False, default=func.now(), comment="타임스탬프"
    )
    target_type = Column(String(50), nullable=False, comment="대상유형")
    target_id = Column(String(50), nullable=False, comment="대상ID")
    old_value = Column(JSON, nullable=True, comment="이전값")
    new_value = Column(JSON, nullable=True, comment="새값")
    ip_address = Column(String(50), nullable=True, comment="IP주소")
    created_at = Column(
        DateTime, nullable=False, default=func.now(), comment="생성일시"
    )

    def __repr__(self):
        return f"<PayrollAudit(id={self.id}, action={self.action}, target_id={self.target_id})>"


class PayrollDocument(Base):
    """급여 문서 모델 (명세서 등)"""

    __tablename__ = "payroll_documents"

    id = Column(BigInteger, primary_key=True, autoincrement=True, comment="ID")
    payroll_id = Column(
        BigInteger, ForeignKey("payroll.id"), nullable=False, comment="급여ID"
    )
    document_type = Column(String(50), nullable=False, comment="문서유형")
    document_path = Column(String(255), nullable=False, comment="문서경로")
    created_at = Column(
        DateTime, nullable=False, default=func.now(), comment="생성일시"
    )
    created_by = Column(String(50), nullable=False, comment="생성자")
    sent = Column(Boolean, nullable=False, default=False, comment="발송여부")
    sent_at = Column(DateTime, nullable=True, comment="발송일시")
    sent_to = Column(String(100), nullable=True, comment="수신자")

    def __repr__(self):
        return f"<PayrollDocument(id={self.id}, payroll_id={self.payroll_id}, type={self.document_type})>"
