@echo off
echo 급여 계산 시스템 서버 의존성 설치를 시작합니다...

REM 가상 환경 확인
if not exist ".venv\" (
    echo 가상 환경을 생성합니다...
    python -m venv .venv
    if %errorlevel% neq 0 (
        echo 가상 환경 생성 실패!
        exit /b %errorlevel%
    )
)

REM 가상 환경 활성화
echo 가상 환경을 활성화합니다...
call .venv\Scripts\activate

REM 기본 의존성 설치
echo 기본 의존성을 설치합니다...
pip install --upgrade pip
pip install flask flask-cors pandas sqlalchemy python-dotenv requests matplotlib numpy holidays pytest pytest-cov

REM 추가: WebSocket 지원을 위한 패키지 설치
echo WebSocket 지원을 위한 패키지를 설치합니다...
pip install flask-socketio eventlet gevent gevent-websocket

REM 완료 메시지
echo 설치가 완료되었습니다.
echo 서버를 시작하려면 "python run_server.py" 명령을 실행하세요.

REM 패키지 목록 저장
pip freeze > requirements.txt
echo 의존성 목록이 requirements.txt 파일에 저장되었습니다.

pause