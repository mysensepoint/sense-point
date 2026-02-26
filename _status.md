# 센스포인트 프로젝트 상태

> 최종 갱신: 2026-02-26
> 이 파일은 작업 완료 시 자동 갱신됩니다. 개인비서 워크스페이스에서 디스패치 전 참조용.

## 현재 단계

기능 구현 거의 완료 → **디자이너(기민) 피그마 작업 대기 중**

## 모듈별 진행률

| 모듈 | 진행률 | 상태 |
|------|--------|------|
| 랜딩 페이지 | 95% | 터치 스와이프·자동 슬라이드 구현 완료 (SP-001), 디자인 적용 대기 |
| Sense Makers | 95% | 디자인 적용 대기 |
| Square | 80% | 디자인 적용 대기 |
| My Note | 90% | 기획+기능 완료, 디자인 적용 대기 |
| 인증 시스템 | 95% | Firebase 프로젝트 설정만 남음 |
| 반응형 | 85% | 전 페이지 기본 대응 |

## 최근 변경

- 2026-02-26: SP-002 완료 — 랜딩 배너 물결 효과 개선 (동심원 → 단일 물방울 파문) + 캐러셀 버튼 전용으로 단순화
- 2026-02-26: SP-001 완료 — 터치 스와이프 + 자동 슬라이드 구현 (랜딩 90%→95%)
- 2026-02-26: My Note 페이지 명세 대폭 확장 + 기능 구현 완료 (30%→90%)
- 2026-02-24: Square, Sense Makers, 반응형 보완

## 대기 중인 작업 (_tasks/pending/)

- 없음

## 주요 파일 구조

- `index.html`, `sense-makers.html`, `square.html`, `my-note.html`, `login.html`, `signup.html`
- `css/`: variables.css, common.css, landing.css, sense-makers.css, square.css, my-note.css, auth.css, responsive.css
- `js/`: common.js, landing.js, sense-makers.js, square.js, my-note.js, firebase-config.js
- `docs/`: 기획 문서 (Obsidian 볼트)
