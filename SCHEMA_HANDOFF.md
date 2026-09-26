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
FastAPI    → Spring   { "emotion": "JOY", "intensity": 4, "feedback": "..." }
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
  "feedback": "오랜만에 친구들과 함께 화창한 날씨 속에서 즐거운 여행을 보내셨군요. ..."
}
```

| 필드 | 타입 | 설명 | 제약 |
|---|---|---|---|
| emotion | string | 감정 코드 | `JOY` / `SADNESS` / `ANGER` / `ANXIETY` / `CALM` 중 하나 |
| intensity | integer | 감정 강도 | 1~5 |
| feedback | string | 일기 원문 기반 공감 피드백 (한국어) | 2~3문장, 최대 300자 |

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

`DIARIES : EMOTION_ANALYSES = 1:N` — 일기 하나에 분석 결과를 여러 개 쌓을 수 있는 구조라, 나중에 다른 모델(경량 분류 모델 등)을 붙여 Gemini와 비교하는 확장에도 그대로 쓸 수 있음.

## 5. 민정한테 확인/결정 필요한 것

- **`source` 컬럼 값** — 분석을 어떤 엔진이 만들었는지 기록하는 용도. 모델 버전은 자주 바뀔 수 있어서 `"GEMINI"` 같은 고정 값 추천 (버전까지 기록하고 싶으면 `"gemini-3.5-flash-lite"`).
- **여러 분석 결과 중 "대표" 구분** — 화면에 보여줄 결과를 `created_at` 최신 1건으로 할지, 별도 플래그를 둘지.
- **호출 방식(동기/비동기)** — Gemini 호출이라 응답에 보통 수 초 걸림. 일기 저장 API 안에서 동기로 기다릴지, 저장 후 별도 분석 요청(`POST /api/diaries/{diaryId}/analyses`)으로 분리할지 (분리하는 쪽이 자연스러워 보임). 어느 쪽이든 읽기 타임아웃은 30초 정도 권장.
- **분석 실패 시 처리** — 502를 받았을 때 실패 이력을 남길지, 성공한 분석만 저장할지.

## 6. 참고사항

- **Java HttpClient 사용 시 HTTP/1.1 고정 필요** — Java 기본 `HttpClient`는 HTTP/2 업그레이드(h2c)를 시도하는데, uvicorn이 이때 요청 본문을 못 읽어서 정상 요청인데도 422가 나옴. `HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1)`로 고정하면 해결됨 (Spring에서 JDK HttpClient 기반으로 호출할 때도 같은 증상이 나올 수 있음).
- **연동 테스트 코드** — `src/test/java/com/aidiary/integration/GeminiAnalyzeIntegrationTest.java` (서버가 떠 있으면 실제 호출 검증, 안 떠 있으면 자동으로 건너뜀. 다시 돌릴 땐 `./gradlew cleanTest test`).
- **Gemini 무료 티어 제한** — 모델마다 다름. `gemini-3.7-flash`는 일일 20회로 매우 낮았고, `gemini-3.5-flash-lite`는 테스트 중 한도에 걸린 적 없음. 동시 요청이 많아지면 502(한도 초과)가 날 수 있음.
- **프롬프트 인젝션** — 방어 프롬프트와 `feedback` 300자 제한을 적용했고 실제 공격 문구로 검증함(시스템 프롬프트 유출 재현 안 됨). 그래도 `feedback`은 AI가 생성한 자유 텍스트이므로 화면에는 일반 텍스트로만 출력하고 HTML로 렌더링하지 말 것.
- **코드 저장소** — https://github.com/chanwoong00/ai-diary (Public)

## 다음 단계

1. ~~**찬웅** — `POST /analyze` FastAPI 서버 구현~~ **완료**
2. ~~**찬웅** — 민정 제안 계약(`content` / 영문 emotion 코드 / `intensity`) 반영 + Java 호출 검증~~ **완료**
3. ~~**민정** — 회원가입/로그인 API~~ **완료 (PR #1)**, JWT + 일기 CRUD **PR #3 진행 중**
4. **민정 — 지금 할 것**
   - `emotion_analyses` 테이블 + `POST /api/diaries/{diaryId}/analyses` 구현 (내부에서 FastAPI `POST /analyze` 호출, 위 1~3번 참고)
   - 위 5번의 결정 항목 정해서 공유
   - `main`에서 `feature/기능명` 브랜치 따서 작업 → PR 흐름 유지
