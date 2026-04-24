# ai_service/services/public_data/molit.py
"""국토교통부 아파트 매매 실거래가 API 클라이언트."""

from __future__ import annotations

import logging
from dataclasses import dataclass

from services.public_data.base import PublicDataClient

logger = logging.getLogger(__name__)

MOLIT_BASE_URL = "https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev"


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


class MolitApartmentClient(PublicDataClient):
    """국토교통부 아파트 실거래가 클라이언트.

    공공데이터포털 OpenAPI를 통해 아파트 매매 실거래가를 조회한다.
    이용허락범위 제한 없음 (상업적 활용 가능).
    """

    def __init__(self, api_key: str) -> None:
        super().__init__(api_key=api_key, base_url=MOLIT_BASE_URL)

    async def fetch_raw(self, *, lawd_cd: str, deal_ymd: str) -> dict:
        """실거래가 원본 데이터를 조회한다.

        Args:
            lawd_cd: 지역코드 (5자리, 예: '11200' = 성동구).
            deal_ymd: 계약년월 (YYYYMM, 예: '202503').

        Returns:
            API 원본 응답 딕셔너리.
        """
        params = {
            "serviceKey": self._api_key,
            "LAWD_CD": lawd_cd,
            "DEAL_YMD": deal_ymd,
            "numOfRows": 100,
            "pageNo": 1,
            "resultType": "json",
        }
        logger.debug("[MOLIT API] 실거래가 조회 시작: lawd_cd=%s deal_ymd=%s", lawd_cd, deal_ymd)
        response = await self.client.get("/getRTMSDataSvcAptTradeDev", params=params)
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
                        deal_amount=int(str(item["dealAmount"]).replace(",", "")),
                        area=float(item["excluUseAr"]),
                        floor=int(item["floor"]),
                        deal_year=int(item["dealYear"]),
                        deal_month=int(item["dealMonth"]),
                        deal_day=int(item["dealDay"]),
                        apartment_name=item.get("aptNm", ""),
                        road_name=item.get("roadNm", ""),
                        legal_dong=item.get("umdNm", ""),
                        build_year=int(item.get("buildYear", 0)),
                    )
                )
            except (KeyError, ValueError) as exc:
                logger.warning("[MOLIT API] 거래 데이터 파싱 실패: %s / item=%s", exc, item)

        logger.info(
            "[MOLIT API] 실거래가 조회 완료: lawd_cd=%s deal_ymd=%s count=%d",
            lawd_cd, deal_ymd, len(result),
        )
        return result
