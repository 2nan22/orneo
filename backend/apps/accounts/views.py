# backend/apps/accounts/views.py
"""사용자 인증 뷰."""

from __future__ import annotations

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.serializers import OnboardingSerializer, UserProfileSerializer
from apps.accounts.services import complete_onboarding


class ProfileView(APIView):
    """내 프로필 조회."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        """인증된 사용자의 프로필을 반환한다."""
        serializer = UserProfileSerializer(request.user)
        return Response({"status": "success", "data": serializer.data})


class OnboardingView(APIView):
    """온보딩 설정 (최초 1회)."""

    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        """온보딩 설정을 저장한다."""
        serializer = OnboardingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = complete_onboarding(user=request.user, data=serializer.validated_data)
        return Response(
            {"status": "success", "data": UserProfileSerializer(user).data},
            status=status.HTTP_201_CREATED,
        )
