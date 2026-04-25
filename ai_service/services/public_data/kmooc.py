# ai_service/services/public_data/kmooc.py
"""K-MOOC 강좌정보 API 클라이언트."""

from __future__ import annotations

import logging

import httpx

logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT = httpx.Timeout(15.0, connect=5.0)


class KmoocCourseClient:
    """K-MOOC 강좌정보 클라이언트.

    공공데이터포털 K-MOOC v2.0 OpenAPI를 통해 강좌 정보를 조회한다.

    Args:
        service_key: 공공데이터포털 인증키 (DATA_GO_KR_SERVICE_KEY).
        endpoint: K-MOOC 강좌 엔드포인트 기본 URL.
    """

    def __init__(self, service_key: str, endpoint: str) -> None:
        self._service_key = service_key
        self._base_url = endpoint.rstrip("/") + "/"
        self._client: httpx.AsyncClient | None = None

    @property
    def _http(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self._base_url,
                timeout=DEFAULT_TIMEOUT,
            )
        return self._client

    async def close(self) -> None:
        """HTTP 클라이언트를 정리한다."""
        if self._client:
            await self._client.aclose()
            self._client = None

    async def fetch_raw(self, *, keyword: str, page: int = 1, page_size: int = 20) -> dict:
        """강좌 목록 원본 데이터를 조회한다.

        Args:
            keyword: 검색 키워드.
            page: 페이지 번호.
            page_size: 페이지당 결과 수.

        Returns:
            API 원본 응답 딕셔너리.
        """
        params = {
            "serviceKey": self._service_key,
            "keyword": keyword,
            "pageNo": page,
            "numOfRows": page_size,
            "resultType": "json",
        }
        logger.debug("[K-MOOC API] 강좌 검색 시작: keyword=%s", keyword)
        response = await self._http.get("getLectures", params=params)
        response.raise_for_status()
        return response.json()

    async def search_courses(self, *, keyword: str) -> list[dict]:
        """키워드로 강좌를 검색하고 정형화된 목록을 반환한다.

        data.go.kr K-MOOC v2.0 응답 구조를 파싱한다.
        response.body.items.item 배열 또는 items 배열을 처리한다.

        Args:
            keyword: 검색 키워드.

        Returns:
            강좌 정보 딕셔너리 목록.
        """
        raw = await self.fetch_raw(keyword=keyword)

        # data.go.kr 표준 응답 구조 시도
        body = raw.get("response", raw).get("body", raw)
        items_wrapper = body.get("items", {})

        if isinstance(items_wrapper, dict):
            items = items_wrapper.get("item", [])
        elif isinstance(items_wrapper, list):
            items = items_wrapper
        else:
            # 구형 kmooc.kr 응답 구조 폴백
            items = raw.get("results", raw.get("data", raw.get("courses", [])))

        if isinstance(items, dict):
            items = [items]

        courses = []
        for item in items:
            courses.append({
                "course_id": item.get("lectureId", item.get("id", item.get("course_id", ""))),
                "course_name": item.get(
                    "lectureName", item.get("name", item.get("course_name", ""))
                ),
                "org_name": item.get(
                    "orgName", item.get("org", item.get("organization", ""))
                ),
                "short_description": item.get("shortDescription", item.get("short_description", "")),
                "course_image_url": item.get(
                    "courseImageUrl", item.get("course_image_url", "")
                ),
            })

        logger.info(
            "[K-MOOC API] 강좌 검색 완료: keyword=%s count=%d",
            keyword, len(courses),
        )
        return courses
