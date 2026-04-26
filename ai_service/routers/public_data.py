# ai_service/routers/public_data.py
"""공공 데이터 조회 라우터."""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Query, status

from config import settings
from services.public_data.dart import DartDisclosureClient
from services.public_data.kmooc import KmoocCourseClient
from services.public_data.molit import MolitApartmentClient

logger = logging.getLogger(__name__)
router = APIRouter()

SOURCE_MOLIT = "국토교통부 아파트매매 실거래가 자료"
SOURCE_DART = "금융감독원 OPEN DART 전자공시시스템"
SOURCE_KMOOC = "K-MOOC 한국형 온라인 공개강좌"
INVESTMENT_DISCLAIMER = "이 데이터는 교육·참고 목적이며 투자 권유가 아닙니다."


@router.get(
    "/apartments/transactions",
    summary="아파트 실거래가 조회",
)
async def get_apartment_transactions(
    lawd_cd: str = Query(..., description="지역코드 5자리 (예: 11200=성동구)"),
    deal_ymd: str = Query(..., description="계약년월 YYYYMM (예: 202503)"),
) -> dict:
    """국토교통부 아파트 매매 실거래가를 조회한다.

    Args:
        lawd_cd: 지역코드 5자리.
        deal_ymd: 계약년월 YYYYMM.

    Returns:
        실거래가 목록과 출처·면책 고지.

    Raises:
        HTTPException: 인증키 미설정 또는 외부 API 오류 시.
    """
    if not settings.data_go_kr_service_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="DATA_GO_KR_SERVICE_KEY가 설정되지 않았습니다. .env 파일을 확인하세요.",
        )

    client = MolitApartmentClient(
        service_key=settings.data_go_kr_service_key,
        endpoint=settings.molit_apt_trade_detail_endpoint,
    )
    try:
        transactions = await client.fetch_transactions(lawd_cd=lawd_cd, deal_ymd=deal_ymd)
        data = [
            {
                "deal_amount": t.deal_amount,
                "area": t.area,
                "floor": t.floor,
                "deal_date": f"{t.deal_year}-{t.deal_month:02d}-{t.deal_day:02d}",
                "apartment_name": t.apartment_name,
                "road_name": t.road_name,
                "legal_dong": t.legal_dong,
                "build_year": t.build_year,
            }
            for t in transactions
        ]
        return {
            "status": "success",
            "source": SOURCE_MOLIT,
            "disclaimer": INVESTMENT_DISCLAIMER,
            "query_params": {"lawd_cd": lawd_cd, "deal_ymd": deal_ymd},
            "data": data,
            "meta": {"count": len(data)},
        }
    except Exception as exc:
        logger.error("[MOLIT API] 실거래가 조회 실패: lawd_cd=%s %s", lawd_cd, exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="국토교통부 API 호출에 실패했습니다. 잠시 후 다시 시도해주세요.",
        ) from exc
    finally:
        await client.close()


@router.get(
    "/dart/corps",
    summary="DART 기업 검색",
)
async def search_dart_corps(
    keyword: str = Query(..., description="회사명 검색어 (예: 삼성)"),
) -> dict:
    """DART에서 기업명으로 회사 목록을 검색한다.

    MVP: company.json으로 정확히 일치하는 단일 기업을 반환한다.

    Args:
        keyword: 회사명 검색어.

    Returns:
        기업 코드와 이름 목록.

    Raises:
        HTTPException: API 키 미설정 시.
    """
    if not settings.dart_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="DART_API_KEY가 설정되지 않았습니다. .env 파일을 확인하세요.",
        )

    client = DartDisclosureClient(api_key=settings.dart_api_key)
    try:
        corps = await client.search_corps(keyword=keyword)
        return {
            "status": "success",
            "source": SOURCE_DART,
            "data": corps,
            "meta": {"count": len(corps)},
        }
    finally:
        await client.close()


@router.get(
    "/dart/disclosures",
    summary="OPEN DART 기업 공시 조회",
)
async def get_dart_disclosures(
    corp_name: str = Query("", description="회사명 (예: 삼성전자)"),
    corp_code: str = Query("", description="DART 기업 고유번호 8자리 (있으면 corp_name보다 우선)"),
    bgn_de: str = Query("", description="시작일 YYYYMMDD"),
    end_de: str = Query("", description="종료일 YYYYMMDD"),
) -> dict:
    """OPEN DART에서 기업 공시 목록을 조회한다.

    corp_code가 있으면 기업명 조회 단계를 건너뛰고 바로 공시를 조회한다.

    Args:
        corp_name: 회사명 (corp_code 없을 때 사용).
        corp_code: DART 기업 고유번호 (있으면 corp_name보다 우선).
        bgn_de: 조회 시작일 YYYYMMDD.
        end_de: 조회 종료일 YYYYMMDD.

    Returns:
        공시 목록과 출처.

    Raises:
        HTTPException: API 키 미설정, 기업 미발견, 또는 외부 API 오류 시.
    """
    if not settings.dart_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="DART_API_KEY가 설정되지 않았습니다. .env 파일을 확인하세요.",
        )
    if not corp_name and not corp_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="corp_name 또는 corp_code 중 하나는 필수입니다.",
        )

    client = DartDisclosureClient(api_key=settings.dart_api_key)
    try:
        disclosures = await client.fetch_disclosures(
            corp_name=corp_name, corp_code=corp_code, bgn_de=bgn_de, end_de=end_de
        )
        return {
            "status": "success",
            "source": SOURCE_DART,
            "disclaimer": INVESTMENT_DISCLAIMER,
            "query_params": {"corp_name": corp_name, "corp_code": corp_code, "bgn_de": bgn_de, "end_de": end_de},
            "data": disclosures,
            "meta": {"count": len(disclosures)},
        }
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("[DART API] 공시 조회 실패: corp_name=%s corp_code=%s %s", corp_name, corp_code, exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="DART API 호출에 실패했습니다. 잠시 후 다시 시도해주세요.",
        ) from exc
    finally:
        await client.close()


@router.get(
    "/kmooc/courses",
    summary="K-MOOC 강좌 검색",
)
async def get_kmooc_courses(
    keyword: str = Query(..., description="검색 키워드 (예: 데이터분석)"),
) -> dict:
    """K-MOOC에서 강좌를 검색한다.

    Args:
        keyword: 검색 키워드.

    Returns:
        강좌 목록과 출처.

    Raises:
        HTTPException: 인증키 미설정 또는 외부 API 오류 시.
    """
    if not settings.data_go_kr_service_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="DATA_GO_KR_SERVICE_KEY가 설정되지 않았습니다. .env 파일을 확인하세요.",
        )

    client = KmoocCourseClient(
        service_key=settings.data_go_kr_service_key,
        endpoint=settings.kmooc_lecture_endpoint,
    )
    try:
        courses = await client.search_courses(keyword=keyword)
        return {
            "status": "success",
            "source": SOURCE_KMOOC,
            "query_params": {"keyword": keyword},
            "data": courses,
            "meta": {"count": len(courses)},
        }
    except Exception as exc:
        logger.error("[K-MOOC API] 강좌 검색 실패: keyword=%s %s", keyword, exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="K-MOOC API 호출에 실패했습니다. 잠시 후 다시 시도해주세요.",
        ) from exc
    finally:
        await client.close()
