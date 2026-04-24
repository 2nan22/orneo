# backend/apps/accounts/urls.py
"""사용자 인증 URL 라우팅."""

from __future__ import annotations

from django.urls import path

from apps.accounts.views import OnboardingView, ProfileView

try:
    from dj_rest_auth.registration.views import SocialLoginView
    from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
    from allauth.socialaccount.providers.kakao.views import KakaoOAuth2Adapter
    from allauth.socialaccount.providers.naver.views import NaverOAuth2Adapter
    from dj_rest_auth.registration.views import SocialLoginView

    class GoogleLoginView(SocialLoginView):
        adapter_class = GoogleOAuth2Adapter

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
