# backend/apps/accounts/adapters.py
"""소셜 로그인 커스텀 어댑터."""

from __future__ import annotations

import logging

from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.socialaccount.models import SocialLogin
from django.http import HttpRequest

logger = logging.getLogger(__name__)


class PatchedGoogleOAuth2Adapter:
    """dj_rest_auth + allauth 65.x 호환 패치 어댑터 믹스인.

    dj_rest_auth 7.x는 code 교환 시 adapter.did_fetch_access_token을 설정하지 않아
    allauth 65.x가 id_token 서명 검증을 시도하다 실패한다.
    코드 교환은 서버 간 TLS 채널에서 이루어지므로 OpenID Connect Core 1.0 spec 3.1.3.7에
    따라 서명 검증을 생략할 수 있다.
    """

    def complete_login(self, request: HttpRequest, app, token, **kwargs):
        """서버 측 code 교환임을 명시하고 상위 로직을 호출한다."""
        # dj_rest_auth는 get_access_token_data()를 거치지 않으므로 직접 플래그를 설정한다.
        self.did_fetch_access_token = True
        return super().complete_login(request, app, token, **kwargs)


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
