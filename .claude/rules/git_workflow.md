# Rule: Git 워크플로우

## 브랜치 전략

```
main        ← 운영 배포 브랜치 (직접 push 금지)
  └── dev   ← 개발 통합 브랜치
        ├── feat/onboarding-goals
        ├── feat/dashboard-api
        ├── fix/molit-parse-error
        └── chore/docker-compose-setup
```

### 규칙

- `main`: 운영 배포 브랜치. **직접 push 절대 금지**. `dev`에서 PR로만 병합.
- `dev`: 개발 통합 브랜치. 기능 단위로 feature 브랜치에서 PR 병합.
- `feat/*`: 새로운 기능 개발
- `fix/*`: 버그 수정
- `refactor/*`: 리팩터링 (기능 변경 없음)
- `chore/*`: 빌드·설정·의존성 등 비즈니스 로직 외 변경
- `docs/*`: 문서 변경

---

## 전체 Git 흐름 (main까지)

```
1. dev에서 feature 브랜치 생성
   git checkout dev && git pull origin dev
   git checkout -b feat/journal-api

2. 꼭지 단위로 작업 & 커밋 (세션 내 반복)
   git add .
   git commit -m "feat(journal): 일지 생성 API 구현"
   git commit -m "feat(journal): 복기 API 구현"
   ...

3. feature → dev PR (세션 완료 시)
   git push origin feat/journal-api
   ↓
   PR: feat/journal-api → dev
   병합 방식: Merge Commit (--no-ff)  ← 브랜치 토폴로지 보존

4. dev에서 통합 테스트
   docker compose up -d && pytest

5. dev → main PR (기능 완성 단위)
   ↓
   PR: dev → main
   병합 방식: Merge Commit (--no-ff)  ← 배포 이력 유지
   태그: git tag v0.1.0

6. main 배포
```

### main 병합 기준 (언제 dev → main PR을 여는가)

main은 **세션 단위가 아니라 기능 단위**로 병합한다.
아래 기준 중 하나를 충족할 때 dev → main PR을 생성한다.

| 마일스톤 | main 병합 기준 |
|---------|-------------|
| M1 — 인프라 완성 | Session 01 완료 후 (Docker + 뼈대) |
| M2 — 백엔드 MVP | Session 02~04 완료 후 (인증·일지·공공데이터·리포트) |
| M3 — 프론트 MVP | Session 05~06 완료 후 (전체 UI 연동) |
| M4 — 이후 | 기능 단위로 판단 |

---

## 브랜치 생성 규칙

```bash
# dev에서 분기
git checkout dev
git pull origin dev
git checkout -b feat/journal-api
```

브랜치명 규칙:
- **영어만** 사용, 소문자 + 하이픈
- 예: `feat/life-capital-score`, `fix/dart-api-timeout`, `chore/postgres-healthcheck`

---

## 커밋 메시지 컨벤션 (Conventional Commits)

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Type

| Type | 용도 |
|------|------|
| `feat` | 새 기능 |
| `fix` | 버그 수정 |
| `refactor` | 리팩터링 |
| `test` | 테스트 추가/수정 |
| `docs` | 문서 변경 |
| `chore` | 빌드·설정 변경 |
| `style` | 코드 포맷팅 (로직 변경 없음) |
| `perf` | 성능 개선 |

### 예시

```
feat(journal): 의사결정 일지 생성 API 추가

- POST /api/v1/journals/ 엔드포인트 구현
- Gemma 로컬 코치와 연동하여 일지 요약 자동 생성
- 관련 테스트 코드 포함

Closes #12
```

```
fix(public-data): 국토부 API 응답 파싱 오류 수정

API 응답의 거래금액 필드에 쉼표가 포함된 경우 int 변환 실패하는 버그 수정.
```

### 규칙

- subject: 50자 이내, 현재형, 마침표 없음
- body: 72자 줄바꿈, **무엇을·왜** 변경했는지 설명
- WIP 커밋은 PR 올리기 전 `git rebase -i`로 정리하고 push (--no-ff 머지이므로 개별 커밋이 dev 히스토리에 그대로 남는다)

---

## PR(Pull Request) 규칙

### 제목 형식

```
[feat] 의사결정 일지 CRUD API
[fix] 실거래가 파싱 오류 수정
[chore] Docker Compose dev 환경 구성
```

### PR 템플릿 (.github/PULL_REQUEST_TEMPLATE.md)

```markdown
## 개요
<!-- 이 PR이 해결하는 문제와 변경 내용을 간략히 설명하세요 -->

## 변경 사항
- [ ] 항목 1
- [ ] 항목 2

## 테스트
- [ ] 단위 테스트 추가/통과
- [ ] 로컬 Docker 환경에서 동작 확인

## 체크리스트
- [ ] Google Style Docstring 작성
- [ ] Type Hinting 적용
- [ ] `logging` 모듈 사용 (print 없음)
- [ ] 환경변수 하드코딩 없음
- [ ] `.env.example` 업데이트 (신규 환경변수 추가 시)
```

### 병합 방식 요약

| PR 방향 | 병합 방식 | 이유 |
|---------|---------|------|
| `feat/* → dev` | **Merge Commit (--no-ff)** | 브랜치 토폴로지 보존, git graph에서 어떤 브랜치의 변경인지 식별 가능 |
| `dev → main` | **Merge Commit (--no-ff)** | 배포 시점·버전 이력 명확히 유지 |

> **GitHub에서 설정하는 법**: Repository Settings → General → Pull Requests
> - `Allow merge commits` ✅ 체크
> - `Allow squash merging` ❌ 해제
> - `Allow rebase merging` ❌ 해제
> 
> 이렇게 하면 PR 머지 버튼이 "Create a merge commit"만 남아 실수를 방지할 수 있다.

---

## 세션 작업 흐름 (Claude Code 기준)

```
세션 시작
  ↓
rules, CLAUDE.md, prompts/session_XX.md 주입
  ↓
꼭지 1 작업 → 완료 기준 확인 → 커밋
  ↓
꼭지 2 작업 → 완료 기준 확인 → 커밋
  ↓
꼭지 3 작업 → 완료 기준 확인 → 커밋
  ↓
(필요 시) git rebase -i 로 WIP 커밋 정리
  ↓
git push origin feat/english-branch-name
PR 생성 (feat/* → dev) — Merge Commit (--no-ff)
  ↓
prompts/_complete/ 로 파일 이동
  ↓
세션 종료

[기능 완성 마일스톤 도달 시]
  ↓
dev 통합 테스트 통과
PR 생성 (dev → main) + 버전 태그
```
