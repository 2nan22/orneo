# ai_service/services/public_data/dart.py
"""OPEN DART 기업 공시 API 클라이언트."""

from __future__ import annotations

import logging

from services.public_data.base import PublicDataClient

logger = logging.getLogger(__name__)

DART_BASE_URL = "https://opendart.fss.or.kr/api"


class DartDisclosureClient(PublicDataClient):
    """OPEN DART 기업 공시 클라이언트.

    금융감독원 DART OpenAPI를 통해 기업 공시 목록을 조회한다.
    이용허락범위 제한 없음 (상업적 활용 가능).
    """

    def __init__(self, api_key: str) -> None:
        super().__init__(api_key=api_key, base_url=DART_BASE_URL)

    async def fetch_raw(self, *, corp_code: str, bgn_de: str = "", end_de: str = "") -> dict:
        """공시 목록 원본 데이터를 조회한다.

        Args:
            corp_code: DART 기업 고유번호 (8자리).
            bgn_de: 조회 시작일 YYYYMMDD.
            end_de: 조회 종료일 YYYYMMDD.

        Returns:
            API 원본 응답 딕셔너리.
        """
        params: dict = {
            "crtfc_key": self._api_key,
            "corp_code": corp_code,
            "page_no": "1",
            "page_count": "10",
        }
        if bgn_de:
            params["bgn_de"] = bgn_de
        if end_de:
            params["end_de"] = end_de

        logger.debug("[DART API] 공시 조회 시작: corp_code=%s", corp_code)
        response = await self.client.get("/list.json", params=params)
        response.raise_for_status()
        return response.json()

    async def _fetch_corp_code(self, *, corp_name: str) -> str:
        """기업명으로 DART 고유번호를 조회한다.

        Args:
            corp_name: 회사명.

        Returns:
            DART 기업 고유번호 (8자리).

        Raises:
            ValueError: 해당 기업명을 찾을 수 없는 경우.
        """
        params = {"crtfc_key": self._api_key, "corp_name": corp_name}
        logger.debug("[DART API] 기업코드 조회: corp_name=%s", corp_name)
        response = await self.client.get("/company.json", params=params)
        response.raise_for_status()
        data = response.json()

        if data.get("status") != "000":
            raise ValueError(f"기업을 찾을 수 없습니다: {corp_name}")

        return data["corp_code"]

    async def fetch_disclosures(
        self,
        *,
        corp_name: str,
        bgn_de: str = "",
        end_de: str = "",
    ) -> list[dict]:
        """기업명으로 최근 공시 목록을 반환한다.

        Args:
            corp_name: 회사명.
            bgn_de: 조회 시작일 YYYYMMDD.
            end_de: 조회 종료일 YYYYMMDD.

        Returns:
            공시 항목 딕셔너리 목록.

        Raises:
            ValueError: 해당 기업명을 찾을 수 없는 경우.
        """
        corp_code = await self._fetch_corp_code(corp_name=corp_name)
        raw = await self.fetch_raw(corp_code=corp_code, bgn_de=bgn_de, end_de=end_de)

        if raw.get("status") not in ("000", "013"):
            raise ValueError(f"기업을 찾을 수 없습니다: {corp_name}")

        items = raw.get("list", [])
        result = [
            {
                "receipt_no": item.get("rcept_no", ""),
                "corp_name": item.get("corp_name", ""),
                "report_name": item.get("report_nm", ""),
                "receipt_date": item.get("rcept_dt", ""),
                "url": f"https://dart.fss.or.kr/dsaf001/main.do?rcpNo={item.get('rcept_no', '')}",
            }
            for item in items
        ]

        logger.info(
            "[DART API] 공시 조회 완료: corp_name=%s count=%d",
            corp_name, len(result),
        )
        return result
