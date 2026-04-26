# backend/apps/accounts/tests/test_services.py
"""사용자 서비스 테스트."""

from __future__ import annotations

import pytest

from apps.accounts.exceptions import OnboardingAlreadyDoneError
from apps.accounts.models import CustomUser, RiskTolerance
from apps.accounts.services import complete_onboarding

ONBOARDING_DATA = {
    "monthly_savings_goal": 500000,
    "total_asset_range": "~5000",
    "housing_status": "월세",
    "risk_tolerance": RiskTolerance.MODERATE,
    "learning_interests": ["재테크", "독서"],
}


@pytest.mark.django_db
def test_complete_onboarding_sets_onboarded_at(user_fixture: CustomUser) -> None:
    """온보딩 완료 시 onboarded_at이 저장된다."""
    user = complete_onboarding(user=user_fixture, data=ONBOARDING_DATA)

    assert user.onboarded_at is not None
    assert user.risk_tolerance == RiskTolerance.MODERATE


@pytest.mark.django_db
def test_complete_onboarding_raises_if_already_done(onboarded_user_fixture: CustomUser) -> None:
    """이미 온보딩한 사용자가 재시도하면 OnboardingAlreadyDoneError가 발생한다."""
    with pytest.raises(OnboardingAlreadyDoneError):
        complete_onboarding(user=onboarded_user_fixture, data=ONBOARDING_DATA)
