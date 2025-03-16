from flask import Blueprint, request, jsonify, make_response
import jwt
from datetime import datetime, timedelta
import os

auth_bp = Blueprint("auth", __name__)

# JWT 시크릿 키 설정
SECRET_KEY = os.environ.get("SECRET_KEY", "your-secret-key-here")

# 테스트용 사용자 정보 (실제로는 데이터베이스에서 관리해야 함)
TEST_USER = {"username": "admin", "password": "admin123"}


@auth_bp.route("/login", methods=["POST", "OPTIONS"])
def login():
    if request.method == "OPTIONS":
        response = make_response()
        response.headers.add("Access-Control-Allow-Origin", "http://localhost:3001")
        response.headers.add(
            "Access-Control-Allow-Headers", "Content-Type,Authorization,Accept"
        )
        response.headers.add("Access-Control-Allow-Methods", "POST,OPTIONS")
        response.headers.add("Access-Control-Allow-Credentials", "true")
        return response

    data = request.get_json()

    if not data or not data.get("username") or not data.get("password"):
        return jsonify({"message": "아이디와 비밀번호를 입력해주세요."}), 400

    username = data.get("username")
    password = data.get("password")

    # 테스트 계정 확인
    if username == TEST_USER["username"] and password == TEST_USER["password"]:
        # JWT 토큰 생성
        token = jwt.encode(
            {
                "user": username,
                "exp": datetime.utcnow() + timedelta(days=1),  # 24시간 유효
            },
            SECRET_KEY,
            algorithm="HS256",
        )

        response = jsonify({"token": token, "message": "로그인 성공"})
        response.headers.add("Access-Control-Allow-Origin", "http://localhost:3001")
        response.headers.add("Access-Control-Allow-Credentials", "true")
        return response

    return jsonify({"message": "아이디 또는 비밀번호가 일치하지 않습니다."}), 401


@auth_bp.route("/verify", methods=["GET"])
def verify_token():
    token = request.headers.get("Authorization")

    if not token:
        return jsonify({"message": "인증 토큰이 없습니다."}), 401

    try:
        # 'Bearer ' 접두사 제거
        if token.startswith("Bearer "):
            token = token.split(" ")[1]

        # 토큰 검증
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return jsonify({"valid": True, "user": payload["user"]})
    except jwt.ExpiredSignatureError:
        return jsonify({"message": "만료된 토큰입니다."}), 401
    except jwt.InvalidTokenError:
        return jsonify({"message": "유효하지 않은 토큰입니다."}), 401
