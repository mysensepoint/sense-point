# SensePoint

> 감각의 교차점을 탐험하며 인사이트를 발견하는 웹 플랫폼

다크 테마 기반의 웹 플랫폼 프로토타입입니다.
디자이너가 Figma에서 디자인하기 편하도록, **오토레이아웃(Flexbox) 기반으로 기능을 선행 구현**한 상태입니다.

---

## 실행 방법

별도 빌드가 필요 없는 정적 파일 프로젝트입니다.

```bash
# 방법 1: VS Code Live Server 확장 사용 (추천)
# index.html 우클릭 → Open with Live Server

# 방법 2: npx serve
npx serve .
```

또는 `index.html`을 브라우저에서 직접 열어도 됩니다.

---

## 프로젝트 구조

```
sense-point/
├── index.html              # 랜딩 페이지 (메인 진입점)
├── sense-makers.html       # Sense Makers (아티클 + 메모)
├── square.html             # Square (커뮤니티 광장)
├── my-note.html            # My Note (개인 노트 관리)
├── login.html              # 로그인
├── signup.html             # 회원가입
│
├── css/
│   ├── variables.css       # 🎨 디자인 토큰 (색상, 폰트, 간격 등)
│   ├── reset.css           # CSS 리셋
│   ├── common.css          # 공통 (헤더, 메뉴 오버레이)
│   ├── landing.css         # 랜딩 페이지 스타일
│   ├── sense-makers.css    # Sense Makers 스타일
│   ├── square.css          # Square 스타일
│   ├── my-note.css         # My Note 스타일
│   ├── auth.css            # 로그인/회원가입 스타일
│   └── responsive.css      # 반응형 미디어 쿼리
│
├── js/
│   ├── firebase-config.js  # Firebase 초기화
│   ├── common.js           # 메뉴 토글, 인증 상태 관리
│   ├── landing.js          # 배너 캐러셀, 물결 효과
│   ├── sense-makers.js     # 메모 시스템 (CRUD, 하이라이트)
│   ├── square.js           # 커뮤니티 피드
│   ├── my-note.js          # 노트 관리
│   └── auth.js             # 회원가입, 로그인, 이메일 인증
│
└── docs/                   # 📚 기획/디자인 명세 (Obsidian 볼트)
    ├── 00 HOME.md
    ├── 01-project-overview/ # 프로젝트 개요, 브레이크포인트
    ├── 02-page-specs/       # 페이지별 상세 명세
    ├── 03-common-components/# 공통 컴포넌트 명세
    ├── 04-design-system/    # 색상, 타이포, 간격 정의
    ├── 05-implementation/   # 구현 현황 체크리스트
    └── 피그마 디자인 요청서.md # ⭐ 디자이너용 가이드
```

---

## 페이지 구성

| 페이지 | 파일 | 상태 | 설명 |
|--------|------|------|------|
| **랜딩** | `index.html` | ✅ 기능 완료 | 배너 캐러셀 + 물결 효과 |
| **Sense Makers** | `sense-makers.html` | ✅ 기능 완료 | 아티클 읽기 + 메모 사이드바 |
| **Square** | `square.html` | ✅ 기능 완료 | 커뮤니티 메모 피드 |
| **My Note** | `my-note.html` | 🔧 기획 중 | 개인 메모/노트 관리 |
| **로그인** | `login.html` | ✅ 기능 완료 | 이메일/비밀번호 |
| **회원가입** | `signup.html` | ✅ 기능 완료 | 이메일 인증 포함 |

---

## 디자인 시스템 요약

> 상세 정의: [`docs/04-design-system/`](docs/04-design-system/) 참고

### 색상

