# backend/apps/journal/views.py
"""의사결정 일지 뷰."""

from __future__ import annotations

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

import logging

from apps.journal.selectors import get_user_journals
from apps.journal.serializers import (
    DecisionScenarioInlineSerializer,
    JournalCreateSerializer,
    JournalResponseSerializer,
    JournalReviewSerializer,
)
from apps.journal.services import (
    create_journal,
    generate_scenarios_for_entry,
    get_journal_for_user,
    mark_reviewed,
)

logger = logging.getLogger(__name__)


class JournalListCreateView(APIView):
    """일지 목록 조회 및 생성."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        """사용자의 일지 목록을 반환한다."""
        category = request.query_params.get("category")
        journals = get_user_journals(user_id=request.user.pk, category=category)
        serializer = JournalResponseSerializer(journals, many=True)
        return Response({"status": "success", "data": serializer.data})

    def post(self, request: Request) -> Response:
        """새 일지를 생성한다."""
        serializer = JournalCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        entry = create_journal(user=request.user, **serializer.validated_data)
        return Response(
            {"status": "success", "data": JournalResponseSerializer(entry).data},
            status=status.HTTP_201_CREATED,
        )


class JournalDetailView(APIView):
    """일지 상세 조회."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, pk: int) -> Response:
        """일지 상세를 반환한다."""
        entry = get_journal_for_user(journal_id=pk, user=request.user)
        return Response({"status": "success", "data": JournalResponseSerializer(entry).data})


class JournalReviewView(APIView):
    """일지 복기 메모 작성."""

    permission_classes = [IsAuthenticated]

    def patch(self, request: Request, pk: int) -> Response:
        """복기 메모를 저장한다."""
        serializer = JournalReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        entry = mark_reviewed(
            journal_id=pk,
            user=request.user,
            review_note=serializer.validated_data["review_note"],
        )
        return Response({"status": "success", "data": JournalResponseSerializer(entry).data})


class JournalScenariosView(APIView):
    """의사결정 시나리오 온디맨드 생성."""

    permission_classes = [IsAuthenticated]

    def post(self, request: Request, pk: int) -> Response:
        """시나리오를 즉시 생성하거나 기존 시나리오를 반환한다.

        Celery 워커 없이도 호출 즉시 AI 서비스를 통해 생성한다.
        AI 서비스 불가 시 fallback 시나리오를 반환한다.
        """
        entry = get_journal_for_user(journal_id=pk, user=request.user)
        scenario = generate_scenarios_for_entry(entry=entry)
        logger.info("시나리오 요청: journal_id=%d user_id=%d", pk, request.user.pk)
        return Response(
            {"status": "success", "data": DecisionScenarioInlineSerializer(scenario).data},
        )


class JournalScenariosRegenerateView(APIView):
    """의사결정 시나리오 강제 재생성."""

    permission_classes = [IsAuthenticated]

    def post(self, request: Request, pk: int) -> Response:
        """기존 시나리오를 삭제하고 새로 생성한다."""
        entry = get_journal_for_user(journal_id=pk, user=request.user)
        scenario = generate_scenarios_for_entry(entry=entry, force=True)
        logger.info("시나리오 재생성: journal_id=%d user_id=%d", pk, request.user.pk)
        return Response(
            {"status": "success", "data": DecisionScenarioInlineSerializer(scenario).data},
        )
