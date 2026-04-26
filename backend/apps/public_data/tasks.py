# backend/apps/public_data/tasks.py
"""공공 데이터 Celery 동기화 태스크."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

import httpx
from celery import shared_task
from django.conf import settings

logger = logging.getLogger(__name__)

_KMOOC_BASE = "https://apis.data.go.kr/B552881/kmooc_v2_0"
_PAGE_SIZE = 100
_TIMEOUT = httpx.Timeout(30.0, connect=10.0)


def _parse_ts(value: str | int | None) -> datetime | None:
    """Unix timestamp 문자열을 datetime으로 변환한다."""
    if not value:
        return None
    try:
        return datetime.fromtimestamp(int(value), tz=timezone.utc)
    except (ValueError, TypeError):
        return None


def _fetch_course_list_page(client: httpx.Client, *, key: str, page: int) -> dict:
    """courseList_v2_0 단일 페이지를 조회한다.

    Args:
        client: httpx 동기 클라이언트.
        key: 공공데이터포털 인증키.
        page: 페이지 번호.

    Returns:
        API 원본 응답 딕셔너리.
    """
    r = client.get(
        f"{_KMOOC_BASE}/courseList_v2_0",
        params={"serviceKey": key, "page": page, "size": _PAGE_SIZE},
        timeout=_TIMEOUT,
    )
    r.raise_for_status()
    return r.json()


def _fetch_course_detail(client: httpx.Client, *, key: str, course_id: str) -> dict | None:
    """courseDetail_v2_0 단건 조회.

    Args:
        client: httpx 동기 클라이언트.
        key: 공공데이터포털 인증키.
        course_id: K-MOOC 강좌 ID.

    Returns:
        결과 딕셔너리 또는 None.
    """
    try:
        r = client.get(
            f"{_KMOOC_BASE}/courseDetail_v2_0",
            params={"serviceKey": key, "id": course_id},
            timeout=_TIMEOUT,
        )
        if not r.is_success:
            return None
        data = r.json()
        return data.get("results") or None
    except Exception as exc:
        logger.warning("[K-MOOC Detail] 조회 실패: course_id=%s %s", course_id, exc)
        return None


@shared_task(name="apps.public_data.tasks.sync_kmooc_courses")
def sync_kmooc_courses() -> dict:
    """K-MOOC 전체 강좌 목록을 DB에 동기화한다.

    하루 1회 Celery beat에서 호출한다.
    전체 목록을 페이지별로 순회하며 신규·변경·삭제를 처리한다.
    신규 강좌는 courseDetail_v2_0에서 summary를 별도 조회한다.

    Returns:
        created, updated, deactivated 카운트 딕셔너리.
    """
    from apps.public_data.models import KmoocCourse

    key = getattr(settings, "DATA_GO_KR_SERVICE_KEY", "")
    if not key:
        logger.error("[K-MOOC Sync] DATA_GO_KR_SERVICE_KEY 미설정")
        return {"error": "missing_key"}

    logger.info("[K-MOOC Sync] 동기화 시작")

    fetched_ids: set[str] = set()
    created = updated = 0

    with httpx.Client() as client:
        page = 1
        while True:
            try:
                raw = _fetch_course_list_page(client, key=key, page=page)
            except Exception as exc:
                logger.error("[K-MOOC Sync] 페이지 조회 실패: page=%d %s", page, exc)
                break

            if raw.get("resultCode") != "00":
                logger.error(
                    "[K-MOOC Sync] API 오류: resultCode=%s resultMsg=%s",
                    raw.get("resultCode"), raw.get("resultMsg"),
                )
                break

            items = raw.get("items", [])
            if not items:
                break

            for item in items:
                cid = str(item.get("id", ""))
                if not cid:
                    continue
                fetched_ids.add(cid)

                defaults = {
                    "course_name": item.get("name", ""),
                    "org_code": item.get("org", ""),
                    "org_name": item.get("org_name", ""),
                    "professor": item.get("professor", ""),
                    "course_image": item.get("course_image", ""),
                    "course_url": item.get("url", ""),
                    "enrollment_start": _parse_ts(item.get("enrollment_start")),
                    "enrollment_end": _parse_ts(item.get("enrollment_end")),
                    "study_start": _parse_ts(item.get("study_start")),
                    "study_end": _parse_ts(item.get("study_end")),
                    "public_yn": item.get("public_yn", "Y") == "Y",
                    "is_active": True,
                }

                course, is_new = KmoocCourse.objects.update_or_create(
                    course_id=cid,
                    defaults=defaults,
                )

                if is_new:
                    created += 1
                    # 신규 강좌만 detail 조회해서 summary 저장
                    detail = _fetch_course_detail(client, key=key, course_id=cid)
                    if detail:
                        summary = detail.get("summary", "")
                        if summary:
                            # HTML 태그 간단 제거
                            import re
                            summary = re.sub(r"<[^>]+>", " ", summary)
                            summary = re.sub(r"\s+", " ", summary).strip()
                            KmoocCourse.objects.filter(course_id=cid).update(summary=summary[:2000])
                else:
                    updated += 1

            total = raw.get("header", {}).get("totalCount", 0)
            logger.info(
                "[K-MOOC Sync] 페이지 처리: page=%d count=%d total=%d",
                page, len(items), total,
            )

            if len(fetched_ids) >= total:
                break
            page += 1

    # DB에는 있지만 API에서 사라진 강좌 비활성화
    deactivated = (
        KmoocCourse.objects
        .filter(is_active=True)
        .exclude(course_id__in=fetched_ids)
        .update(is_active=False)
    )

    logger.info(
        "[K-MOOC Sync] 완료: created=%d updated=%d deactivated=%d",
        created, updated, deactivated,
    )
    return {"created": created, "updated": updated, "deactivated": deactivated}
