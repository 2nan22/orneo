# ai_service/services/public_data/dart.py
"""OPEN DART 기업 공시 API 클라이언트."""

from __future__ import annotations

import asyncio
import io
import logging
import time
import xml.etree.ElementTree as ET
import zipfile
from datetime import date, timedelta

import httpx

logger = logging.getLogger(__name__)

DART_BASE_URL = "https://opendart.fss.or.kr/api/"
DEFAULT_TIMEOUT = httpx.Timeout(15.0, connect=5.0)
CORP_INDEX_DOWNLOAD_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
CORP_INDEX_TTL_SECONDS = 60 * 60 * 24
DEFAULT_LOOKBACK_DAYS = 90


class _DartCorpIndex:
    """DART corpCode.xml 다운로드 결과를 메모리 캐시한다.

    DART의 ``company.json``은 ``corp_code`` 필수이므로 회사명 검색을 직접
    지원하지 않는다. 모든 기업코드를 ZIP 파일로 일괄 제공하는 ``corpCode.xml``
    엔드포인트를 1일 1회 다운로드해 인메모리 인덱스로 검색을 처리한다.
    """

    def __init__(self) -> None:
        self._entries: list[dict[str, str]] = []
        self._loaded_at: float = 0.0
        self._lock = asyncio.Lock()

    async def ensure_loaded(self, *, api_key: str) -> None:
        """TTL 만료 시 corpCode.xml을 다시 받아 인덱스를 갱신한다."""
        async with self._lock:
            if self._entries and (time.time() - self._loaded_at) < CORP_INDEX_TTL_SECONDS:
                return
            zip_bytes = await self._download(api_key=api_key)
            self._entries = self._parse(zip_bytes)
            self._loaded_at = time.time()
            logger.info("[DART] 회사코드 인덱스 로드 완료: count=%d", len(self._entries))

    @staticmethod
    async def _download(*, api_key: str) -> bytes:
        async with httpx.AsyncClient(
            base_url=DART_BASE_URL, timeout=CORP_INDEX_DOWNLOAD_TIMEOUT
        ) as client:
            response = await client.get("corpCode.xml", params={"crtfc_key": api_key})
            response.raise_for_status()
            return response.content

    @staticmethod
    def _parse(zip_bytes: bytes) -> list[dict[str, str]]:
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
            with zf.open("CORPCODE.xml") as fp:
                tree = ET.parse(fp)
        result = []
        for elem in tree.getroot().iter("list"):
            corp_code = (elem.findtext("corp_code") or "").strip()
            corp_name = (elem.findtext("corp_name") or "").strip()
            stock_code = (elem.findtext("stock_code") or "").strip()
            if corp_code and corp_name:
                result.append(
                    {"corp_code": corp_code, "corp_name": corp_name, "stock_code": stock_code}
                )
        return result

    def search(self, keyword: str, *, limit: int = 10) -> list[dict[str, str]]:
        """회사명 키워드로 인덱스를 검색한다.

        정확히 일치 → 접두 일치 → 부분 일치 순으로 정렬하고, 동순위 안에서는
        상장 종목(stock_code 보유)을 우선한다.
        """
        kw = keyword.strip().lower()
        if not kw or not self._entries:
            return []

        exact: list[dict[str, str]] = []
        prefix: list[dict[str, str]] = []
        contains: list[dict[str, str]] = []
        for entry in self._entries:
            name_lower = entry["corp_name"].lower()
            if name_lower == kw:
                exact.append(entry)
            elif name_lower.startswith(kw):
                prefix.append(entry)
            elif kw in name_lower:
                contains.append(entry)

        def rank(entry: dict[str, str]) -> tuple[int, int]:
            return (0 if entry["stock_code"] else 1, len(entry["corp_name"]))

        merged = sorted(exact, key=rank) + sorted(prefix, key=rank) + sorted(contains, key=rank)
        return merged[:limit]

    def lookup_corp_code(self, corp_name: str) -> str | None:
        """회사명에 대해 단일 corp_code를 반환한다.

        검색 결과 1순위 항목의 corp_code를 사용한다.
        """
        results = self.search(corp_name, limit=1)
        return results[0]["corp_code"] if results else None


_corp_index = _DartCorpIndex()


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

    async def _resolve_corp_code(self, *, corp_name: str) -> str:
        """회사명을 corp_code로 변환한다.

        Raises:
            ValueError: 인덱스에서 해당 회사명을 찾지 못한 경우.
        """
        await _corp_index.ensure_loaded(api_key=self._api_key)
        code = _corp_index.lookup_corp_code(corp_name)
        if not code:
            raise ValueError(f"기업을 찾을 수 없습니다: {corp_name}")
        return code

    async def fetch_disclosures(
        self,
        *,
        corp_name: str = "",
        corp_code: str = "",
        bgn_de: str = "",
        end_de: str = "",
    ) -> list[dict]:
        """기업명 또는 corp_code로 최근 공시 목록을 반환한다.

        corp_code가 제공되면 인덱스 조회 단계를 건너뛴다.

        Args:
            corp_name: 회사명 (corp_code 없을 때 사용).
            corp_code: DART 기업 고유번호 8자리 (있으면 직접 사용).
            bgn_de: 조회 시작일 YYYYMMDD.
            end_de: 조회 종료일 YYYYMMDD.

        Returns:
            공시 항목 딕셔너리 목록.

        Raises:
            ValueError: 기업을 찾을 수 없는 경우.
        """
        if not corp_code:
            if not corp_name:
                raise ValueError("corp_name 또는 corp_code 중 하나는 필수입니다.")
            corp_code = await self._resolve_corp_code(corp_name=corp_name)

        # DART list.json은 bgn_de 없이 호출하면 기본 조회 기간이 매우 짧아
        # 거의 빈 결과를 반환한다. 사용자가 별도 지정하지 않으면 90일을 본다.
        if not bgn_de:
            bgn_de = (date.today() - timedelta(days=DEFAULT_LOOKBACK_DAYS)).strftime("%Y%m%d")

        params: dict = {
            "crtfc_key": self._api_key,
            "corp_code": corp_code,
            "page_no": "1",
            "page_count": "10",
            "bgn_de": bgn_de,
        }
        if end_de:
            params["end_de"] = end_de

        logger.debug("[DART API] 공시 조회 시작: corp_code=%s", corp_code)
        response = await self._http.get("list.json", params=params)
        response.raise_for_status()
        raw = response.json()

        if raw.get("status") not in ("000", "013"):
            raise ValueError(f"기업 공시를 찾을 수 없습니다: corp_code={corp_code}")

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
            "[DART API] 공시 조회 완료: corp_code=%s count=%d",
            corp_code, len(result),
        )
        return result

    async def search_corps(self, *, keyword: str, limit: int = 10) -> list[dict]:
        """회사명 키워드로 DART 기업 목록을 검색한다.

        corpCode.xml 인메모리 인덱스에서 정확/접두/부분 일치 순으로 매칭한다.

        Args:
            keyword: 회사명 검색어.
            limit: 최대 반환 개수.

        Returns:
            ``[{"corp_code": ..., "corp_name": ..., "stock_code": ...}]`` 목록.
            미발견 시 빈 리스트.
        """
        if not keyword:
            return []
        try:
            await _corp_index.ensure_loaded(api_key=self._api_key)
        except Exception as exc:
            logger.warning("[DART API] corpCode 인덱스 로드 실패: %s", exc)
            return []
        return _corp_index.search(keyword, limit=limit)
