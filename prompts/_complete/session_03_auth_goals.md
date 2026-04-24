# Session 03: 사용자 인증 (소셜 로그인) & 목표 설정 API

> **세션 목표**: 소셜 로그인(Google·Kakao·Naver) 기반 인증과 목표 설정 CRUD를 구현한다.
> **예상 소요**: 2~2.5시간
> **브랜치**: `feat/사용자-인증-목표설정` (dev에서 분기)

---

## 작업 전 주입 필수

```
Read .claude/CLAUDE.md
Read .claude/rules/django.md
Read .claude/rules/clean_code.md
Read .claude/rules/project_conventions.md
```

---

## 꼭지 1: CustomUser 모델 & accounts 앱 뼈대

```
backend/apps/accounts/
├── __init__.py
├── admin.py
├── apps.py
├── models.py         # CustomUser
├── exceptions.py     # AccountNotFoundError, OnboardingAlreadyDoneError
├── serializers.py    # UserProfileSerializer, OnboardingSerializer
├── views.py          # ProfileView, OnboardingView
├── services.py       # complete_onboarding()
├── selectors.py      # get_user_by_id()
├── adapters.py       # NaverSocialAccountAdapter
├── urls.py
└── tests/
    ├── conftest.py
    └── test_services.py
```

**CustomUser 모델 핵심 필드**

```python
class SubscriptionPlan(models.TextChoices):
    FREE = "free", "무료"
    PLUS = "plus", "플러스"
    PRO = "pro", "프로"

class RiskTolerance(models.TextChoices):
    CONSERVATIVE = "conservative", "안정형"
    MODERATE = "moderate", "중립형"
    AGGRESSIVE = "aggressive", "공격형"

class CustomUser(AbstractUser):
    subscription_plan = models.CharField(max_length=10, default=SubscriptionPlan.FREE)
    risk_tolerance = models.CharField(max_length=15, default=RiskTolerance.MODERATE)
    onboarded_at = models.DateTimeField(null=True, blank=True)
    primary_provider = models.CharField(max_length=20, blank=True)  # google/kakao/naver
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

**주의**: `AUTH_USER_MODEL = "accounts.CustomUser"` 를 **마이그레이션 전** `settings/base.py`에 설정.

**완료 기준**
- [ ] `python manage.py check` 오류 없음
- [ ] `AUTH_USER_MODEL` 설정 확인

**커밋**
```
feat(accounts): CustomUser 모델 및 accounts 앱 뼈대 생성
```

---

## 꼭지 2: 소셜 로그인 설정 (django-allauth + dj-rest-auth)

**requirements/base.txt 추가**
```
django-allauth[socialaccount]==65.*
dj-rest-auth[with_social]==6.*
```

**settings/base.py 설정** — `django.md`의 소셜 로그인 settings 구성 섹션을 그대로 적용

**adapters.py** — `django.md`의 `NaverSocialAccountAdapter` 구현

**config/exception_handler.py** — `django.md`의 DRF 전역 예외 핸들러 구현

**urls.py 등록**

```python
# config/urls.py
urlpatterns = [
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/auth/", include("dj_rest_auth.urls")),
    path("api/v1/auth/registration/", include("dj_rest_auth.registration.urls")),
]
```

```python
# apps/accounts/urls.py
urlpatterns = [
    path("social/google/", GoogleLoginView.as_view(), name="google-login"),
    path("social/kakao/", KakaoLoginView.as_view(), name="kakao-login"),
    path("social/naver/", NaverLoginView.as_view(), name="naver-login"),
    path("profile/", ProfileView.as_view(), name="profile"),
    path("onboarding/", OnboardingView.as_view(), name="onboarding"),
]
```

**.env.example 추가**
```bash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
KAKAO_CLIENT_ID=
KAKAO_CLIENT_SECRET=
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
```

**완료 기준**
- [ ] `POST /api/v1/auth/social/google/` — `{"code": "..."}` 요청 시 JWT 응답 확인 (실제 code 없이 구조만 확인)
- [ ] `POST /api/v1/auth/token/refresh/` 동작 확인
- [ ] `GET /api/v1/auth/profile/` — 인증 헤더 없이 401 반환 확인
- [ ] Admin > Social Accounts 메뉴 확인

**커밋**
```
feat(accounts): 소셜 로그인 (Google·Kakao·Naver) django-allauth 설정
```

---

## 꼭지 3: 온보딩 API

소셜 로그인 완료 후 1회만 실행되는 사용자 설정.

**OnboardingSerializer 입력 필드**
```python
class OnboardingSerializer(serializers.Serializer):
    monthly_savings_goal = serializers.IntegerField(min_value=0)
    total_asset_range = serializers.ChoiceField(choices=["~5000", "5000~1억", "1억~"])
    housing_status = serializers.ChoiceField(choices=["전세", "월세", "자가"])
    preferred_region = serializers.CharField(max_length=50, required=False)
    risk_tolerance = serializers.ChoiceField(choices=RiskTolerance.values)
    learning_interests = serializers.ListField(
        child=serializers.CharField(), max_length=5, required=False
    )
```

**services.py**
```python
@transaction.atomic
def complete_onboarding(*, user: CustomUser, data: dict) -> CustomUser:
    """온보딩 설정을 저장하고 onboarded_at을 기록한다."""
```

**완료 기준**
- [ ] 최초 온보딩 → `onboarded_at` 저장 확인
- [ ] 재시도 → `409 Conflict` (`OnboardingAlreadyDoneError`) 반환 확인

**커밋**
```
feat(accounts): 온보딩 1회성 설정 API 구현
```

---

## 꼭지 4: Goal 모델 및 목표 CRUD API

```
backend/apps/goals/
├── __init__.py
├── admin.py
├── apps.py
├── models.py        # Goal
├── exceptions.py    # GoalNotFoundError, GoalPermissionError
├── serializers.py   # GoalCreateSerializer, GoalUpdateSerializer, GoalResponseSerializer
├── views.py         # GoalListCreateView, GoalDetailView
├── services.py      # create_goal(), update_goal_progress()
├── selectors.py     # get_user_goals(), get_active_goals()
├── urls.py
└── tests/
    └── test_services.py
```

**Goal 모델**
```python
class GoalCategory(models.TextChoices):
    FINANCIAL = "financial", "금융"
    HOUSING = "housing", "주거"
    LEARNING = "learning", "학습"
    ROUTINE = "routine", "루틴"

class Goal(models.Model):
    user = models.ForeignKey("accounts.CustomUser", on_delete=models.CASCADE, related_name="goals")
    category = models.CharField(max_length=10, choices=GoalCategory.choices)
    title = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    target_date = models.DateField(null=True, blank=True)
    target_amount = models.DecimalField(max_digits=12, decimal_places=0, null=True, blank=True)
    progress = models.FloatField(default=0.0)   # 0.0 ~ 1.0
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
```

**완료 기준**
- [ ] `POST /api/v1/goals/` 목표 생성 확인
- [ ] `GET /api/v1/goals/?category=financial` 필터링 확인
- [ ] 다른 사용자 목표 접근 → 403 (`GoalPermissionError`) 확인
- [ ] `make test` 통과

**커밋**
```
feat(goals): Goal 모델 및 목표 CRUD API 구현
```

---

## 세션 완료 후

```bash
git push origin feat/사용자-인증-목표설정
# PR: feat/사용자-인증-목표설정 → dev
# PR 제목: [feat] 소셜 로그인 & 목표 설정 API
mv prompts/session_03_auth_goals.md prompts/_complete/
```
