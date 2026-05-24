import { useEffect, useRef, useState } from "react";
import type { Building, PlaceHint } from "./types";

const KAKAO_KEY = import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY;
const hasValidKakaoKey = Boolean(KAKAO_KEY && !KAKAO_KEY.startsWith("PUT_"));
const SDK_ID = "kakao-map-sdk";
const MIN_READABLE_LEVEL = 3;

type MapFocus = {
  lat: number;
  lng: number;
  level: number;
};

type KakaoMapOptions = {
  selectedId?: string;
  onSelect?: (buildingId?: string) => void;
  onPlaceHint?: (buildingId: string, hint: PlaceHint) => void;
  onResolvedLocation?: (buildingId: string, latitude: number, longitude: number) => void;
  focus?: MapFocus;
  useBounds?: boolean;
};

type OverlayParts = {
  root: HTMLDivElement;
  candidate: HTMLElement;
};

function overlayPriceLabel(building: Building) {
  const monthly = building.transactions.find((transaction) => transaction.dealType === "MONTHLY_RENT");
  if (monthly?.monthlyAmount) return `${monthly.monthlyAmount}\uB9CC`;

  const jeonse = building.transactions.find((transaction) => transaction.dealType === "JEONSE");
  if (jeonse?.depositAmount) return `${Math.round(jeonse.depositAmount / 1000)}\uCC9C`;

  const sale = building.transactions.find((transaction) => transaction.dealType === "SALE");
  if (sale?.saleAmount) return `${Math.round(sale.saleAmount / 10000)}\uC5B5`;

  const review = building.reviews.find((item) => item.reviewMonthlyRent || item.reviewDepositAmount);
  if (review?.reviewMonthlyRent) return `${review.reviewMonthlyRent}\uB9CC`;
  if (review?.reviewDepositAmount) return `${Math.round(review.reviewDepositAmount / 1000)}\uCC9C`;

  return "\uC815\uBCF4";
}
function cleanGyeongjuAddress(address: string) {
  return address.replace(/^\uACBD\uBD81\s+\uACBD\uC8FC\uC2DC\s*/, "");
}
function overlayMetaLabel(building: Building) {
  const address = cleanGyeongjuAddress(building.address);
  return `${address || building.address} \u00b7 ${building.transactions.length}\uac74`;
}
function buildPlaceKeywords(building: Building) {
  const shortAddress = cleanGyeongjuAddress(building.address);
  const baseAddress = building.address || shortAddress;
  const dongName = shortAddress.split(" ")[0] || shortAddress;

  return [
    `${baseAddress} \uc6d0\ub8f8`,
    `${baseAddress} \ube4c\ub77c`,
    `${baseAddress} \uc624\ud53c\uc2a4\ud154`,
    `\uacbd\uc8fc\uc2dc ${dongName} \uc6d0\ub8f8`,
    `\uacbd\uc8fc\uc2dc ${dongName} \ube4c\ub77c`,
    `\ub3d9\uad6d\ub300 WISE ${dongName} \uc6d0\ub8f8`,
    `${dongName} \uc6d0\ub8f8`,
    `${dongName} \ube4c\ub77c`
  ].filter(Boolean);
}

function toPlaceHint(place: {
  place_name: string;
  address_name?: string;
  road_address_name?: string;
  category_name?: string;
}): PlaceHint {
  return {
    name: place.place_name,
    roadAddress: place.road_address_name,
    lotAddress: place.address_name,
    category: place.category_name
  };
}

function toAddressHint(result: {
  address?: { address_name?: string };
  road_address?: { address_name?: string };
}): PlaceHint | undefined {
  const roadAddress = result.road_address?.address_name;
  const lotAddress = result.address?.address_name;
  if (!roadAddress && !lotAddress) return undefined;
  return { roadAddress, lotAddress };
}

function mergeHints(base: PlaceHint | undefined, next: PlaceHint | undefined): PlaceHint | undefined {
  if (!base) return next;
  if (!next) return base;
  return {
    name: next.name ?? base.name,
    roadAddress: next.roadAddress ?? base.roadAddress,
    lotAddress: next.lotAddress ?? base.lotAddress,
    category: next.category ?? base.category
  };
}

