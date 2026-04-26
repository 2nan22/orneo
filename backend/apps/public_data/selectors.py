# backend/apps/public_data/selectors.py
"""공공 데이터 읽기 전용 쿼리."""

from __future__ import annotations

from django.db import models
from django.db.models import QuerySet

from apps.public_data.models import KmoocCourse


def search_kmooc_courses(*, keyword: str, limit: int = 6) -> QuerySet[KmoocCourse]:
    """키워드로 K-MOOC 강좌를 검색한다.

    강좌명과 강좌 소개(summary)에서 keyword를 포함하는 강좌를 반환한다.

    Args:
        keyword: 검색 키워드.
        limit: 최대 반환 수.

    Returns:
        KmoocCourse QuerySet.
    """
    if not keyword:
        return KmoocCourse.objects.none()

    return (
        KmoocCourse.objects
        .filter(is_active=True, public_yn=True)
        .filter(
            models.Q(course_name__icontains=keyword)
            | models.Q(summary__icontains=keyword)
        )
        .order_by("-study_start")[:limit]
    )
