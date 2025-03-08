import os


def update_attendance_csv():
    file_path = "data/attendance.csv"

    # UTF-16 인코딩으로 CSV 파일 읽기
    with open(file_path, "r", encoding="utf-16") as f:
        content = f.read()

    # DV001 직원의 2024-05-16 근태 데이터 수정
    new_content = content.replace(
        "DV001,2024-05-16,,,??",
        "DV001,2024-05-16,2024-05-16 08:50:00,2024-05-16 21:30:00,??",
    )

    # 수정된 내용을 파일에 저장
    with open(file_path, "w", encoding="utf-16") as f:
        f.write(new_content)

    print("근태 데이터 업데이트 완료. DV001 직원의 2024-05-16 데이터가 수정되었습니다.")


if __name__ == "__main__":
    update_attendance_csv()
