# ai_service/services/public_data/dart.py
"""OPEN DART 기업 공시 API 클라이언트."""

from __future__ import annotations

import logging

import httpx

logger = logging.getLogger(__name__)

DART_BASE_URL = "https://opendart.fss.or.kr/api/"
DEFAULT_TIMEOUT = httpx.Timeout(15.0, connect=5.0)


class DartDisclosureClient:
    """OPEN DART 기업 공시 클라이언트.

    금융감독원 DART OpenAPI를 통해 기업 공시 목록을 조회한다.

    Args:
        api_key: DART API 인증키 (DART_API_KEY).
    """

    def __init__(self, api_key: str) -> None:
        self._api_key = api_key
        self._client: httpx.AsyncClient | None = None

    @property
    def _http(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=DART_BASE_URL,
                timeout=DEFAULT_TIMEOUT,
            )
        return self._client

    async def close(self) -> None:
        """HTTP 클라이언트를 정리한다."""
        if self._client:
            await self._client.aclose()
            self._client = None

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
        response = await self._http.get("company.json", params=params)
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
        response = await self._http.get("list.json", params=params)
        response.raise_for_status()
        raw = response.json()

        if raw.get("status") not in ("000", "013"):
            raise ValueError(f"기업을 찾을 수 없습니다: {corp_name}")

        items = raw.get("list", [])
        result = [
            {
                "receipt_no": item.get("rcept_no", ""),
                "corp_name": item.get("corp_name", ""),
                "report_name": item.get("report_nm", ""),
                "receipt_date": item.get("rcept_dt", ""),
                "url": (
                    f"https://dart.fss.or.kr/dsaf001/main.do"
                    f"?rcpNo={item.get('rcept_no', '')}"
                ),
            }
            for item in items
        ]

        logger.info(
            "[DART API] 공시 조회 완료: corp_name=%s count=%d",
            corp_name, len(result),
        )
        return result