function createOverlayContent(building: Building, options: KakaoMapOptions): OverlayParts {
  const root = document.createElement("div");
  const isSelected = building.id === options.selectedId;

  root.className = `kakao-price-overlay ${isSelected ? "selected" : ""}`;
  root.role = "button";
  root.tabIndex = 0;
  root.title = `${building.name} \u00b7 ${overlayMetaLabel(building)} \u00b7 ${overlayPriceLabel(building)}`;
  root.setAttribute("aria-label", root.title);

  const price = document.createElement("strong");
  price.textContent = overlayPriceLabel(building);

  const name = document.createElement("span");
  name.className = "kakao-price-overlay-name";
  name.textContent = building.name;

  const meta = document.createElement("small");
  meta.textContent = overlayMetaLabel(building);

  const candidate = document.createElement("em");
  candidate.className = "kakao-place-candidate";
  candidate.textContent = "\uce74\uce74\uc624 \uc7a5\uc18c \uac80\uc0c9 \uc911";

  root.append(price, name, meta, candidate);

  if (isSelected) {
    const close = document.createElement("button");
    close.className = "kakao-overlay-close";
    close.type = "button";
    close.setAttribute("aria-label", "\uc9c0\ub3c4 \uc120\ud0dd\ucc3d \ub2eb\uae30");
    close.textContent = "×";
    const closeOverlay = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      options.onSelect?.(undefined);
    };
    close.addEventListener("pointerdown", closeOverlay);
    close.addEventListener("mousedown", closeOverlay);
    close.addEventListener("touchstart", closeOverlay);
    close.addEventListener("click", closeOverlay);
    root.append(close);
  }

  root.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest(".kakao-overlay-close")) return;
    options.onSelect?.(building.id);
  });
  root.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      options.onSelect?.(building.id);
    }
  });

  return { root, candidate };
}

function updatePlaceCandidate(
  building: Building,
  parts: OverlayParts,
  hint: PlaceHint | undefined,
  options: KakaoMapOptions
) {
  if (!hint) {
    parts.candidate.textContent = "카카오 후보 없음";
    return;
  }

  const addressLabel = hint.roadAddress
    ? `도로명: ${hint.roadAddress}`
    : hint.lotAddress
      ? `도로명 없음 · 지번: ${hint.lotAddress}`
      : "";
  parts.candidate.textContent = [hint.name ? `카카오 후보: ${hint.name}` : "", addressLabel].filter(Boolean).join(" · ");
  parts.root.title = [building.name, hint.name && `카카오 후보 ${hint.name}`, addressLabel, overlayMetaLabel(building)]
    .filter(Boolean)
    .join(" · ");
  parts.root.setAttribute("aria-label", parts.root.title);
  options.onPlaceHint?.(building.id, hint);
}

function findPlaceCandidate(
  building: Building,
  latitude: number,
  longitude: number,
  geocoder: InstanceType<NonNullable<typeof window.kakao>["maps"]["services"]["Geocoder"]>,
  places: InstanceType<NonNullable<typeof window.kakao>["maps"]["services"]["Places"]>,
  parts: OverlayParts,
  options: KakaoMapOptions,
  seedHint?: PlaceHint
) {
  let currentHint = seedHint;
  if (currentHint) updatePlaceCandidate(building, parts, currentHint, options);

  geocoder.coord2Address(longitude, latitude, (results, searchStatus) => {
    if (searchStatus === window.kakao!.maps.services.Status.OK && results[0]) {
      currentHint = mergeHints(currentHint, toAddressHint(results[0]));
      updatePlaceCandidate(building, parts, currentHint, options);
    }
  });

  const keywords = buildPlaceKeywords(building);
  let index = 0;

  const searchNext = () => {
    const keyword = keywords[index];
    if (!keyword) {
      updatePlaceCandidate(building, parts, currentHint, options);
      return;
    }

    places.keywordSearch(
      keyword,
      (
        results: Array<{
          place_name: string;
          address_name?: string;
          road_address_name?: string;
          category_name?: string;
        }>,
        searchStatus: string
      ) => {
        if (searchStatus === window.kakao!.maps.services.Status.OK && results[0]) {
          currentHint = mergeHints(currentHint, toPlaceHint(results[0]));
          updatePlaceCandidate(building, parts, currentHint, options);
          return;
        }

        index += 1;
        searchNext();
      },
      {
        location: new window.kakao!.maps.LatLng(latitude, longitude),
        radius: 2000,
        size: 5
      }
    );
  };

  searchNext();
}

