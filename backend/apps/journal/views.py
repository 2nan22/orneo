# backend/apps/journal/views.py
"""의사결정 일지 뷰."""

from __future__ import annotations

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.journal.selectors import get_user_journals
from apps.journal.serializers import (
    JournalCreateSerializer,
    JournalResponseSerializer,
    JournalReviewSerializer,
)
from apps.journal.services import create_journal, get_journal_for_user, mark_reviewed


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
