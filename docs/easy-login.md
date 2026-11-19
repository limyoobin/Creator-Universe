# 이전 버전의 카카오·네이버·PASS 연동 기록

현재 서비스는 아이디·비밀번호로 가입한다. 기존에 등록한 패스키는 로그인에 사용할 수 있다. 신규 외부 로그인과 본인인증 요청은 서버에서 종료 처리하므로 아래 환경변수를 입력해도 개통되지 않는다. 다음은 이전 릴리스의 설정과 데이터 처리 기록이다.

## 카카오와 네이버 앱 등록

운영 서비스 URL은 `https://project-limyoobins-projects.vercel.app`이다. 브라우저 로그인 콜백은 Vercel 도메인에, 카카오 연결 해제 웹훅은 Render 도메인에 등록한다.

| 제공사 | 로그인 콜백 | Render 환경변수 |
| --- | --- | --- |
| 카카오 | `https://project-limyoobins-projects.vercel.app/auth/return/kakao` | `KAKAO_REST_API_KEY`, `KAKAO_CLIENT_SECRET`, `KAKAO_ADMIN_KEY` |
| 네이버 | `https://project-limyoobins-projects.vercel.app/auth/return/naver` | `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` |

1. **카카오**. 카카오디벨로퍼스에서 앱을 만들고 **카카오 로그인 → 사용 설정**을 켠다. **앱 → 플랫폼 키 → REST API 키**에서 표의 로그인 리다이렉트 URI를 등록하고 클라이언트 시크릿을 확인한다. 이 서비스는 앱별 회원번호만 사용한다. 이메일, 닉네임, 프로필 사진과 같은 추가 개인정보를 요청할 필요가 없다. [카카오 앱 관리](https://developers.kakao.com/console/app) · [로그인 설정](https://developers.kakao.com/docs/ko/kakaologin/prerequisite)
2. **카카오 연결 해제**. 앱의 대표 어드민 키에서 연결 해제 API 사용 권한을 확인하고 Render에 `KAKAO_ADMIN_KEY`로 입력한다. **카카오 로그인 → 연결 해제 웹훅**에서 POST 방식과 `https://creator-universe-api-7qfc.onrender.com/api/auth/easy/kakao/unlink-callback`을 등록한다. 사이트에서 탈퇴하면 서버가 카카오 연결 해제를 요청한다. 일시적인 카카오 장애 시에는 요청을 DB에 남겨 서버가 재시도한다. 사용자가 카카오에서 먼저 연결을 해제하면 웹훅이 해당 로그인 연결과 기존 서비스 세션을 제거한다. [카카오 연결 해제 API](https://developers.kakao.com/docs/ko/kakaologin/rest-api#unlink) · [연결 해제 웹훅](https://developers.kakao.com/docs/ko/kakaologin/callback)
3. **네이버**. 네이버 개발자센터에서 애플리케이션을 등록하고 사용 API로 **네이버 로그인**, 환경으로 **PC 웹**을 설정한다. 서비스 URL과 표의 Callback URL을 각각 입력한다. 기본 제공되는 이용자 식별자만 사용한다. 개발 상태에서 등록한 테스트 계정으로 신규 가입과 재로그인을 확인하고, 일반 회원에게 공개하기 위한 사전 검수를 신청한다. [애플리케이션 등록](https://developers.naver.com/apps/#/register) · [네이버 로그인 검수](https://developers.naver.com/docs/login/verify/verify.md)
4. Render Dashboard에서 Creator Universe **백엔드 Web Service → Environment → + Add Environment Variable**에 표의 이름과 값을 입력한 뒤 **Save and deploy**를 선택한다. `GET /api/auth/easy/providers`가 각 수단의 설정 여부를 반환한다. PC·모바일에서 동의, 취소 후 복귀, 재로그인까지 확인해야 실제 사용 가능 여부를 알 수 있다. [Render 환경변수](https://render.com/docs/configure-environment-variables)

## PASS와 통합인증서

카카오·네이버 로그인 버튼은 해당 플랫폼 계정으로 접속한다. 본인인증서를 사용하려면 포트원 V2 본인인증 채널이 필요하다. KG이니시스 통합인증의 인증창에서는 상점 계약에 따라 PASS, 카카오 인증서, 네이버 인증서 등을 고를 수 있다. 운영자는 채널 계약 시 **로그인에 사용할 CI 제공 여부와 이용 조건**을 확인한다. [포트원 본인인증](https://developers.portone.io/opi/ko/extra/identity-verification/readme-v2?v=v2) · [KG이니시스 통합인증](https://developers.portone.io/opi/ko/integration/pg/v2/inicis-unified-identity-verification)

| Render 변수 | 값 |
| --- | --- |
| `PORTONE_MODE` | 운영 채널 사용 시 `live` |
| `PORTONE_STORE_ID` | 포트원 상점 ID |
| `PORTONE_API_SECRET` | 같은 상점의 V2 API Secret |
| `PORTONE_IDENTITY_CHANNEL_KEY` | 운영 본인인증 채널 키 |
| `EASY_LOGIN_HMAC_SECRET` | 서비스 전용으로 생성한 임의 비밀값. 예를 들어 비밀번호 관리 도구로 32바이트 이상의 임의값을 생성해 입력한다. 같은 값을 배포·재기동·인스턴스 사이에서 유지한다. |
| `PORTONE_IDENTITY_REQUIRED` | `true`이면 카카오·네이버·패스키로 새로 가입할 때도 가입 본인확인을 거친다. PASS로 가입하면 로그인 단계에서 완료한 운영 본인인증을 사용한다. |

모바일 복귀 주소는 `https://project-limyoobins-projects.vercel.app/auth/return/pass`다. PASS 로그인은 운영 인증 건만 받는다. 포트원 테스트 채널은 별도 DB에서 가입 본인확인과 화면 복귀를 검증하는 데 사용할 수 있다. PASS 계정은 운영 상점 ID와 CI로 만든 HMAC으로 조회하므로 상점 또는 HMAC 비밀값을 변경하면 기존 회원이 같은 PASS로 로그인할 수 없다. 운영 HMAC 키를 변경할 필요가 있으면 기존 회원의 대체 로그인과 재연결 절차를 먼저 마련한다.

## 서버 동작 확인

| 수단 | 서버 요청과 처리 |
| --- | --- |
| 카카오 | `kauth.kakao.com/oauth/authorize`에서 승인 후 서버가 `kauth.kakao.com/oauth/token`으로 코드를 교환한다. S256 PKCE와 `kapi.kakao.com/v1/user/access_token_info`로 해당 앱의 회원번호를 확인한다. 탈퇴 시 `kapi.kakao.com/v1/user/unlink`를 호출한다. [카카오 REST API](https://developers.kakao.com/docs/ko/kakaologin/rest-api) · [카카오 인증 서버 구성](https://kauth.kakao.com/.well-known/openid-configuration) |
| 네이버 | `nid.naver.com/oauth2.0/authorize`에서 승인 후 서버가 `nid.naver.com/oauth2.0/token`으로 코드를 교환한다. `openapi.naver.com/v1/nid/me`의 이용자 식별자로 계정을 찾는다. [네이버 API 명세](https://developers.naver.com/docs/login/api/api.md) |
| PASS | 서버가 `api.portone.io/identity-verifications/{id}`에서 상점 범위, 인증 건 ID, 채널, LIVE 상태, 인증 완료 시각을 검증하고 `verifiedCustomer.ci`의 HMAC을 만든다. CI를 제공하지 않는 채널에서는 PASS 로그인을 개설할 수 없다. |

새 로그인 요청은 15분 동안 유효하다. 모바일에서는 인증을 시작한 브라우저로 복귀한다. 다른 브라우저로 전환했거나 탭을 닫았다면 사이트에서 다시 시작한다. 별도 비밀번호나 제공사 프로필에 포함된 이메일로 연결을 추정하지 않는다.

로컬 회귀 검증은 마이그레이션을 적용한 임시 PostgreSQL과 모의 제공사를 사용한다. `PORTONE_TEST_DATABASE_URL`을 `127.0.0.1`의 `cu_portone_qa` 테스트 계정으로 설정한 뒤 `npm run test:easy-login:postgres`를 실행한다. 실가맹 계정의 승인과 실명 인증은 해당 상점의 운영키 설정 후 직접 검증한다.