export function useKakaoMap(buildings: Building[], options: KakaoMapOptions = {}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<"missing-key" | "loading" | "ready" | "error">(
    hasValidKakaoKey ? "loading" : "missing-key"
  );

  useEffect(() => {
    if (!hasValidKakaoKey || !containerRef.current) {
      setStatus("missing-key");
      return;
    }

    let overlays: Array<{ setMap: (map: unknown | null) => void }> = [];
    let isActive = true;

    const mountMap = () => {
      if (!window.kakao?.maps || !containerRef.current) {
        setStatus("error");
        return;
      }

      containerRef.current.innerHTML = "";
      setStatus("loading");

      const initialCenter = options.focus ?? { lat: 35.8628, lng: 129.1956, level: 5 };
      const map = new window.kakao.maps.Map(containerRef.current, {
        center: new window.kakao.maps.LatLng(initialCenter.lat, initialCenter.lng),
        level: initialCenter.level
      });
      const clampReadableZoom = () => {
        const level = map.getLevel?.();
        if (typeof level === "number" && level < MIN_READABLE_LEVEL) {
          map.setLevel?.(MIN_READABLE_LEVEL);
        }
      };

      if (window.kakao.maps.event?.addListener) {
        window.kakao.maps.event.addListener(map, "zoom_changed", clampReadableZoom);
      }

      const geocoder = new window.kakao.maps.services.Geocoder();
      const places = new window.kakao.maps.services.Places();
      const bounds = new window.kakao.maps.LatLngBounds();
      let singlePosition: InstanceType<typeof window.kakao.maps.LatLng> | undefined;
      let pending = buildings.length;
      let mountedCount = 0;

      const finish = () => {
        pending -= 1;
        if (pending > 0) return;

        if (options.useBounds && mountedCount > 1 && initialCenter.level < 10) {
          map.setBounds(bounds);
          window.setTimeout(clampReadableZoom, 0);
        } else if (mountedCount === 1 && singlePosition) {
          map.setCenter(singlePosition);
          map.setLevel?.(Math.min(initialCenter.level, 4));
          clampReadableZoom();
        } else {
          map.setCenter(new window.kakao!.maps.LatLng(initialCenter.lat, initialCenter.lng));
          map.setLevel?.(initialCenter.level);
          clampReadableZoom();
        }

        setStatus("ready");
      };

      if (!buildings.length) {
        map.setCenter(new window.kakao.maps.LatLng(initialCenter.lat, initialCenter.lng));
        map.setLevel?.(initialCenter.level);
        setStatus("ready");
        return;
      }

      const mountOverlay = (building: Building, latitude: number, longitude: number, seedHint?: PlaceHint) => {
        const position = new window.kakao!.maps.LatLng(latitude, longitude);
        bounds.extend(position);
        mountedCount += 1;
        singlePosition = position;

        const parts = createOverlayContent(building, options);
        const overlay = new window.kakao!.maps.CustomOverlay({
          position,
          content: parts.root,
          yAnchor: 1,
          zIndex: building.id === options.selectedId ? 30 : 10
        });

        overlay.setMap(map);
        overlays.push(overlay);
        finish();

        if (isActive) {
          findPlaceCandidate(building, latitude, longitude, geocoder, places, parts, options, seedHint);
        }
      };

      buildings.forEach((building) => {
        if (building.latitude && building.longitude) {
          mountOverlay(building, Number(building.latitude), Number(building.longitude));
          return;
        }

        geocoder.addressSearch(building.address, (result, searchStatus) => {
          if (searchStatus === window.kakao!.maps.services.Status.OK && result[0]) {
            const latitude = Number(result[0].y);
            const longitude = Number(result[0].x);
            options.onResolvedLocation?.(building.id, latitude, longitude);
            mountOverlay(building, latitude, longitude, toAddressHint(result[0]));
            return;
          }

          finish();
        });
      });
    };

    const loadKakaoMap = () => {
      if (!window.kakao?.maps) {
        setStatus("error");
        return;
      }

      if (typeof window.kakao.maps.load === "function") {
        window.kakao.maps.load(mountMap);
        return;
      }

      mountMap();
    };

    if (window.kakao?.maps) {
      loadKakaoMap();
      return () => {
        isActive = false;
        overlays.forEach((overlay) => overlay.setMap(null));
        if (containerRef.current) containerRef.current.innerHTML = "";
      };
    }

    const existingScript = document.getElementById(SDK_ID) as HTMLScriptElement | null;
    if (existingScript) {
      if (window.kakao?.maps) {
        loadKakaoMap();
        return () => {
          isActive = false;
          overlays.forEach((overlay) => overlay.setMap(null));
          if (containerRef.current) containerRef.current.innerHTML = "";
        };
      }

      existingScript.remove();
    }

    const script = document.createElement("script");
    script.id = SDK_ID;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&autoload=false&libraries=services`;
    script.async = true;
    script.onload = loadKakaoMap;
    script.onerror = () => setStatus("error");
    document.head.appendChild(script);

    const timer = window.setTimeout(() => {
      if (!window.kakao?.maps) setStatus("error");
    }, 6000);

    return () => {
      isActive = false;
      window.clearTimeout(timer);
      overlays.forEach((overlay) => overlay.setMap(null));
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [
    buildings,
    options.focus,
    options.onPlaceHint,
    options.onResolvedLocation,
    options.onSelect,
    options.selectedId,
    options.useBounds
  ]);

  return { containerRef, status };
}
