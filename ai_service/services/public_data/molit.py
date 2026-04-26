# ai_service/services/public_data/molit.py
"""국토교통부 부동산 실거래가 API 클라이언트."""

from __future__ import annotations

import logging
from dataclasses import dataclass

import httpx

logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT = httpx.Timeout(15.0, connect=5.0)


@dataclass
class ApartmentTransaction:
    """아파트 거래 데이터."""

    deal_amount: int
    area: float
    floor: int
    deal_year: int
    deal_month: int
    deal_day: int
    apartment_name: str
    road_name: str
    legal_dong: str
    build_year: int


class MolitApartmentClient:
    """국토교통부 아파트 실거래가 클라이언트.

    공공데이터포털 OpenAPI를 통해 아파트 매매 실거래가를 조회한다.

    Args:
        service_key: 공공데이터포털 인증키 (DATA_GO_KR_SERVICE_KEY).
        endpoint: MOLIT 아파트 매매 실거래가 엔드포인트 URL.
    """

    def __init__(self, service_key: str, endpoint: str) -> None:
        self._service_key = service_key
        # 엔드포인트 끝에 "/" 보장 → httpx base_url이 경로를 올바르게 합산
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

    async def fetch_raw(self, *, lawd_cd: str, deal_ymd: str) -> dict:
        """실거래가 원본 데이터를 조회한다.

        Args:
            lawd_cd: 지역코드 5자리 (예: '11200' = 성동구).
            deal_ymd: 계약년월 YYYYMM (예: '202503').

        Returns:
            API 원본 응답 딕셔너리.
        """
        # 엔드포인트 URL의 마지막 세그먼트가 서비스 작업명
        # 예: .../RTMSDataSvcAptTradeDev → getRTMSDataSvcAptTradeDev
        service_name = self._base_url.rstrip("/").rsplit("/", 1)[-1]
        action = f"get{service_name}"

        params = {
            "serviceKey": self._service_key,
            "LAWD_CD": lawd_cd,
            "DEAL_YMD": deal_ymd,
            "numOfRows": 100,
            "pageNo": 1,
            "resultType": "json",
        }
        logger.debug("[MOLIT API] 실거래가 조회 시작: lawd_cd=%s deal_ymd=%s", lawd_cd, deal_ymd)
        response = await self._http.get(action, params=params)
        response.raise_for_status()
        return response.json()

    async def fetch_transactions(
        self,
        *,
        lawd_cd: str,
        deal_ymd: str,
    ) -> list[ApartmentTransaction]:
        """파싱된 거래 목록을 반환한다.

        Args:
            lawd_cd: 지역코드.
            deal_ymd: 계약년월.

        Returns:
            ApartmentTransaction 목록.
        """
        raw = await self.fetch_raw(lawd_cd=lawd_cd, deal_ymd=deal_ymd)
        items = raw.get("response", {}).get("body", {}).get("items", {}).get("item", [])
        if isinstance(items, dict):
            items = [items]

        result = []
        for item in items:
            try:
                result.append(
                    ApartmentTransaction(
                        deal_amount=int(str(item.get("dealAmount", "0")).replace(",", "")),
                        area=float(item.get("excluUseAr", 0)),
                        floor=int(item.get("floor", 0)),
                        deal_year=int(item.get("dealYear", 0)),
                        deal_month=int(item.get("dealMonth", 0)),
                        deal_day=int(item.get("dealDay", 0)),
                        apartment_name=item.get("aptNm", ""),
                        road_name=item.get("roadNm", ""),
                        legal_dong=item.get("umdNm", ""),
                        build_year=int(item.get("buildYear", 0)),
                    )
                )
            except (KeyError, ValueError, TypeError) as exc:
                logger.warning("[MOLIT API] 거래 데이터 파싱 실패: %s / item=%s", exc, item)

        logger.info(
            "[MOLIT API] 실거래가 조회 완료: lawd_cd=%s deal_ymd=%s count=%d",
            lawd_cd, deal_ymd, len(result),
        )
        return result
