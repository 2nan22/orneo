# backend/apps/accounts/urls.py
"""사용자 인증 URL 라우팅."""

from __future__ import annotations

import environ
from django.urls import path

from apps.accounts.views import OnboardingView, ProfileView

env = environ.Env()

# 프론트엔드 앱 URL (Google OAuth callback_url 생성에 사용)
_APP_URL = env("APP_URL", default="http://localhost:3000")
_GOOGLE_CALLBACK_URL = f"{_APP_URL}/api/auth/callback/google"

try:
    from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
    from allauth.socialaccount.providers.kakao.views import KakaoOAuth2Adapter
    from allauth.socialaccount.providers.naver.views import NaverOAuth2Adapter
    from allauth.socialaccount.providers.oauth2.client import OAuth2Client
    from dj_rest_auth.registration.views import SocialLoginView

    from apps.accounts.adapters import PatchedGoogleOAuth2Adapter

    class _PatchedGoogleAdapter(PatchedGoogleOAuth2Adapter, GoogleOAuth2Adapter):
        """dj_rest_auth + allauth 65.x 호환 Google 어댑터."""

    class GoogleLoginView(SocialLoginView):
        adapter_class = _PatchedGoogleAdapter
        client_class = OAuth2Client
        callback_url = _GOOGLE_CALLBACK_URL

    class KakaoLoginView(SocialLoginView):
        adapter_class = KakaoOAuth2Adapter

    class NaverLoginView(SocialLoginView):
        adapter_class = NaverOAuth2Adapter

    social_urlpatterns = [
        path("social/google/", GoogleLoginView.as_view(), name="google-login"),
        path("social/kakao/", KakaoLoginView.as_view(), name="kakao-login"),
        path("social/naver/", NaverLoginView.as_view(), name="naver-login"),
    ]
except ImportError:
    social_urlpatterns = []

urlpatterns = [
    *social_urlpatterns,
    path("profile/", ProfileView.as_view(), name="profile"),
    path("onboarding/", OnboardingView.as_view(), name="onboarding"),
]
