# 감정분석 연동 스펙 (v3 — 민정 제안 반영: emotion 영문 코드 + intensity)

Gemini 감정분석 서버(`gemini-experiment/app.py`, FastAPI)의 호출 방법과 요청/응답 계약 정리.
민정이 제안한 응답 형식(`emotion` 영문 코드, `intensity`, `feedback`)으로 확정했고, 서버에 반영해서 실제 HTTP 호출(curl, Java)로 검증함.

## 1. 호출 방법 (로컬 개발 기준)

| 항목 | 값 |
|---|---|
| 서버 주소 | `http://127.0.0.1:8000` (Spring 기본 포트 8080과 안 겹침) |
| 경로 / 메서드 | `POST /analyze` |
| Content-Type | `application/json; charset=utf-8` |
| 자동 API 문서 | `http://127.0.0.1:8000/docs` (Swagger UI, 서버 띄운 상태에서) |

서버 실행 (Python 필요, 최초 1회 `pip install -r requirements.txt` + `gemini-experiment/.env`에 `GEMINI_API_KEY` 설정):

```
cd gemini-experiment
python -m uvicorn app:app --port 8000
```

전체 흐름:

```
클라이언트 → Spring   POST /api/diaries/{diaryId}/analyses
Spring     → FastAPI  POST http://127.0.0.1:8000/analyze   { "content": "<일기 본문>" }
FastAPI    → Spring   { "emotion": "JOY", "intensity": 4, "scores": {...}, "feedback": "..." }
Spring     → DB       emotion_analyses에 저장 (source는 Spring이 채움)
```

## 2. 요청 / 응답 JSON (확정)

**요청**

```json
{ "content": "오늘 오랜만에 친구들이랑 여행 갔다. 날씨도 좋고 다 같이 웃으면서 즐거운 시간을 보냈다." }
```

**응답 (200)**

```json
{
  "emotion": "JOY",
  "intensity": 5,
  "scores": { "JOY": 5, "SADNESS": 0, "ANGER": 0, "ANXIETY": 0, "CALM": 1 },
  "feedback": "작성자님은 오늘 원하던 회사로부터 합격 통보를 받으면서 매우 강한 기쁨의 감정을 느끼셨습니다. 오랜 기간 바라고 준비해 온 목표를 성취했다는 사실이 큰 뿌듯함과 행복으로 다이어리에 고스란히 담겨 있습니다. ..."
}
```

| 필드 | 타입 | 설명 | 제약 |
|---|---|---|---|
| emotion | string | 대표 감정 코드 (5종 중 가장 두드러진 것) | `JOY` / `SADNESS` / `ANGER` / `ANXIETY` / `CALM` 중 하나 |
| intensity | integer | 대표 감정(`emotion`)을 느낀 강도 | 1~5 |
| scores | object | **(2026-10-02 신규)** 5종 감정 각각을 따로 평가한 강도. 막대그래프용 | 5개 키 전부 필수, 각각 0~5 정수. `scores[emotion]`은 `intensity`와 같은 값 |
| feedback | string | **(2026-09-30 변경)** 일기 원문을 근거로 "왜 이런 감정을 느꼈는지" 설명하는 글 (한국어) | 4~6문장, 최대 700자 (예전: 2~3문장·공감 위주·최대 300자) |

**2026-09-30 변경 이유**: 단순 위로/공감이 아니라 "일기 속 어떤 상황 때문에 이 감정을 느꼈는지"를 구체적으로 설명해주는 게 목적에 더 맞는다는 판단으로 프롬프트와 길이 제한을 변경함. `feedback` DB 컬럼은 이미 `TEXT` 타입이라 길이 변경으로 인한 스키마 수정은 불필요.

**2026-10-02 추가 이유**: `emotion`/`intensity` 하나만으로는 "일기에 감정이 섞여 있을 때" 표현이 안 됨 (예: 감기+친구 문제로 살짝 화남+카페에서 여유+내일 출근 걱정이 섞인 하루를 "평온 3" 하나로만 보여주면 애매함). 화면에 5개 감정을 막대그래프로 보여주기 위해 `scores`를 추가함. **`emotion`/`intensity`는 그대로 유지** — 기존에 만든 코드(엔티티, 저장 로직, 목록/상세 화면)는 안 고쳐도 되고, `scores`만 추가로 받아서 쓰면 됨. DB에 저장하려면 `EMOTION_ANALYSES`에 컬럼을 추가하거나(5개 tinyint 컬럼, 또는 JSON 문자열 1개 컬럼) 당장 안 써도 됨 — 상세 화면에서만 쓰고 저장은 안 해도 그만.

