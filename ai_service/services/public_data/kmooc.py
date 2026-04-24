# ai_service/services/public_data/kmooc.py
"""K-MOOC 강좌정보 API 클라이언트."""

from __future__ import annotations

import logging

from services.public_data.base import PublicDataClient

logger = logging.getLogger(__name__)

KMOOC_BASE_URL = "https://www.kmooc.kr/api"


class KmoocCourseClient(PublicDataClient):
    """K-MOOC 강좌정보 클라이언트.

    공공데이터포털 K-MOOC OpenAPI를 통해 강좌 정보를 조회한다.
    이용허락범위 제한 없음 (상업적 활용 가능).
    """

    def __init__(self, api_key: str) -> None:
        super().__init__(api_key=api_key, base_url=KMOOC_BASE_URL)

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
            "serviceKey": self._api_key,
            "search_filter": keyword,
            "page": page,
            "page_size": page_size,
        }
        logger.debug("[K-MOOC API] 강좌 검색 시작: keyword=%s", keyword)
        response = await self.client.get("/courses/", params=params)
        response.raise_for_status()
        return response.json()

    async def search_courses(self, *, keyword: str) -> list[dict]:
        """키워드로 강좌를 검색하고 정형화된 목록을 반환한다.

        Args:
            keyword: 검색 키워드.

        Returns:
            강좌 정보 딕셔너리 목록.
        """
        raw = await self.fetch_raw(keyword=keyword)

        results = raw.get("results", [])
        if not results:
            # 일부 API 버전의 다른 응답 구조 처리
            results = raw.get("data", raw.get("courses", []))

        courses = [
            {
                "course_id": item.get("id", item.get("course_id", "")),
                "name": item.get("name", item.get("course_name", "")),
                "org": item.get("org", item.get("organization", "")),
                "short_description": item.get("short_description", ""),
                "enrollment_start": item.get("enrollment_start", ""),
                "enrollment_end": item.get("enrollment_end", ""),
                "course_image_url": item.get("course_image_url", ""),
            }
            for item in results
        ]

        logger.info(
            "[K-MOOC API] 강좌 검색 완료: keyword=%s count=%d",
            keyword, len(courses),
        )
        return courses
