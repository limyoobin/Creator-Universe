# 포트원 V2 가입 인증과 코인 결제

창작자·독자 가입 시 본인인증과 로그인한 회원의 카드 단건 결제를 지원한다. 인증과 결제는 개별 채널이다. 카드 충전 상품은 1,000원, 3,000원, 5,000원이고 각각 같은 수의 코인을 지급한다. 구독 자동 청구, 계좌 출금, 창작자 현금 송금은 이 연동의 대상이 아니다.

## 가맹점 연결

1. 포트원 상점에서 카드 결제용 PG 채널과 회원가입 본인인증 채널을 준비한다. 카카오·네이버·PASS 등의 인증서를 선택하는 통합인증은 KG이니시스 통합인증 채널에 해당한다. 실제 제공 수단과 계약 조건은 신청할 채널에서 확인한다. [국내 결제 연동](https://developers.portone.io/opi/ko/integration/start/v2/readme?v=v2) · [본인인증](https://developers.portone.io/opi/ko/extra/identity-verification/readme-v2?v=v2)
2. 테스트 서버와 별도 DB에서 먼저 아래 값을 설정한다. 비밀키는 Render의 해당 **백엔드 서비스 → Environment**에 입력한다. API 응답과 정적 프런트엔드에는 비밀키를 넣지 않는다. [포트원 연동 정보](https://developers.portone.io/opi/ko/console/guide/channel-manage?v=v2)

| Render 환경변수 | 입력값 |
| --- | --- |
| `PORTONE_MODE` | 검증 시 `test`, 실가맹 개시 시 `live` |
| `PORTONE_STORE_ID` | 포트원 상점 ID |
| `PORTONE_API_SECRET` | 해당 상점의 V2 API Secret |
| `PORTONE_PAYMENT_CHANNEL_KEY` | 해당 환경의 카드 결제 채널 키 |
| `PORTONE_WEBHOOK_SECRET` | 해당 웹훅의 서명 검증용 시크릿 |
| `PORTONE_IDENTITY_CHANNEL_KEY` | 해당 환경의 본인인증 채널 키 |
| `PORTONE_IDENTITY_REQUIRED` | `true`이면 카카오·네이버·패스키로 새로 가입할 때 본인확인을 추가한다. PASS로 가입하면 운영 본인인증을 그대로 사용한다. |
| `EASY_LOGIN_HMAC_SECRET` | PASS 로그인 식별값을 만드는 서비스 전용 비밀값. 운영 채널과 32바이트 이상의 안정적인 임의값이 필요하다. [PASS 로그인 설정](easy-login.md) |

3. 포트원에서 웹훅 버전 **2024-04-25**를 선택하고 승인, 취소, 부분 취소, 실패 이벤트를 등록한다. 운영 수신 주소는 `https://creator-universe-api-7qfc.onrender.com/api/payments/portone/webhook`이다. 테스트 상점은 테스트 서버 주소를 사용한다. PG에 등록하는 사이트 도메인은 실제 독자가 여는 프런트엔드 도메인이다. [웹훅 연동](https://developers.portone.io/opi/ko/integration/webhook/readme-v2)
4. 서버 배포 후 `GET /api/integrations/portone`의 `paymentReady`와 `identityReady`로 설정 유무를 확인한다. 이 값은 실제 가맹 심사나 키 유효성까지 확인하는 상태가 아니다. 테스트 채널에서 PC·모바일 가입, 결제창 취소, 승인 후 복귀 및 웹훅 재전송을 확인한다. 실가맹 전환 후에는 운영자가 실제 거래 한 건의 승인, 지갑 적립, PG 취소, 잔액 반영을 확인한다.

카드 결제 개통을 위해 운영자는 포트원 관리자 콘솔에서 전자결제를 신청하고 디지털 콘텐츠·코인 판매 방식을 PG에 설명한 뒤 가맹 심사를 진행한다. 선택한 PG가 요구하는 사업자 정보·사이트·상품 가격·정책을 제출하고 계약 결과와 운영 채널 발급을 확인한다. 운영 Store ID, API Secret, 결제 채널 키와 웹훅 시크릿을 운영 Render에 입력하고 `PORTONE_MODE=live`로 배포한다. 결제 채널만 연결해서 카드 충전을 개시할 수 있다. PASS 개통은 본인인증 채널로 별도 진행한다. [포트원 전자결제 신청](https://developers.portone.io/opi/ko/console/guide/reg?v=v2) · [결제 연동 준비](https://developers.portone.io/opi/ko/integration/start/v2/readme?v=v2)

## 거래 처리와 문의 대응

- 서버가 승인 금액을 정하고 주문마다 고유 번호를 발급한다. 브라우저 복귀와 서명된 웹훅 모두 포트원 거래를 다시 조회한다. 승인 금액·상점·채널·고객·통화·결제수단이 주문과 일치해야 적립한다. 같은 주문을 재조회하거나 웹훅이 중복 도착해도 다시 적립하지 않는다.
- 테스트 승인은 주문 상태로 기록하고 사용 가능한 잔액에는 적립하지 않는다. 운영 취소는 PG에서 확인된 누적 취소액을 기준으로 지갑을 조정한다. 이미 코인을 사용한 뒤 승인이 취소되면 잔액이 음수가 될 수 있다. 고객센터는 주문번호로 PG 내역과 지갑 원장을 대조하며 카드번호는 요청하지 않는다.
- 가입 본인확인은 인증 시각과 테스트·운영 구분을 기록한다. PASS 간편 로그인을 선택한 회원에게는 재로그인을 위해 상점 ID와 CI로 생성한 HMAC을 연결한다. 서비스 DB에는 이름·전화번호·주민등록번호·CI와 DI 원문을 저장하지 않는다.
- 상점 미연결 상태에서는 패스키로 가입할 수 있으며 카드 충전은 준비 중으로 표시된다. 기존 계정과 과거 지갑에는 데모 시절의 잔액·거래가 있을 수 있으므로, 판매 개시 전에 해당 잔액과 환불 대상 거래를 대조한다.
- 카드 충전 개시와 카탈로그 작품 판매 개시는 독립적이다. 기존 데모 작품은 기본적으로 판매가 꺼져 있다. 오디오 작품을 판매하려면 운영자가 실제 프로젝트의 소유자, 정산 참여자, 가격, 게시된 유료 음원(2화 이후)을 확인하고 DB의 해당 `Project.storefrontSalesEnabled`를 `true`로 설정한다. 구매자의 작품 상세 화면에서 음원과 대본을 열 수 있다.
