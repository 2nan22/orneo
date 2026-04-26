# backend/apps/accounts/views.py
"""사용자 인증 뷰."""

from __future__ import annotations

import logging

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.serializers import (
    OnboardingSerializer,
    UserProfileSerializer,
    UserProfileUpdateSerializer,
)
from apps.accounts.services import complete_onboarding

logger = logging.getLogger(__name__)


class ProfileView(APIView):
    """내 프로필 조회 및 수정."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        """인증된 사용자의 프로필을 반환한다."""
        serializer = UserProfileSerializer(request.user)
        return Response({"status": "success", "data": serializer.data})

    def patch(self, request: Request) -> Response:
        """사용자 프로필을 부분 수정한다.

        수정 가능 필드: risk_tolerance, preferred_region,
        preferred_region_code, learning_interests.
        """
        serializer = UserProfileUpdateSerializer(
            request.user, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        logger.info("프로필 수정: user_id=%d fields=%s", request.user.pk, list(request.data.keys()))

        return Response({
            "status": "success",
            "data": UserProfileSerializer(request.user).data,
        })


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


class OnboardingResetView(APIView):
    """온보딩 재설정 — onboarded_at 초기화."""

    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        """온보딩 완료 상태를 초기화하여 다시 온보딩을 진행할 수 있게 한다.

        사용자 데이터(목표, 일지, 리포트)는 유지된다.
        onboarded_at만 null로 리셋한다.

        Returns:
            업데이트된 사용자 프로필.
        """
        user = request.user
        user.onboarded_at = None
        user.save(update_fields=["onboarded_at", "updated_at"])

        logger.info("온보딩 재설정: user_id=%d", user.pk)
        return Response(
            {"status": "success", "data": UserProfileSerializer(user).data},
        )
