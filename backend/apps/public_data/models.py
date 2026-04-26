# backend/apps/public_data/models.py
"""공공 데이터 모델."""

from __future__ import annotations

from django.db import models


class KmoocCourse(models.Model):
    """K-MOOC 강좌 캐시 모델.

    K-MOOC API (courseList_v2_0, courseDetail_v2_0)에서 동기화한
    강좌 정보를 로컬 DB에 캐싱한다.
    하루 1회 Celery 태스크가 전체 목록을 동기화한다.

    Attributes:
        course_id: K-MOOC 강좌 고유 ID (API의 'id' 필드).
        course_name: 강좌명.
        org_code: 기관 코드.
        org_name: 기관명.
        professor: 교수자.
        course_image: 썸네일 이미지 URL.
        course_url: K-MOOC 강좌 상세 URL.
        summary: 강좌 소개 (courseDetail_v2_0에서 수집).
        enrollment_start: 수강 신청 시작일 (Unix timestamp → datetime).
        enrollment_end: 수강 신청 종료일.
        study_start: 학습 시작일.
        study_end: 학습 종료일.
        public_yn: 공개 여부.
        is_active: API에서 삭제 여부 (False = 더 이상 목록에 없음).
        synced_at: 마지막 동기화 시각.
    """

    course_id = models.CharField(max_length=20, primary_key=True, verbose_name="강좌 ID")
    course_name = models.CharField(max_length=300, verbose_name="강좌명")
    org_code = models.CharField(max_length=100, blank=True, verbose_name="기관 코드")
    org_name = models.CharField(max_length=200, blank=True, verbose_name="기관명")
    professor = models.CharField(max_length=300, blank=True, verbose_name="교수자")
    course_image = models.URLField(blank=True, verbose_name="썸네일")
    course_url = models.URLField(blank=True, verbose_name="강좌 URL")
    summary = models.TextField(blank=True, verbose_name="강좌 소개")
    enrollment_start = models.DateTimeField(null=True, blank=True, verbose_name="수강신청 시작")
    enrollment_end = models.DateTimeField(null=True, blank=True, verbose_name="수강신청 종료")
    study_start = models.DateTimeField(null=True, blank=True, verbose_name="학습 시작")
    study_end = models.DateTimeField(null=True, blank=True, verbose_name="학습 종료")
    public_yn = models.BooleanField(default=True, verbose_name="공개 여부")
    is_active = models.BooleanField(default=True, verbose_name="활성 여부")
    synced_at = models.DateTimeField(auto_now=True, verbose_name="동기화 시각")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="최초 등록")

    class Meta:
        ordering = ["-study_start"]
        verbose_name = "K-MOOC 강좌"
        verbose_name_plural = "K-MOOC 강좌 목록"
        indexes = [
            models.Index(fields=["course_name"], name="kmooc_name_idx"),
            models.Index(fields=["is_active", "public_yn"], name="kmooc_active_idx"),
        ]

    def __str__(self) -> str:
        return f"[{self.org_name}] {self.course_name}"
