# backend/apps/accounts/selectors.py
"""사용자 읽기 전용 쿼리."""

from __future__ import annotations

from apps.accounts.exceptions import AccountNotFoundError
from apps.accounts.models import CustomUser


def get_user_by_id(*, user_id: int) -> CustomUser:
    """사용자를 ID로 조회한다.

    Args:
        user_id: 조회할 사용자 ID.

    Returns:
        CustomUser 인스턴스.

    Raises:
        AccountNotFoundError: 사용자가 존재하지 않는 경우.
    """
    try:
        return CustomUser.objects.get(pk=user_id)
    except CustomUser.DoesNotExist:
        raise AccountNotFoundError(f"사용자를 찾을 수 없습니다: id={user_id}")
