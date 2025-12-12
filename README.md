
# TURN UP GOLF STUDIO

**Turn Up Golf Studio**는 골프 스튜디오의 회원, 레슨, 예약, 결제를 통합 관리하는 종합 웹 애플리케이션입니다.
행동 신경 과학 기반의 PSMT(심리/멘탈) 분석 및 관리 기능을 포함할 수 있도록 확장 가능한 구조를 가지고 있습니다.

## 주요 기능

*   **회원 관리**: 회원 등록, 수정, 삭제 및 이용권 만료 관리
*   **대시보드**: 관리자, 회원, 강사, 멘탈 코치 등 역할별 맞춤형 대시보드 제공
*   **예약 시스템**: 레슨, 멘탈 코칭, 연습실(수련의 방) 예약 및 상태 관리 (출석/결석)
*   **레슨 일지**: 강사가 작성하고 회원이 확인하는 멀티미디어(영상/사진) 레슨 일지
*   **알림 센터**: 예약, 결제, 공지사항 등에 대한 실시간 알림
*   **결제 시스템**: 카카오페이 연동 (시뮬레이션 모드 지원)

## 시작하기 (Getting Started)

이 프로젝트를 로컬 환경에서 실행하려면 다음 단계가 필요합니다.

### 1. 설치

프로젝트 의존성을 설치합니다.

```bash
npm install
```

### 2. 환경 변수 설정

루트 디렉토리에 `.env` 파일을 생성하고 다음 키를 설정해야 합니다.

*   **GEMINI_API_KEY**: Google Gemini API 키 (AI 텍스트 생성 기능에 사용)
    *   API 키 발급: [Google AI Studio](https://aistudio.google.com/)

`.env` 파일 예시:
```env
GEMINI_API_KEY=your_actual_api_key_here
```

### 3. 카카오페이 설정 (선택 사항)

`kakaoConfig.ts` 파일에서 `KAKAO_JAVASCRIPT_KEY`를 설정하여 실제 카카오페이 연동을 테스트할 수 있습니다. 설정하지 않을 경우 시뮬레이션 모드로 작동합니다.

### 4. 실행

개발 서버를 실행합니다.

```bash
npm run dev
```

브라우저에서 `http://localhost:3000`으로 접속하여 확인합니다.

## 프로젝트 구조

*   `/components`: UI 컴포넌트 (대시보드, 공통 UI, 기능별 모듈)
*   `/contexts`: 전역 상태 관리 (인증, 토스트 메시지, 확인 모달)
*   `/hooks`: 커스텀 React Hooks
*   `/services`: API 및 데이터 처리 로직 (Firebase/Mock API)
*   `/types`: TypeScript 타입 정의

## 배포

프로젝트 빌드:

```bash
npm run build
```

빌드된 결과물은 `dist` 폴더에 생성됩니다.

---
© 2024 Turn Up Golf Studio. All rights reserved.
