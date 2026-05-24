import axios from "axios";
import { XMLParser } from "fast-xml-parser";
import { env } from "./env.js";
import { withLawdAddressPrefix } from "./lawdPrefixes.js";

const endpoints = {
  aptTrade: "https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade",
  aptRent: "https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent",
  officetelRent: "https://apis.data.go.kr/1613000/RTMSDataSvcOffiRent/getRTMSDataSvcOffiRent",
  rowHouseRent: "https://apis.data.go.kr/1613000/RTMSDataSvcRHRent/getRTMSDataSvcRHRent",
  singleHouseRent: "https://apis.data.go.kr/1613000/RTMSDataSvcSHRent/getRTMSDataSvcSHRent"
} as const;

export type MolitDealKind = keyof typeof endpoints;

export type NormalizedDeal = {
  buildingName: string;
  address: string;
  lawdCode: string;
  dealType: "SALE" | "JEONSE" | "MONTHLY_RENT";
  dealYear: number;
  dealMonth: number;
  dealDay?: number;
  depositAmount?: number;
  monthlyAmount?: number;
  saleAmount?: number;
  areaSquareM?: number;
  floor?: number;
  sourceKey: string;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true
});

const toArray = <T>(value: T | T[] | undefined): T[] => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const toNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  const numeric = Number(String(value).replaceAll(",", "").trim());
  return Number.isFinite(numeric) ? numeric : undefined;
};

const pick = (item: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    if (item[key] !== undefined && item[key] !== null && item[key] !== "") {
      return String(item[key]).trim();
    }
  }
  return "";
};

const parseResponsePayload = (data: unknown) => {
  if (typeof data !== "string") return data;

  const text = data.trim();
  if (!text) return {};
  if (text.startsWith("{") || text.startsWith("[")) {
    return JSON.parse(text);
  }

  return parser.parse(text);
};

export async function fetchMolitDeals(params: {
  kind: MolitDealKind;
  lawdCode: string;
  dealYmd: string;
  pageNo?: number;
  numOfRows?: number;
}): Promise<NormalizedDeal[]> {
  if (!env.MOLIT_SERVICE_KEY) {
    throw new Error("MOLIT_SERVICE_KEY is required to fetch public transaction data.");
  }

  const requestUrl = new URL(endpoints[params.kind]);
  requestUrl.searchParams.set("serviceKey", env.MOLIT_SERVICE_KEY);
  requestUrl.searchParams.set("LAWD_CD", params.lawdCode);
  requestUrl.searchParams.set("DEAL_YMD", params.dealYmd);
  requestUrl.searchParams.set("pageNo", String(params.pageNo ?? 1));
  requestUrl.searchParams.set("numOfRows", String(params.numOfRows ?? 100));

  let response;
  try {
    response = await axios.get(requestUrl.toString(), { responseType: "text" });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const detail = typeof error.response?.data === "string" ? error.response.data : error.message;
      throw new Error(
        `국토교통부 API 호출 실패${status ? ` (${status})` : ""}: ${detail}. 공공데이터포털에서 해당 API 활용신청/승인 상태와 일반 인증키(serviceKey)를 확인해주세요.`
      );
    }
    throw error;
  }

  const parsed = parseResponsePayload(response.data);
  const header = parsed?.response?.header;
  const resultCode = String(header?.resultCode ?? "00");
  if (!["0", "00", "000"].includes(resultCode)) {
    throw new Error(`국토교통부 API 오류: ${header?.resultMsg ?? "알 수 없는 오류"}`);
  }

  const items = toArray(parsed?.response?.body?.items?.item as Record<string, unknown> | Record<string, unknown>[]);

  return items.map((item) => normalizeItem(item, params.kind, params.lawdCode));
}

function normalizeItem(item: Record<string, unknown>, kind: MolitDealKind, lawdCode: string): NormalizedDeal {
  const dong = pick(item, ["umdNm", "법정동", "dong"]);
  const jibun = pick(item, ["jibun", "지번"]);
  const fallbackNameByKind: Record<MolitDealKind, string> = {
    aptTrade: "아파트",
    aptRent: "아파트",
    officetelRent: "오피스텔",
    rowHouseRent: "연립/다세대",
    singleHouseRent: "단독/다가구"
  };
  const buildingName =
    pick(item, ["aptNm", "아파트", "offiNm", "단지", "mhouseNm", "연립다세대", "houseNm", "buildingName"]) ||
    [fallbackNameByKind[kind], dong, jibun].filter(Boolean).join(" ");
  const address = withLawdAddressPrefix(lawdCode, [dong, jibun].filter(Boolean).join(" "));
  const dealYear = toNumber(pick(item, ["dealYear", "년"])) ?? new Date().getFullYear();
  const dealMonth = toNumber(pick(item, ["dealMonth", "월"])) ?? 1;
  const dealDay = toNumber(pick(item, ["dealDay", "일"]));
  const monthlyAmount = toNumber(pick(item, ["monthlyRent", "월세금액"]));
  const depositAmount = toNumber(pick(item, ["deposit", "보증금액"]));
  const saleAmount = toNumber(pick(item, ["dealAmount", "거래금액"]));
  const areaSquareM = toNumber(pick(item, ["excluUseAr", "전용면적", "totalFloorAr", "연면적", "area"]));
  const floor = toNumber(pick(item, ["floor", "층"]));
  const dealType = kind === "aptTrade" ? "SALE" : monthlyAmount ? "MONTHLY_RENT" : "JEONSE";

  return {
    buildingName,
    address,
    lawdCode,
    dealType,
    dealYear,
    dealMonth,
    dealDay,
    depositAmount,
    monthlyAmount,
    saleAmount,
    areaSquareM,
    floor,
    sourceKey: [
      kind,
      lawdCode,
      buildingName,
      dong,
      jibun,
      dealYear,
      dealMonth,
      dealDay ?? "00",
      areaSquareM ?? "na",
      floor ?? "na",
      saleAmount ?? depositAmount ?? 0,
      monthlyAmount ?? 0
    ].join(":")
  };
}
