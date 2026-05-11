from __future__ import annotations

import json
from copy import deepcopy
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent
HOST = "127.0.0.1"
PORT = 4173


def build_initial_state():
    return {
        "users": {
            "writer_demo": {
                "id": "writer_demo",
                "username": "yurino_script",
                "displayName": "유리노",
                "role": "CREATOR",
                "walletBalance": 0,
                "creatorProfile": {
                    "primaryRole": "WRITER",
                    "headline": "보이스 드라마와 여성향 세계관 설계에 강한 시나리오 작가",
                    "bio": "긴 호흡의 감정선과 캐릭터 중심 대사를 잘 다듬습니다.",
                    "skills": ["시나리오", "대사 각색", "세계관 설계"],
                    "availabilityNote": "2주 내 합류 가능",
                    "responseRate": 98,
                    "followerCount": 3800,
                    "completedProjects": 18,
                },
            },
            "illustrator_demo": {
                "id": "illustrator_demo",
                "username": "renka_frame",
                "displayName": "렌카",
                "role": "CREATOR",
                "walletBalance": 0,
                "creatorProfile": {
                    "primaryRole": "ILLUSTRATOR",
                    "headline": "서브컬처 캐릭터 비주얼과 썸네일 아트 디렉션 전문",
                    "bio": "라이트노벨 커버와 오디오 드라마 키비주얼을 제작합니다.",
                    "skills": ["캐릭터 디자인", "표지", "썸네일"],
                    "availabilityNote": "즉시 가능",
                    "responseRate": 95,
                    "followerCount": 8200,
                    "completedProjects": 24,
                },
            },
            "voice_demo": {
                "id": "voice_demo",
                "username": "haruka_voice",
                "displayName": "하루카",
                "role": "CREATOR",
                "walletBalance": 0,
                "creatorProfile": {
                    "primaryRole": "VOICE_ACTOR",
                    "headline": "청량한 소녀 톤부터 몽환적인 내레이션까지 소화하는 성우",
                    "bio": "ASMR, 오디오북, 캐릭터 보이스 샘플을 빠르게 공유합니다.",
                    "skills": ["캐릭터 보이스", "나레이션", "ASMR"],
                    "availabilityNote": "이번 주 녹음 슬롯 3개",
                    "responseRate": 99,
                    "followerCount": 12400,
                    "completedProjects": 31,
                    "voiceDemo": {
                        "title": "Moonlit Monologue Demo",
                        "durationSeconds": 102,
                        "waveform": [20, 34, 28, 52, 47, 68, 36, 54, 42, 73, 50, 32, 61, 40],
                    },
                },
            },
            "reader_demo": {
                "id": "reader_demo",
                "username": "reader_one",
                "displayName": "리더 원",
                "role": "READER",
                "walletBalance": 0,
                "creatorProfile": None,
            },
        },
        "projects": {
            "project-midnight-signal": {
                "id": "project-midnight-signal",
                "title": "너의 이름을 부르는 목소리",
                "slug": "midnight-signal",
                "description": "감정선 중심의 오디오 드라마 프로젝트",
                "synopsis": "이름을 잃어버린 두 사람이 밤마다 서로를 듣게 되는 이야기.",
                "priceCoins": 1000,
                "isOfficialPartner": False,
                "platformFeeRate": 0.15,
                "partnerFeeRate": 0.08,
                "members": [
                    {"userId": "writer_demo", "memberRole": "WRITER", "sharePercentage": 30},
                    {"userId": "illustrator_demo", "memberRole": "ILLUSTRATOR", "sharePercentage": 30},
                    {"userId": "voice_demo", "memberRole": "VOICE_ACTOR", "sharePercentage": 40},
                ],
                "episodes": [
                    {
                        "id": "episode-midnight-signal-01",
                        "title": "Episode 01 · Midnight Signal",
                        "slug": "midnight-signal-ep01",
                        "summary": "첫 번째 신호가 울린 밤",
                        "audioUrl": "https://cdn.example.com/audio/midnight-signal-ep01.mp3",
                        "durationSeconds": 342,
                        "sequenceNumber": 1,
                        "transcriptCues": [
                            {"startMs": 0, "endMs": 5200, "text": "문이 열리는 순간, 오래된 별빛이 숨을 쉬기 시작했다."},
                            {"startMs": 5201, "endMs": 10400, "text": "지금, 너의 이름을 부르는 목소리가 가장 또렷하게 번진다."},
                            {"startMs": 10401, "endMs": 15600, "text": "한 걸음 더 다가오면, 잊고 있던 장면들이 파도처럼 깨어난다."},
                            {"startMs": 15601, "endMs": 20800, "text": "멈추지 마. 이 밤의 마지막 페이지는 아직 재생 중이니까."},
                        ],
                    }
                ],
            }
        },
        "transactions": [],
        "contentAccesses": [],
        "nextTransactionNumber": 1,
    }


STATE = build_initial_state()


def json_response(handler: BaseHTTPRequestHandler, status: int, payload: dict):
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def get_current_user_id(handler: BaseHTTPRequestHandler):
    return handler.headers.get("x-user-id") or "reader_demo"


