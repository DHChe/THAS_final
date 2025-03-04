import os
import re
import shutil


def find_unused_imports_js(file_path):
    """JS 파일에서 사용되지 않는 import 문 탐색"""
    with open(file_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    import_pattern = re.compile(r"^import\s+[\w\{\},\s]+from\s+[\'\"]([\w\./-]+)[\'\"]")
    imported_modules = {}

    for i, line in enumerate(lines):
        match = import_pattern.match(line)
        if match:
            module_name = match.group(1).split("/")[-1]
            imported_modules[module_name] = i

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    unused_imports = {
        mod: line for mod, line in imported_modules.items() if mod not in content
    }

    if unused_imports:
        with open(file_path, "w", encoding="utf-8") as f:
            for i, line in enumerate(lines):
                if i not in unused_imports.values():
                    f.write(line)

    return unused_imports


def scan_js_files(directory):
    """JS 파일에서 사용되지 않는 import 제거 및 미사용 파일 탐색"""
    unused_imports_report = {}

    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith(".js"):
                file_path = os.path.join(root, file)
                unused_imports = find_unused_imports_js(file_path)
                if unused_imports:
                    unused_imports_report[file_path] = unused_imports

    return unused_imports_report


def find_unused_js_files(directory):
    """사용되지 않는 JavaScript 파일 탐색 후 삭제"""
    all_js_files = [
        os.path.join(directory, f) for f in os.listdir(directory) if f.endswith(".js")
    ]
    used_files = set()

    for file in all_js_files:
        with open(file, "r", encoding="utf-8") as f:
            content = f.read()
            for other_file in all_js_files:
                if os.path.basename(other_file).replace(".js", "") in content:
                    used_files.add(other_file)

    unused_files = set(all_js_files) - used_files
    for file in unused_files:
        print(f"🗑️ 사용되지 않는 JavaScript 파일 삭제: {file}")
        os.remove(file)


def main():
    project_dir = os.path.dirname(os.path.abspath(__file__))
    print("🔍 JavaScript 코드 정리 중...")

    unused_imports = scan_js_files(project_dir)
    if unused_imports:
        print("\n🚀 사용되지 않는 import가 포함된 JS 파일:")
        for file, imports in unused_imports.items():
            print(f"📂 {file}")
            for imp, line in imports.items():
                print(f"  ❌ Line {line}: import {imp} (자동 삭제됨)")
    else:
        print("\n✅ 모든 import가 정상적으로 사용됨!")

    find_unused_js_files(project_dir)
    print("✅ JavaScript 코드 정리 완료!")


if __name__ == "__main__":
    main()
