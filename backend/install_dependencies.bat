@echo off
echo Poetry 의존성 설치
echo =================

:: Poetry가 설치되어 있는지 확인
where poetry >nul 2>nul
if %errorlevel% neq 0 (
    echo Poetry가 설치되어 있지 않습니다. 설치를 시작합니다...
    pip install poetry
)

:: Poetry 의존성 설치
echo Poetry 의존성을 설치합니다...
poetry install

echo.
echo 설치가 완료되었습니다!
echo 이제 start_server.bat을 실행하여 서버를 시작할 수 있습니다.
pause