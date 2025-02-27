import os
import ast
import shutil

def find_unused_imports(file_path):
    """파일에서 사용되지 않는 import 문을 찾고 자동으로 제거"""
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    tree = ast.parse(''.join(lines), filename=file_path)
    imports = {node.names[0].name: node.lineno for node in ast.walk(tree) if isinstance(node, ast.Import)}
    used_names = {node.id for node in ast.walk(tree) if isinstance(node, ast.Name)}
    
    unused_imports = {name: line for name, line in imports.items() if name not in used_names}
    if unused_imports:
        with open(file_path, 'w', encoding='utf-8') as f:
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

def find_unused_files(directory):
    """사용되지 않는 .py 파일을 탐색하여 삭제"""
    all_files = [os.path.join(directory, f) for f in os.listdir(directory) if f.endswith('.py')]
    used_files = set()
    
    for file in all_files:
        with open(file, 'r', encoding='utf-8') as f:
            content = f.read()
            for other_file in all_files:
                if os.path.basename(other_file).replace('.py', '') in content:
                    used_files.add(other_file)
    
    unused_files = set(all_files) - used_files
    for file in unused_files:
        print(f"🗑️ 사용되지 않는 파일 삭제: {file}")
        os.remove(file)

def main():
    project_dir = os.path.dirname(os.path.abspath(__file__))
    print("🔍 프로젝트 정리 중...")
    
    unused_imports = scan_project_for_unused_imports(project_dir)
    if unused_imports:
        print("\n🚀 사용되지 않는 import가 포함된 파일:")
        for file, imports in unused_imports.items():
            print(f"📂 {file}")
            for imp, line in imports.items():
                print(f"  ❌ Line {line}: import {imp} (자동 삭제됨)")
    else:
        print("\n✅ 모든 import가 정상적으로 사용됨!")
    
    find_unused_files(project_dir)
    print("✅ 프로젝트 정리 완료!")

if __name__ == "__main__":
    main()