def format_project_detail(project_id: str, user_id: str):
    project = STATE["projects"][project_id]
    has_access = any(
        access["userId"] == user_id and access["projectId"] == project_id
        for access in STATE["contentAccesses"]
    ) or any(member["userId"] == user_id for member in project["members"])
    applied_fee_rate = project["partnerFeeRate"] if project["isOfficialPartner"] else project["platformFeeRate"]
    return {
        "id": project["id"],
        "title": project["title"],
        "description": project["description"],
        "synopsis": project["synopsis"],
        "priceCoins": project["priceCoins"],
        "hasAccess": has_access,
        "appliedFeeRate": applied_fee_rate,
    }


def get_home_data():
    creators = []
    for user in STATE["users"].values():
        profile = user["creatorProfile"]
        if not profile:
          continue
        creators.append(
            {
                "id": user["id"],
                "displayName": user["displayName"],
                "username": user["username"],
                "primaryRole": profile["primaryRole"],
                "headline": profile["headline"],
                "skills": profile["skills"],
                "voiceWaveform": profile.get("voiceDemo", {}).get("waveform", []),
            }
        )

    total_gross = sum(transaction["grossAmount"] for transaction in STATE["transactions"])
    return {
        "featuredCreators": creators,
        "featuredProjects": [
            {
                "id": project["id"],
                "title": project["title"],
                "slug": project["slug"],
                "synopsis": project["synopsis"],
                "priceCoins": project["priceCoins"],
                "isOfficialPartner": project["isOfficialPartner"],
            }
            for project in STATE["projects"].values()
        ],
        "platformStats": {
            "totalPaidTransactions": len(STATE["transactions"]),
            "totalGrossRevenue": total_gross,
        },
    }


def get_creators(role: str | None):
    creators = []
    for user in STATE["users"].values():
        profile = user["creatorProfile"]
        if not profile:
            continue
        if role and role != profile["primaryRole"]:
            continue
        creators.append(
            {
                "id": user["id"],
                "username": user["username"],
                "displayName": user["displayName"],
                "primaryRole": profile["primaryRole"],
                "headline": profile["headline"],
                "bio": profile["bio"],
                "skills": profile["skills"],
                "availabilityNote": profile["availabilityNote"],
                "responseRate": profile["responseRate"],
                "followerCount": profile["followerCount"],
                "completedProjects": profile["completedProjects"],
                "voiceDemo": profile.get("voiceDemo"),
            }
        )
    return creators


def get_settlement_dashboard(project_id: str, current_user_id: str):
    project = STATE["projects"][project_id]
    gross_amount = sum(t["grossAmount"] for t in STATE["transactions"] if t["projectId"] == project_id)
    fee_amount = sum(t["platformFeeAmount"] for t in STATE["transactions"] if t["projectId"] == project_id)
    net_amount = sum(t["netAmount"] for t in STATE["transactions"] if t["projectId"] == project_id)
    applied_fee_rate = project["partnerFeeRate"] if project["isOfficialPartner"] else project["platformFeeRate"]

    members = []
    my_share = 0
    for member in project["members"]:
        user = STATE["users"][member["userId"]]
        expected = round(net_amount * member["sharePercentage"] / 100, 2)
        members.append(
            {
                "userId": member["userId"],
                "displayName": user["displayName"],
                "username": user["username"],
                "memberRole": member["memberRole"],
                "sharePercentage": member["sharePercentage"],
                "expectedSettlement": expected,
            }
        )
        if member["userId"] == current_user_id:
            my_share = member["sharePercentage"]

    return {
        "projectId": project_id,
        "title": project["title"],
        "grossAmount": gross_amount,
        "platformFeeAmount": fee_amount,
        "netAmount": net_amount,
        "appliedFeeRate": applied_fee_rate,
        "members": members,
        "mySettlement": {
            "userId": current_user_id,
            "sharePercentage": my_share,
            "amount": round(net_amount * my_share / 100, 2) if my_share else 0,
        },
    }


def get_wallet(user_id: str):
    user = STATE["users"][user_id]
    return {
        "userId": user_id,
        "balance": user["walletBalance"],
        "currency": "COIN",
        "user": {
            "id": user_id,
            "displayName": user["displayName"],
            "username": user["username"],
        },
    }


def get_viewer(project_id: str, user_id: str):
    project = STATE["projects"][project_id]
    has_access = any(
        access["userId"] == user_id and access["projectId"] == project_id
        for access in STATE["contentAccesses"]
    ) or any(member["userId"] == user_id for member in project["members"])

    if not has_access:
        return None

    episode = project["episodes"][0]
    return {
        "project": {
            "id": project["id"],
            "title": project["title"],
            "synopsis": project["synopsis"],
        },
        "episode": {
            "id": episode["id"],
            "title": episode["title"],
            "slug": episode["slug"],
            "summary": episode["summary"],
            "audioUrl": episode["audioUrl"],
            "durationSeconds": episode["durationSeconds"],
            "sequenceNumber": episode["sequenceNumber"],
            "transcriptCues": episode["transcriptCues"],
        },
    }


