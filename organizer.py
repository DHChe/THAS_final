import os
import ast
import shutil
import argparse
import sys


def find_unused_imports(file_path):
    """파일에서 사용되지 않는 import 문을 찾고 자동으로 제거"""
    with open(file_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    tree = ast.parse("".join(lines), filename=file_path)
    imports = {
        node.names[0].name: node.lineno
        for node in ast.walk(tree)
        if isinstance(node, ast.Import)
    }
    used_names = {node.id for node in ast.walk(tree) if isinstance(node, ast.Name)}

    unused_imports = {
        name: line for name, line in imports.items() if name not in used_names
    }
    if unused_imports:
        with open(file_path, "w", encoding="utf-8") as f:
            for i, line in enumerate(lines, 1):
                if not any(i == unused_imports[name] for name in unused_imports):
                    f.write(line)
    return unused_imports


def scan_project_for_unused_imports(directory):
    """프로젝트 폴더 내 모든 .py 파일에서 사용되지 않는 import 문을 찾고 자동 제거"""
    unused_imports_report = {}

    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith(".py"):
                file_path = os.path.join(root, file)
                unused_imports = find_unused_imports(file_path)
                if unused_imports:
                    unused_imports_report[file_path] = unused_imports

    return unused_imports_report


def find_unused_files(directory, target_extension=".py"):
    """사용되지 않는 파일을 탐색하여 삭제"""
    all_files = [
        os.path.join(directory, f)
        for f in os.listdir(directory)
        if f.endswith(target_extension)
    ]
    used_files = set()

    for file in all_files:
        with open(file, "r", encoding="utf-8") as f:
            content = f.read()
            for other_file in all_files:
                if (
                    os.path.basename(other_file).replace(target_extension, "")
                    in content
                ):
                    used_files.add(other_file)

    unused_files = set(all_files) - used_files
    if not args.dry_run:
        for file in unused_files:
            print(f"[삭제] 사용되지 않는 파일: {file}")
            os.remove(file)
    else:
        for file in unused_files:
            print(f"[찾음] 사용되지 않는 파일: {file} (삭제되지 않음 - dry-run 모드)")

    return unused_files


def find_files_by_extension(directory, extension):
    """지정된 확장자를 가진 모든 파일 찾기"""
    result = []
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith(extension):
                result.append(os.path.join(root, file))
    return result


def main():
    print("[시작] 프로젝트 정리 중...")

    if args.scan_only:
        print("\n[안내] 스캔 모드로 실행 중입니다. 파일은 변경되지 않습니다.")

    if args.target_dir:
        project_dir = args.target_dir
    else:
        project_dir = os.path.dirname(os.path.abspath(__file__))

    print(f"[정보] 대상 디렉토리: {project_dir}")

    if args.extension:
        print(f"[정보] 대상 파일 확장자: {args.extension}")
        target_files = find_files_by_extension(project_dir, args.extension)
        print(f"[정보] {len(target_files)}개의 {args.extension} 파일을 찾았습니다.")

        if args.list_only:
            print("\n[목록] 발견된 파일:")
            for file in target_files:
                print(f"  - {file}")
            return

        if ".py" == args.extension:
            unused_imports = scan_project_for_unused_imports(project_dir)
            if unused_imports:
                print("\n[발견] 사용되지 않는 import가 포함된 파일:")
                for file, imports in unused_imports.items():
                    print(f"  - {file}")
                    for imp, line in imports.items():
                        if args.scan_only or args.dry_run:
                            action = "발견"
                        else:
                            action = "자동 삭제됨"
                        print(f"    Line {line}: import {imp} ({action})")
            else:
                print("\n[확인] 모든 import가 정상적으로 사용됨!")

        if not args.no_unused_file_check:
            found_files = find_unused_files(project_dir, args.extension)
            if not found_files:
                print(f"\n[확인] 모든 {args.extension} 파일이 사용되고 있습니다!")
    else:
        print("[정보] 확장자를 지정하지 않아 Python 파일(.py)을 기본으로 검사합니다.")
        unused_imports = scan_project_for_unused_imports(project_dir)
        if unused_imports:
            print("\n[발견] 사용되지 않는 import가 포함된 파일:")
            for file, imports in unused_imports.items():
                print(f"  - {file}")
                for imp, line in imports.items():
                    if args.scan_only or args.dry_run:
                        action = "발견"
                    else:
                        action = "자동 삭제됨"
                    print(f"    Line {line}: import {imp} ({action})")
        else:
            print("\n[확인] 모든 import가 정상적으로 사용됨!")

        if not args.no_unused_file_check:
            found_files = find_unused_files(project_dir)
            if not found_files:
                print("\n[확인] 모든 Python 파일이 사용되고 있습니다!")

    print("\n[완료] 프로젝트 정리 완료!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="프로젝트 코드베이스 정리 도구")
    parser.add_argument(
        "--scan-only",
        action="store_true",
        help="스캔만 수행하고 파일을 수정하지 않습니다",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="실제 삭제 없이 어떤 파일이 삭제될지 표시합니다",
    )
    parser.add_argument("--target-dir", type=str, help="검사할 대상 디렉토리 지정")
    parser.add_argument(
        "--extension", type=str, help="검사할 파일 확장자 (예: .js, .py)"
    )
    parser.add_argument(
        "--list-only",
        action="store_true",
        help="파일 목록만 표시하고 분석하지 않습니다",
    )
    parser.add_argument(
        "--no-unused-file-check",
        action="store_true",
        help="사용되지 않는 파일 검사를 건너뜁니다",
    )

    args = parser.parse_args()

    main()
