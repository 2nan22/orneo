# backend/apps/public_data/views.py
"""공공 데이터 뷰."""

from __future__ import annotations

import logging

from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.public_data.selectors import search_kmooc_courses
from apps.public_data.serializers import KmoocCourseSerializer

logger = logging.getLogger(__name__)


class KmoocCourseSearchView(APIView):
    """K-MOOC 강좌 키워드 검색."""

    permission_classes = [AllowAny]

    def get(self, request: Request) -> Response:
        """키워드로 K-MOOC 강좌를 검색한다.

        Args:
            request: keyword 쿼리 파라미터를 포함한 HTTP 요청.

        Returns:
            강좌 목록 응답.
        """
        keyword = request.query_params.get("keyword", "").strip()
        courses = search_kmooc_courses(keyword=keyword, limit=6)
        serializer = KmoocCourseSerializer(courses, many=True)
        return Response({"status": "success", "data": serializer.data})
