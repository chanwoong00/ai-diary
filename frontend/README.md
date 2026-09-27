# AI Diary Frontend

감정 분석 기반 AI 다이어리의 React 프론트엔드입니다.

## 실행 방법

Node.js 20 이상이 필요합니다.

```bash
cd frontend
npm install
npm run dev
```

실행 후 터미널에 표시된 주소(기본값: `http://localhost:5173`)로 접속합니다.

## 빌드 확인

```bash
npm run build
```

## 현재 상태

- 모바일 화면을 우선으로 한 반응형 UI
- 홈, 일기 목록, 일기 작성, 상세, 감정 분석 결과 화면
- 현재는 목업 데이터 기반
- 이후 Spring API(`http://localhost:8080`)와 로그인·일기 CRUD를 연결할 예정

## Git 규칙

`node_modules`, `dist`는 자동 생성 폴더이므로 Git에 올리지 않습니다.
