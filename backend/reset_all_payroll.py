from config.database import get_db_session
from models.models import Payroll, PayrollAudit
from sqlalchemy import delete

# 데이터베이스 세션 생성
session = get_db_session()

try:
    # 모든 급여 데이터 조회
    all_count = session.query(Payroll).count()

    print(f"전체 급여 데이터 개수: {all_count}개")

    if all_count == 0:
        print("삭제할 급여 데이터가 없습니다.")
    else:
        # 모든 급여 데이터 삭제
        deleted_count = session.execute(delete(Payroll)).rowcount

        # 변경사항 저장
        session.commit()
        print(f"{deleted_count}개의 급여 데이터가 성공적으로 삭제되었습니다.")

except Exception as e:
    session.rollback()
    print(f"오류 발생: {e}")
finally:
    session.close()
