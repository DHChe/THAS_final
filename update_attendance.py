import os


def update_attendance_csv():
    file_path = "data/attendance.csv"

    # Read the CSV file
    with open(file_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    # Find and update the specific line
    for i, line in enumerate(lines):
        if line.startswith("DV001,2024-05-16,"):
            lines[i] = "DV001,2024-05-16,2024-05-16 08:50:00,2024-05-16 21:30:00,??\n"
            break

    # Write the modified content back to the file
    with open(file_path, "w", encoding="utf-8") as f:
        f.writelines(lines)

    print("근태 데이터 업데이트 완료. DV001 직원의 2024-05-16 데이터가 수정되었습니다.")


if __name__ == "__main__":
    update_attendance_csv()
