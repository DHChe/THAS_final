import os
import ast

def find_unused_imports(file_path):
    """파일에서 사용되지 않는 import 문을 찾는 함수"""
    with open(file_path, 'r', encoding='utf-8') as f:
        tree = ast.parse(f.read(), filename=file_path)

    imports = {node.names[0].name: node.lineno for node in ast.walk(tree) if isinstance(node, ast.Import)}
    used_names = {node.id for node in ast.walk(tree) if isinstance(node, ast.Name)}

    unused_imports = {name: line for name, line in imports.items() if name not in used_names}
    return unused_imports

def scan_project_for_unused_imports(directory):
    """프로젝트 폴더 내 모든 .py 파일에서 사용되지 않는 import 문을 찾음"""
    unused_imports_report = {}

    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith(".py"):
                file_path = os.path.join(root, file)
                unused_imports = find_unused_imports(file_path)
                if unused_imports:
                    unused_imports_report[file_path] = unused_imports

    return unused_imports_report

def main():
    project_dir = os.path.dirname(os.path.abspath(__file__))
    print("🔍 프로젝트 내 사용되지 않는 import 탐색 중...")
    unused_imports = scan_project_for_unused_imports(project_dir)

    if unused_imports:
        print("\n🚀 사용되지 않는 import가 있는 파일:")
        for file, imports in unused_imports.items():
            print(f"📂 {file}")
            for imp, line in imports.items():
                print(f"  ❌ Line {line}: import {imp}")
    else:
        print("\n✅ 모든 import가 정상적으로 사용됨!")

if __name__ == "__main__":
    main()