| 역할 | 값 | 미리보기 |
|------|-----|---------|
| 메인 배경 | `#0a0a0a` | ![#0a0a0a](https://via.placeholder.com/12/0a0a0a/0a0a0a.png) |
| 보조 배경 | `#111111` | ![#111111](https://via.placeholder.com/12/111111/111111.png) |
| 카드 배경 | `#1a1a1a` | ![#1a1a1a](https://via.placeholder.com/12/1a1a1a/1a1a1a.png) |
| 메인 텍스트 | `#f5f5f5` | ![#f5f5f5](https://via.placeholder.com/12/f5f5f5/f5f5f5.png) |
| 보조 텍스트 | `#999999` | ![#999999](https://via.placeholder.com/12/999999/999999.png) |
| 액센트 (골드) | `#c8a96e` | ![#c8a96e](https://via.placeholder.com/12/c8a96e/c8a96e.png) |
| 구분선 | `#2a2a2a` | ![#2a2a2a](https://via.placeholder.com/12/2a2a2a/2a2a2a.png) |

### 폰트

| 용도 | 폰트 |
|------|------|
| 본문 | **Pretendard** |
| 영문 디스플레이 | **Playfair Display** |
| 한글 보조 | Noto Sans KR |

### 텍스트 크기

| 이름 | 크기 | 용도 |
|------|------|------|
| xs | 12px | 캡션, 메타 |
| sm | 14px | 설명, 사이드바 |
| base | 16px | 본문 |
| lg | 18px | 본문 강조 |
| xl | 20px | 소제목 |
| 2xl | 24px | 섹션 제목 |
| 3xl | 32px | 페이지 제목 |
| 4xl | 40px | 배너 타이틀 |
| 5xl | 56px | 히어로 |

### 레이아웃

```
┌──────────────────── 100vw ────────────────────┐
│              헤더 (10vh, 고정)                  │
├───────────────────────────────────────────────┤
│            메인 컨텐츠 (90vh)                   │
└───────────────────────────────────────────────┘
```

### 반응형

| 디바이스 | 너비 | 메뉴 너비 | Sense Makers |
|---------|------|----------|-------------|
| PC | > 1024px | 25% | 75% / 25% |
| 태블릿 | 768~1024px | 35% | 70% / 30% |
| 모바일 | < 768px | 80% | 단일 컬럼 |

---

## 주요 기능

### 랜딩 페이지
- **배너 캐러셀** — 마우스 드래그 / 터치 스와이프 / 화살표 이동
- **물결 효과** — 마우스/터치에 반응하는 Canvas 애니메이션
- **고정 헤더** — 상단 10% 고정 (로고 + 메뉴 버튼)

### Sense Makers
- **아티클 뷰** — 좌측 75% (카테고리 태그, 제목, 본문)
- **메모 사이드바** — 우측 25%
- **메모 생성** — 텍스트 드래그 → 우클릭 → "Memo" / "+" 버튼
- **하이라이트** — 옅은 노란색(기본) ↔ 진한 노란색(선택 중)
- **드래그 정렬** — 접힌 코너로 메모 순서 변경

### Square
- **메모 피드** — 시간순 정렬 (최신 상단)
- **필터** — 모두 보기 / 친구 메모 보기
- **작성자 사이드바** — 메모 클릭 시 해당 작성자 모든 메모 표시
- **메모에 메모하기** — 답글 기능

### 메뉴 오버레이
- 우측에서 슬라이드 인 (PC 25%, 태블릿 35%, 모바일 80%)
- My Note / Sense Makers / Square 네비게이션
- 로그인/로그아웃 토글

---

## 기술 스택

| 항목 | 선택 |
|------|------|
| 마크업 | HTML5 |
| 스타일 | CSS3 (Flexbox, Custom Properties) |
| 인터랙션 | Vanilla JavaScript |
| 인증/DB | Firebase (Auth + Firestore) |
| 폰트 | Pretendard, Playfair Display, Noto Sans KR |
| 빌드 | 없음 (정적 파일) |

---

## 🎨 디자이너 협업 가이드

> **이 섹션은 기민이를 위한 내용입니다.**

### 피그마 디자인 요청서

👉 [`docs/피그마 디자인 요청서.md`](docs/피그마%20디자인%20요청서.md)

위 문서에 아래 내용이 모두 정리되어 있어:
- 디자인할 페이지 목록 + 우선순위
- 반응형 프레임 크기 (1440px / 768px / 375px)
- 현재 색상/폰트/간격 전체 수치 (변경 가능)
- 페이지별 와이어프레임
- 공통 컴포넌트 스펙 (헤더, 메뉴, 메모 블럭)
- 피그마 작업 가이드라인 (Auto Layout, 네이밍, 스타일 등록)
- 디자인 전달 방법

### 기획 문서

```
docs/
├── 01-project-overview/     # 프로젝트 개요, 브레이크포인트
├── 02-page-specs/           # 페이지별 상세 명세
│   ├── 랜딩 페이지.md
│   ├── Sense Makers.md
│   ├── My Note.md
│   └── Square.md
├── 03-common-components/    # 공통 컴포넌트
│   ├── 헤더.md
│   ├── 메뉴 오버레이.md
│   └── 메모 시스템.md
└── 04-design-system/        # 디자인 토큰
    ├── 색상 팔레트.md
    ├── 타이포그래피.md
    └── 간격과 레이아웃.md
```

### 현재 화면 확인 방법

1. 이 리포를 클론하고
2. `index.html`을 브라우저에서 열면 현재 구현된 화면을 확인할 수 있어

```bash
git clone <this-repo-url>
cd sense-point
# index.html을 브라우저에서 열기
```

### 디자인 완료 후 흐름

1. 피그마에서 디자인 완성
2. **스크린샷 + 변경된 수치**를 전달
3. Cursor AI로 코드에 바로 적용
4. 브라우저에서 확인 후 미세 조정
