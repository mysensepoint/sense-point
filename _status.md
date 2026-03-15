# 센스포인트 프로젝트 상태

> 최종 갱신: 2026-03-15
> 이 파일은 작업 완료 시 자동 갱신됩니다. 개인비서 워크스페이스에서 디스패치 전 참조용.

## 현재 단계

**피그마 디자인 적용 진행 중** — 기민 디자인 수령 완료, 다크→라이트 테마 전환 작업 중

## 모듈별 진행률

| 모듈 | 진행률 | 상태 |
|------|--------|------|
| 디자인 시스템 | 95% | 피그마 디자인 토큰 적용 완료 (variables.css), 일부 CSS 파일 하드코딩 색상 잔존 |
| 공통 헤더 | 100% | SVG 로고, 햄버거 메뉴, 스크롤 backdrop blur — 피그마 일치 |
| 공통 메뉴 패널 | 100% | 360px 우측 슬라이드, Login/Signup 영문, nav 호버 — 피그마 일치 |
| 랜딩 페이지 | 95% | 피그마 레이아웃 적용 (좌정렬, CTA 버튼, 네비게이션), 물방울 파문 유지 |
| Sense Makers 목록 | 100% | 인터뷰 목록 페이지 구현 완료 |
| Sense Makers 상세 | 90% | 기능 완료, 하드코딩 색상 교체 필요 |
| Square | 80% | 기능 완료, 하드코딩 색상 교체 필요 |
| My Note | 85% | 기능 완료, 하드코딩 색상 교체 필요 |
| 인증 시스템 | 95% | Firebase 프로젝트 설정만 남음 |
| 반응형 | 85% | 전 페이지 기본 대응 |

## Sense Makers 철학

> **사람이 사람에게 전하고자 한 감동의 기록**

- 인터뷰 컨텐츠 전용. 일상 속 메이커스들의 손길과 감동을 담는다.
- 감각 영역: Space(공간) / Sound(소리) / Flavor(맛·향) / Craft(손끝) / Light(빛·시선)
- 목표: 컨텐츠를 읽으며 자연스럽게 자기 성찰로 이어지도록 호흡 조절·생각 유도 설계

## 최근 변경

- 2026-03-15: 피그마 디자인 적용 시작 — 다크→라이트 테마 전환
  - `css/variables.css` 전면 교체: Neutral/Gray/Accent 팔레트, 시맨틱 토큰, GyeonggiBatang 폰트
  - 헤더: SVG 로고(img/logo-horizontal.svg, 146x24), 24x24 햄버거, 스크롤 backdrop blur
  - 메뉴 패널: 360px 고정, Login/Signup 영문, nav 아이템 hover underline(accent-hover)
  - 랜딩: 좌정렬 레이아웃, CTA/Nav 버튼 hover → Border 색상, 슬라이드 구조 변경
  - 전체 HTML(8개): 로고 `<img>` 전환, 회원가입 버튼 추가
  - 피그마 Components 페이지 기반 hover/active 상태 정확 반영
- 2026-03-03: 뜨개질(Knitting) 기능을 `knitting/` 독립 웹앱으로 분리
- 2026-03-02: 뜨개질 튜토리얼 50개 데이터 적용, 뜨개질 시스템 구현
- 2026-02-26: Sense Makers 철학/비전 정의 → 목록 페이지 전면 재설계
- 2026-02-26: SP-002 완료 — 물결 효과 개선, 캐러셀 정리
- 2026-02-26: My Note 페이지 명세 대폭 확장 + 기능 구현 완료
- 2026-02-24: Square, Sense Makers, 반응형 보완

## 대기 중인 작업

- 하드코딩 색상 교체: `css/my-note.css`, `css/sense-makers.css`, `css/square.css`, `css/sense-makers-list.css`, `css/knitting-guide.css`, `css/knitting-sim.css`에 잔존하는 이전 gold accent `rgba(200,169,110,...)` 및 다크 테마 색상을 디자인 토큰으로 교체
- 페이지별 피그마 디자인 적용: Sense Makers 상세, Square, My Note, 인증 페이지

## 주요 파일 구조

- `index.html`, `sense-makers-list.html`, `sense-makers.html`, `square.html`, `my-note.html`, `login.html`, `signup.html`
- `css/`: variables.css, common.css, landing.css, sense-makers-list.css, sense-makers.css, square.css, my-note.css, auth.css, responsive.css
- `js/`: common.js, landing.js, sense-makers-list.js, sense-makers.js, square.js, my-note.js, firebase-config.js, auth.js
- `knitting/`: 뜨개질 독립 웹앱 (index.html, js/core/, js/ui/, css/)
- `knitting/legacy/`: 레거시 보관 (guide.html, simulation.html, examples/) — 기능구현 미사용
- `docs/`: 기획 문서 (Obsidian 볼트) — 철학/비전, 페이지 명세, 컴포넌트 명세, 디자인 시스템, 구현 현황
