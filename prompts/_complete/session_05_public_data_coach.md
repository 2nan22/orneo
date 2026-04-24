# Session 05: 공공 데이터 연동 & Gemma 로컬 코치

> **세션 목표**: 실거래가·DART·K-MOOC API 연동과 Gemma 코치 라우터를 구현한다.
> **예상 소요**: 2~2.5시간
> **작업량 기준**: 외부 API 클라이언트 3개 + FastAPI 라우터
> **브랜치**: `feat/공공데이터-gemma-코치` (dev에서 분기)

---

## 작업 전 주입 필수

```
Read .claude/CLAUDE.md
Read .claude/rules/clean_code.md
Read .claude/skills/public_data_integration.md
Read .claude/agents/public_data_fetcher.md
Read .claude/rules/git_workflow.md, .claude/memory/feedback_git_workflow.md
```

---

## 꼭지 1: 공공 데이터 베이스 클라이언트 & 국토부 실거래가

`skills/public_data_integration.md`의 패턴을 그대로 적용한다.

```
ai_service/services/public_data/
├── __init__.py
├── base.py      # PublicDataClient 추상 베이스
└── molit.py     # MolitApartmentClient
```

FastAPI 라우터:
```
GET /public-data/apartments/transactions
    ?lawd_cd=11200&deal_ymd=202503
```

응답에 반드시 포함:
- `source`: "국토교통부 아파트매매 실거래가 자료"
- `disclaimer`: "이 데이터는 교육·참고 목적이며 투자 권유가 아닙니다."

**완료 기준**
- [ ] 성동구(11200) 실거래가 조회 성공
- [ ] 거래금액 쉼표 제거 후 int 변환 정상 동작
- [ ] API 키 미설정 시 503 대신 명확한 오류 메시지

**커밋**
```
feat(public-data): 국토부 아파트 실거래가 API 클라이언트 구현
```

---

## 꼭지 2: OPEN DART & K-MOOC API

```
ai_service/services/public_data/
├── dart.py      # DartDisclosureClient
└── kmooc.py     # KmoocCourseClient
```

**DART**: 기업명 → 고유번호 조회 → 최근 공시 목록
```
GET /public-data/dart/disclosures
    ?corp_name=삼성전자&bgn_de=20250101&end_de=20250331
```

**K-MOOC**: 키워드 기반 강좌 검색
```
GET /public-data/kmooc/courses
    ?keyword=데이터분석
```

**완료 기준**
- [ ] 삼성전자 최근 공시 3개 조회 확인
- [ ] "데이터 분석" 강좌 목록 조회 확인
- [ ] 존재하지 않는 기업명 → `404` 반환

**커밋**
```
feat(public-data): OPEN DART, K-MOOC API 클라이언트 구현
```

---

## 꼭지 3: Gemma 로컬 코치 라우터 (Ollama 기반)

**MVP 전략**: 맥북 로컬 Ollama 사용 (`http://host.docker.internal:11434`)

```
ai_service/
├── routers/coach.py
├── services/gemma_client.py
└── schemas/coach.py
```

**schemas/coach.py**
```python
class CoachRequest(BaseModel):
    journal_text: str
    context: dict = {}   # 사용자 목표·감정 컨텍스트

class CoachResponse(BaseModel):
    summary: str
    actions: list[str]   # 오늘 할 행동 1~3개
    model_used: str      # "gemma4:e2b" 또는 "fallback"
```

**Fallback 전략**: Ollama 미설치/미응답 시 규칙 기반 응답 반환 (503 아님)

```python
FALLBACK_SUMMARY = "오늘 일지를 잘 작성하셨습니다. 내일도 꾸준히 기록해보세요."
FALLBACK_ACTIONS = ["목표 점검하기", "실거래가 확인하기", "K-MOOC 강좌 둘러보기"]
```

**완료 기준**
- [ ] Ollama 실행 중일 때 실제 Gemma 응답 확인
- [ ] Ollama 중단 상태에서도 fallback 응답 정상 반환 (503 아님)
- [ ] `POST /coach/summarize` Django Celery 태스크에서 호출 확인

**커밋**
```
feat(ai-service): Gemma 로컬 코치 라우터 및 Ollama 클라이언트 구현
```

---

## 세션 완료 후

```bash
git push origin feat/공공데이터-gemma-코치
# PR: feat/공공데이터-gemma-코치 → dev
# PR 제목: [feat] 공공 데이터 연동 & Gemma 로컬 코치

mv prompts/session_05_public_data_coach.md prompts/_complete/
```
