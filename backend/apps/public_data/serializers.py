# backend/apps/public_data/serializers.py
"""공공 데이터 직렬화."""

from __future__ import annotations

from rest_framework import serializers

from apps.public_data.models import KmoocCourse


class KmoocCourseSerializer(serializers.ModelSerializer):
    """K-MOOC 강좌 응답 직렬화."""

    class Meta:
        model = KmoocCourse
        fields = [
            "course_id",
            "course_name",
            "org_name",
            "professor",
            "course_image",
            "course_url",
            "summary",
        ]