emotion 코드 ↔ 한글 라벨 (화면 표시용):

| 코드 | 한글 |
|---|---|
| `JOY` | 기쁨 |
| `SADNESS` | 슬픔 |
| `ANGER` | 분노 |
| `ANXIETY` | 불안 |
| `CALM` | 평온 |

감정 라벨 5종은 "잠정"이라 조정될 수 있고, 바뀌면 바로 공유 예정.

## 3. 에러 응답

에러 body는 `{"detail": ...}` 형태.

| 상태 코드 | 의미 | Spring 쪽 처리 제안 |
|---|---|---|
| 200 | 성공 | 응답 3개 필드를 그대로 저장 |
| 400 | `content`가 공백만 있음 | 요청 문제 — 재시도 불필요 |
| 422 | `content` 누락/빈 문자열/필드명 오타 | 요청 문제 — 재시도 불필요 |
| 500 | 서버 설정 문제 (예: Gemini API 키 없음) | 재시도 불필요, 찬웅한테 알림 |
| 502 | Gemini 분석 실패 (무료 한도 초과, 일시 장애, 응답 형식 이상 등) | 재시도 가능. 계속 실패하면 분석 없이 일기만 저장하는 방식 고려 |

## 4. DB 매핑 (민정 ERD `EMOTION_ANALYSES` 기준)

| 컬럼 | 채우는 값 |
|---|---|
| id | auto |
| diary_id | 경로 변수 `{diaryId}` |
| source | Spring이 직접 채움 (응답에 없음) — 아래 5번 참고 |
| emotion | 응답 `emotion` 코드 그대로 (`varchar(30)` OK) |
| intensity | 응답 `intensity` 그대로 (`tinyint`, 1~5) |
| feedback | 응답 `feedback` 그대로 (`text`) |
| created_at | 저장 시각 |
| (선택) scores | 응답 `scores` — 막대그래프 표시용. DB에 안 남겨도 되고(상세 화면 보여줄 때만 쓰고 버림), 남기려면 5개 tinyint 컬럼이나 JSON 문자열 1개 컬럼으로 |

`DIARIES : EMOTION_ANALYSES = 1:N` — 일기 하나에 분석 결과를 여러 개 쌓을 수 있는 구조라, 나중에 다른 모델(경량 분류 모델 등)을 붙여 Gemini와 비교하는 확장에도 그대로 쓸 수 있음.

## 5. 결정 현황

