# backend/apps/accounts/adapters.py
"""소셜 로그인 커스텀 어댑터."""

from __future__ import annotations

import logging

from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.socialaccount.models import SocialLogin
from django.http import HttpRequest

logger = logging.getLogger(__name__)


class NaverSocialAccountAdapter(DefaultSocialAccountAdapter):
    """Naver 소셜 계정 어댑터.

    Naver API 응답의 중첩 구조('response' 키)를 처리한다.
    """

    def populate_user(
        self,
        request: HttpRequest,
        sociallogin: SocialLogin,
        data: dict,
    ) -> object:
        """Naver 응답에서 사용자 정보를 추출한다.

        Args:
            request: HTTP 요청 객체.
            sociallogin: 소셜 로그인 인스턴스.
            data: Naver API 응답 데이터.

        Returns:
            사용자 인스턴스.
        """
        naver_response = data.get("response", data)
        user = super().populate_user(request, sociallogin, naver_response)
        logger.debug("Naver 사용자 정보 파싱 완료")
        return user