def purchase_content(project_id: str, buyer_id: str, coin_amount: int):
    project = STATE["projects"][project_id]
    if any(access["userId"] == buyer_id and access["projectId"] == project_id for access in STATE["contentAccesses"]):
        raise ValueError("This user already owns access to the project.")

    applied_fee_rate = project["partnerFeeRate"] if project["isOfficialPartner"] else project["platformFeeRate"]
    platform_fee_amount = round(coin_amount * applied_fee_rate, 2)
    net_amount = round(coin_amount - platform_fee_amount, 2)
    transaction_id = f"txn_{STATE['nextTransactionNumber']:04d}"
    STATE["nextTransactionNumber"] += 1

    settlements = []
    allocated = 0.0
    for index, member in enumerate(project["members"]):
        is_last = index == len(project["members"]) - 1
        settled_amount = round(net_amount * member["sharePercentage"] / 100, 2)
        if is_last:
            settled_amount = round(net_amount - allocated, 2)
        allocated = round(allocated + settled_amount, 2)
        settlements.append(
            {
                "userId": member["userId"],
                "memberRole": member["memberRole"],
                "sharePercentage": member["sharePercentage"],
                "settledAmount": settled_amount,
            }
        )
        STATE["users"][member["userId"]]["walletBalance"] = round(
            STATE["users"][member["userId"]]["walletBalance"] + settled_amount,
            2,
        )

    STATE["transactions"].append(
        {
            "id": transaction_id,
            "buyerId": buyer_id,
            "projectId": project_id,
            "grossAmount": coin_amount,
            "platformFeeAmount": platform_fee_amount,
            "netAmount": net_amount,
            "appliedFeeRate": applied_fee_rate,
        }
    )

    STATE["contentAccesses"].append(
        {
            "userId": buyer_id,
            "projectId": project_id,
            "transactionId": transaction_id,
        }
    )

    return {
        "transactionId": transaction_id,
        "projectId": project_id,
        "grossAmount": coin_amount,
        "appliedFeeRate": applied_fee_rate,
        "platformFeeAmount": platform_fee_amount,
        "netAmount": net_amount,
        "settlements": settlements,
    }


class PreviewHandler(BaseHTTPRequestHandler):
    def _read_json(self):
        length = int(self.headers.get("Content-Length", "0") or "0")
        if length == 0:
            return {}
        raw = self.rfile.read(length)
        return json.loads(raw.decode("utf-8"))

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)
        user_id = get_current_user_id(self)

        if path in ("/", "/creator-universe-homepage.html"):
            file_path = ROOT / "creator-universe-homepage.html"
            body = file_path.read_bytes()
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        if path == "/api/home":
            return json_response(self, HTTPStatus.OK, {"success": True, "data": get_home_data()})

        if path == "/api/creators":
            role = query.get("role", [None])[0]
            return json_response(self, HTTPStatus.OK, {"success": True, "data": get_creators(role)})

        if path == "/api/users/me/wallet":
            return json_response(self, HTTPStatus.OK, {"success": True, "data": get_wallet(user_id)})

        if path == "/api/projects/project-midnight-signal":
            return json_response(self, HTTPStatus.OK, {"success": True, "data": format_project_detail("project-midnight-signal", user_id)})

        if path == "/api/projects/project-midnight-signal/settlement-dashboard":
            return json_response(self, HTTPStatus.OK, {"success": True, "data": get_settlement_dashboard("project-midnight-signal", user_id)})

        if path == "/api/projects/project-midnight-signal/viewer":
            viewer = get_viewer("project-midnight-signal", user_id)
            if viewer is None:
                return json_response(self, HTTPStatus.FORBIDDEN, {"success": False, "message": "User does not have access to this project."})
            return json_response(self, HTTPStatus.OK, {"success": True, "data": viewer})

        return json_response(self, HTTPStatus.NOT_FOUND, {"success": False, "message": "Not found."})

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        user_id = get_current_user_id(self)

        if path == "/api/settlements/content-purchase":
            payload = self._read_json()
            project_id = payload.get("projectId")
            coin_amount = int(payload.get("coinAmount", 0))
            if project_id != "project-midnight-signal" or coin_amount <= 0:
                return json_response(self, HTTPStatus.UNPROCESSABLE_ENTITY, {"success": False, "message": "Invalid purchase payload."})
            try:
                result = purchase_content(project_id, user_id, coin_amount)
            except ValueError as error:
                return json_response(self, HTTPStatus.CONFLICT, {"success": False, "message": str(error)})
            return json_response(self, HTTPStatus.CREATED, {"success": True, "data": result})

        if path == "/api/debug/reset":
            global STATE
            STATE = build_initial_state()
            return json_response(self, HTTPStatus.OK, {"success": True, "data": {"reset": True}})

        return json_response(self, HTTPStatus.NOT_FOUND, {"success": False, "message": "Not found."})

    def log_message(self, format, *args):
        return


if __name__ == "__main__":
    server = ThreadingHTTPServer((HOST, PORT), PreviewHandler)
    print(f"Preview server running at http://{HOST}:{PORT}/creator-universe-homepage.html")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
