from config.database import get_db_session
from models.models import Payroll, PayrollAudit
from sqlalchemy import delete

# 데이터베이스 세션 생성
session = get_db_session()

try:
    # 확정된 급여 데이터 조회
    confirmed_count = (
        session.query(Payroll).filter(Payroll.status.in_(["confirmed", "paid"])).count()
    )

    print(f"확정된 급여 데이터 개수: {confirmed_count}개")

    if confirmed_count == 0:
        print("초기화할 확정 급여 데이터가 없습니다.")
    else:
        # 확정된 급여 데이터 삭제
        deleted_count = session.execute(
            delete(Payroll).where(Payroll.status.in_(["confirmed", "paid"]))
        ).rowcount

        # 변경사항 저장
        session.commit()
        print(f"{deleted_count}개의 확정 급여 데이터가 성공적으로 삭제되었습니다.")

except Exception as e:
    session.rollback()
    print(f"오류 발생: {e}")
finally:
    session.close()
