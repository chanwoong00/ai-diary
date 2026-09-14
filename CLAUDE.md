# 감정분석 기반 AI 다이어리 — Gemini 연동 파트 (찬웅)

## 이 문서의 범위
이 리포지토리(폴더)는 **찬웅 담당 파트만** 다룬다: 일기 텍스트를 Gemini Flash API로 감정분석 +
AI 피드백을 생성하는 기능. 백엔드(회원/일기 CRUD/DB)는 민정이 별도로 개발 중이며 아직 스택이
확정되지 않았다 — 이 리포는 백엔드와 독립적으로 실행 가능해야 한다.

## 지금 단계: 실험(스크립트) 단계
서버(FastAPI)로 감싸기 전에, 프롬프트와 JSON 응답 품질부터 스크립트로 검증한다.
목표: "일기 텍스트를 넣으면 감정 라벨 + 피드백이 안정적인 JSON으로 나온다"를 확인하는 것.
서버화는 이 단계가 끝난 뒤 다음 단계로 진행한다 (아래 "다음 단계" 참고).

## 확정된 사항
- **LLM**: Gemini Flash (무료 티어 사용). 분당 5~15회, 일 최대 1,000회 제한이 있으니 테스트 시 참고.
- **Python SDK**: `google-genai` 사용 (구 `google-generativeai`는 폐지됨, 절대 쓰지 말 것)
  ```bash
  pip install google-genai
  ```
- **모델명**: 정확한 최신 Flash 모델 ID는 https://ai.google.dev/gemini-api/docs/models 에서
  확인 후 사용 (버전이 자주 바뀌므로 하드코딩 전에 최신 목록 확인 필수)
- **API 키**: 반드시 `.env` 파일 + `.gitignore`로 관리. 절대 코드/커밋에 노출 금지.
- **감정 라벨 (잠정 5종, 조정 가능)**: 기쁨 / 슬픔 / 분노 / 불안 / 평온

## AI 응답 JSON 스키마 (잠정)
```json
{
  "emotion": "기쁨",
  "score": 4,
  "feedback": "오늘 하루 뿌듯했겠다. 그 성취감을 좀 더 오래 느껴봐도 좋을 것 같아."
}
```
- `emotion`: 위 5종 라벨 중 하나
- `score`: 감정 강도 1~5 (정수)
- `feedback`: 일기 원문을 참고한 공감 피드백 문장 (한국어, 2~3문장 이내)

이 스키마는 민정의 DB 컬럼 설계와 직결되므로 **바꾸게 되면 민정에게 바로 공유할 것**.

## 프롬프트 설계 가이드
- system/instruction으로 "반드시 위 JSON 형식으로만 응답, 다른 텍스트 없이"를 명시
- `response_mime_type: "application/json"` 옵션(SDK에서 지원 시) 활용해 JSON 강제
- temperature는 낮게(0.3~0.5 권장) — 라벨 일관성이 중요하므로 창의성보다 안정성 우선
- 감정 라벨이 5종 밖으로 새지 않는지, JSON 파싱이 매번 성공하는지를 우선 검증 지표로 삼을 것

## 폴더 구조 (제안)
```
/gemini-experiment
  ├── .env                  # GEMINI_API_KEY=xxx (커밋 금지)
  ├── .gitignore             # .env, __pycache__ 등 포함
  ├── requirements.txt
  ├── prompt.py               # 프롬프트 템플릿 정의
  ├── analyze.py               # 일기 텍스트 -> Gemini 호출 -> JSON 반환 함수
  └── test_samples.py           # 다양한 감정의 샘플 일기로 반복 테스트
```

## 다음 단계 (이 단계 완료 후)
1. `analyze.py`의 함수를 FastAPI 엔드포인트(`POST /analyze`)로 감싸기
2. 백엔드(민정 파트)에서 이 엔드포인트를 호출하는 형태로 연동
3. [확장, 시간 남으면] 공개데이터+직접 라벨링 데이터로 경량 분류 모델 파인튜닝 후
   Gemini 결과와 성능(정확도, 속도) 비교

## Git 규칙
- `main`에서 `feature/기능명` 브랜치로 작업
- 작업 완료 후 PR 생성, 간단히라도 리뷰 후 merge
- 커밋 메시지 접두어: `feat:`, `fix:`, `docs:` 등

## 아직 정해지지 않은 것 (참고용, 이 파트와 무관)
- 백엔드 스택(Spring Boot / Node.js), DB(MySQL 등), 배포 플랫폼 — 민정과 별도 협의 중
- LLM 호출 방식(동기/비동기)은 백엔드 연동 시점에 함께 결정 예정
