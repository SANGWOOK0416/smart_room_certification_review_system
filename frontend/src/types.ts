export type Transaction = {
  id: string;
  dealType: "SALE" | "JEONSE" | "MONTHLY_RENT";
  dealYear: number;
  dealMonth: number;
  dealDay?: number;
  depositAmount?: number;
  monthlyAmount?: number;
  saleAmount?: number;
  areaSquareM?: string;
};

export type Review = {
  id: string;
  buildingId?: string;
  userId?: string;
  reviewBuildingName?: string;
  reviewRoadAddress?: string;
  reviewAreaSquareM?: string;
  reviewDepositAmount?: number;
  reviewMonthlyRent?: number;
  reviewMaintenanceFee?: number;
  optionItems?: string;
  safetyRating: number;
  rentSatisfaction: number;
  noiseRating: number;
  landlordRating: number;
  maintenanceRating: number;
  content: string;
  verificationStatus?: "PENDING" | "APPROVED" | "REJECTED";
  createdAt?: string;
  updatedAt?: string;
  user?: { nickname: string; realName?: string };
  building?: Building;
  verificationDocs?: Array<{
    id?: string;
    fileName?: string;
    fileUrl?: string;
    mimeType?: string;
    status?: "PENDING" | "APPROVED" | "REJECTED";
  }>;
};

export type Building = {
  id: string;
  name: string;
  address: string;
  lawdCode: string;
  latitude?: string;
  longitude?: string;
  roomType: string;
  safetyScore?: string;
  transactions: Transaction[];
  reviews: Review[];
};

export type PlaceHint = {
  name?: string;
  roadAddress?: string;
  lotAddress?: string;
  category?: string;
};

export type UserSession = {
  id: string;
  loginId: string;
  email?: string;
  phone?: string;
  nickname: string;
  realName?: string;
  birthDate?: string;
  role: "USER" | "ADMIN";
};

export type AdminSession = {
  token: string;
  admin: {
    id: string;
    loginId: string;
    nickname: string;
    role: "ADMIN";
  };
};

export type AdminReview = Review & {
  building: Building;
  user?: {
    id: string;
    nickname: string;
    realName?: string;
    email?: string;
    phone?: string;
    birthDate?: string;
  };
};

export type AdminUser = {
  id: string;
  loginId: string;
  email?: string;
  phone?: string;
  nickname: string;
  realName?: string;
  birthDate?: string;
  createdAt?: string;
  _count?: { reviews: number };
  reviews?: Array<{
    id: string;
    verificationStatus: "PENDING" | "APPROVED" | "REJECTED";
    reviewBuildingName?: string;
    reviewRoadAddress?: string;
    reviewAreaSquareM?: string;
    reviewDepositAmount?: number;
    reviewMonthlyRent?: number;
    reviewMaintenanceFee?: number;
    optionItems?: string;
    rentSatisfaction: number;
    safetyRating: number;
    noiseRating: number;
    landlordRating: number;
    maintenanceRating: number;
    content: string;
    createdAt?: string;
    building?: {
      id: string;
      name: string;
      address: string;
    };
  }>;
};

export type NationwideCollectionStatus = {
  running: boolean;
  startedAt?: string;
  finishedAt?: string;
  totalTasks: number;
  completedTasks: number;
  savedDeals: number;
  failedTasks: number;
  currentTask?: string;
  errors: Array<{ task: string; message: string }>;
};

type KakaoAddressSearchResult = {
  x: string;
  y: string;
  address?: { address_name?: string };
  road_address?: { address_name?: string };
};

type KakaoCoordAddressResult = {
  address?: { address_name?: string };
  road_address?: { address_name?: string };
};

type KakaoPlaceSearchResult = {
  place_name: string;
  address_name?: string;
  road_address_name?: string;
  category_name?: string;
};

declare global {
  interface Window {
    kakao?: {
      maps: {
        load: (callback: () => void) => void;
        LatLng: new (lat: number, lng: number) => unknown;
        LatLngBounds: new () => {
          extend: (latlng: unknown) => void;
        };
        Map: new (container: HTMLElement, options: unknown) => {
          setBounds: (bounds: unknown) => void;
          setCenter: (latlng: unknown) => void;
          getLevel?: () => number;
          setLevel?: (level: number) => void;
        };
        Marker: new (options: unknown) => { setMap: (map: unknown) => void };
        CustomOverlay: new (options: unknown) => { setMap: (map: unknown | null) => void };
        services: {
          Status: { OK: string };
          Geocoder: new () => {
            addressSearch: (
              address: string,
              callback: (result: KakaoAddressSearchResult[], status: string) => void
            ) => void;
            coord2Address: (
              x: number,
              y: number,
              callback: (result: KakaoCoordAddressResult[], status: string) => void
            ) => void;
          };
          Places: new () => {
            keywordSearch: (
              keyword: string,
              callback: (result: KakaoPlaceSearchResult[], status: string) => void,
              options?: unknown
            ) => void;
          };
        };
        event?: {
          addListener: (target: unknown, eventName: string, handler: () => void) => void;
        };
      };
    };
  }
}
