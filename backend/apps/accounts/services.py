# backend/apps/accounts/services.py
"""사용자 비즈니스 로직."""

from __future__ import annotations

import logging

from django.db import transaction
from django.utils import timezone

from apps.accounts.exceptions import OnboardingAlreadyDoneError
from apps.accounts.models import CustomUser, RiskTolerance

logger = logging.getLogger(__name__)


@transaction.atomic
def complete_onboarding(*, user: CustomUser, data: dict) -> CustomUser:
    """온보딩 설정을 저장하고 onboarded_at을 기록한다.

    최초 1회만 실행 가능하다. 이미 온보딩이 완료된 사용자가 재시도하면
    OnboardingAlreadyDoneError를 발생시킨다.

    Args:
        user: 온보딩을 완료할 사용자.
        data: 온보딩 입력 데이터 (validated_data).

    Returns:
        업데이트된 CustomUser 인스턴스.

    Raises:
        OnboardingAlreadyDoneError: 이미 온보딩을 완료한 경우.
    """
    if user.onboarded_at is not None:
        raise OnboardingAlreadyDoneError("이미 온보딩을 완료했습니다.")

    risk_tolerance = data.get("risk_tolerance", RiskTolerance.MODERATE)
    user.risk_tolerance = risk_tolerance
    user.onboarded_at = timezone.now()
    user.save(update_fields=["risk_tolerance", "onboarded_at", "updated_at"])

    logger.info("온보딩 완료: user_id=%d", user.pk)
    return user