- **`source` 컬럼 값** — **결정됨**: `"GEMINI"` 고정 (PR #5).
- **호출 방식(동기/비동기)** — **결정됨**: 일기 저장과 분리된 `POST /api/diaries/{diaryId}/analyses`에서 Spring이 FastAPI를 동기 호출 (연결 5초 / 읽기 30초 타임아웃).
- **분석 실패 시 처리** — **결정됨**: FastAPI가 오류를 주거나 응답 형식이 이상하거나 서버에 연결이 안 되면 502 `GEMINI_ANALYSIS_FAILED`로 응답하고, 실패 이력은 저장하지 않음 (성공한 분석만 저장).
- **여러 분석 결과 중 "대표" 구분** — **결정됨**: `created_at` 기준 최신 1건. 별도 플래그 컬럼 없이 조회 시 최신 행 하나만 가져오면 됨. 예전 분석 행은 지우지 않고 DB에 남겨둠(화면엔 안 보이지만 나중에 필요하면 조회 가능).
- **일기 수정 기능 자체** — **보류**: 민정 제안("일기를 보통 수정하나? 못 하게 하는 게 낫지 않나")으로 지금은 만들지 않고 나중에 추가하기로 함. 만약 나중에 추가하게 되면: 수정 시 감정분석 재실행, 기존 분석 행은 삭제하지 않고 새로 추가 (위 "대표 = 최신 1건" 규칙과 자연스럽게 맞물림 — 수정할 때마다 감정 카드가 최신 내용 기준으로 자동 갱신됨). 이 부분은 이미 정해뒀으니 나중에 다시 논의할 필요 없음.

## 6. 참고사항

- **Java HttpClient 사용 시 HTTP/1.1 고정 필요** — Java 기본 `HttpClient`는 HTTP/2 업그레이드(h2c)를 시도하는데, uvicorn이 이때 요청 본문을 못 읽어서 정상 요청인데도 422가 나옴. `HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1)`로 고정하면 해결됨 (Spring에서 JDK HttpClient 기반으로 호출할 때도 같은 증상이 나올 수 있음).
- **연동 테스트 코드** — `src/test/java/com/aidiary/integration/GeminiAnalyzeIntegrationTest.java` (서버가 떠 있으면 실제 호출 검증, 안 떠 있으면 자동으로 건너뜀. 다시 돌릴 땐 `./gradlew cleanTest test`).
- **Gemini 무료 티어 제한** — 모델마다 다름. `gemini-3.7-flash`는 일일 20회로 매우 낮았고, `gemini-3.5-flash-lite`는 테스트 중 한도에 걸린 적 없음. 동시 요청이 많아지면 502(한도 초과)가 날 수 있음.
- **프롬프트 인젝션** — 방어 프롬프트와 `feedback` 300자 제한을 적용했고 실제 공격 문구로 검증함(시스템 프롬프트 유출 재현 안 됨). 그래도 `feedback`은 AI가 생성한 자유 텍스트이므로 화면에는 일반 텍스트로만 출력하고 HTML로 렌더링하지 말 것.
- **코드 저장소** — https://github.com/chanwoong00/ai-diary (Public)

## 다음 단계

1. ~~**찬웅** — `POST /analyze` FastAPI 서버 구현~~ **완료**
2. ~~**찬웅** — 민정 제안 계약(`content` / 영문 emotion 코드 / `intensity`) 반영 + Java 호출 검증~~ **완료**
3. ~~**민정** — 회원가입/로그인 API~~ **완료 (PR #1)**, ~~JWT + 일기 CRUD~~ **완료 (PR #3)**
4. ~~**민정** — `emotion_analyses` + `POST /api/diaries/{diaryId}/analyses` 구현 (내부에서 FastAPI `POST /analyze` 호출)~~ **완료 (PR #5)** — `GeminiClient`로 실제 FastAPI를 호출해 한글 일기 응답, 400/서버 다운 처리까지 검증함
5. ~~**민정** — 프론트엔드 UI 초안~~ **완료 (PR #4)** — `npm run build` 및 모바일 뷰포트 렌더링 검증함
6. ~~**민정** — API 클라이언트(`client.ts`)를 화면(`App.tsx`)에 연결~~ **PR #8 진행 중** — 목록/상세/로그인은 실제 API에 잘 연결됨. **버그: 홈 화면(`recentDiaries`)이 아직 mock 데이터(`initialDiaries`) 그대로임.** `setDiaries`를 호출하는 곳이 없어서 로그인해도 홈에는 가짜 일기 3개가 계속 보임 — `realDiaries`로 교체 필요.
7. ~~**찬웅** — 감정 5종 각각의 점수(`scores`) 추가~~ **완료** — 막대그래프용. 기존 `emotion`/`intensity`는 안 바뀌었으니 민정 쪽 기존 코드는 그대로 두면 됨.
8. **민정 — 지금 할 것**
   - 위 6번 홈 화면 버그 수정
   - PR #8에 `scores` 필드 반영 — `GeminiAnalyzeResponse`(Java)에 `scores` 필드 추가, 화면에서 막대그래프로 표시 (DB 저장 여부는 선택, 위 4번 참고)
   - MySQL 포함 전체 흐름(로그인 → 일기 작성 → `POST /api/diaries/{diaryId}/analyses` → 저장 확인)을 로컬에서 한 번 검증
   - `main`에서 `feature/기능명` 브랜치 따서 작업 → PR 흐름 유지
