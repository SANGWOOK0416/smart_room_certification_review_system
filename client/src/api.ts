import type { AdminReview, AdminSession, AdminUser, Building, NationwideCollectionStatus, Review, UserSession } from "./types";

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:4000";
const API_BASE_URL = configuredApiBaseUrl.replace("://localhost", "://127.0.0.1");

export async function fetchBuildings(lawdCode?: string, userId?: string, adminToken?: string): Promise<Building[]> {
  const search = new URLSearchParams();
  if (lawdCode) search.set("lawdCode", lawdCode);
  if (userId) search.set("userId", userId);
  const suffix = search.toString() ? `?${search.toString()}` : "";
  const response = await fetch(`${API_BASE_URL}/api/buildings${suffix}`, {
    headers: adminToken ? { "x-admin-token": adminToken } : undefined
  });
  if (!response.ok) throw new Error("건물 목록을 불러오지 못했습니다.");
  return response.json();
}

export async function syncDeals(params: { lawdCode: string; dealYmd: string; kind: string }) {
  const search = new URLSearchParams(params);
  const response = await fetch(`${API_BASE_URL}/api/deals?${search.toString()}`);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? "실거래가를 불러오지 못했습니다.");
  }
  return response.json();
}

async function requestJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {})
    }
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const issueText = Array.isArray(body.issues)
      ? body.issues
          .map((issue: { path?: Array<string | number>; message?: string }) =>
            `${issue.path?.join(".") ?? "입력값"}: ${issue.message ?? "확인이 필요합니다."}`
          )
          .join("\n")
      : "";
    throw new Error(body.message ?? issueText ?? "요청을 처리하지 못했습니다.");
  }
  return response.json();
}

export function registerUser(payload: {
  email: string;
  password: string;
  phone: string;
  nickname: string;
  realName: string;
  birthDate: string;
}) {
  return requestJson<UserSession>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function loginUser(payload: { loginId: string; password: string }) {
  return requestJson<UserSession>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function loginAdmin(payload: { loginId: string; password: string }) {
  return requestJson<AdminSession>("/api/admin/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function fetchReviews(buildingId: string, userId?: string, adminToken?: string) {
  const search = new URLSearchParams({ buildingId });
  if (userId) search.set("userId", userId);
  return requestJson<Review[]>(`/api/reviews?${search.toString()}`, {
    headers: adminToken ? { "x-admin-token": adminToken } : undefined
  });
}

export function updateBuildingLocation(buildingId: string, payload: { latitude: number; longitude: number }) {
  return requestJson<Building>(`/api/buildings/${encodeURIComponent(buildingId)}/location`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function createReview(payload: {
  buildingId: string;
  userId: string;
  buildingName?: string;
  roadAddress?: string;
  reviewAreaSquareM?: number;
  reviewDepositAmount?: number;
  reviewMonthlyRent?: number;
  reviewMaintenanceFee?: number;
  optionItems?: string[];
  rentSatisfaction: number;
  safetyRating: number;
  noiseRating: number;
  landlordRating: number;
  maintenanceRating: number;
  content: string;
  contractFileName: string;
  contractFileUrl: string;
  contractMimeType: string;
}) {
  return requestJson<Review>("/api/reviews", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function createCustomReview(payload: {
  userId: string;
  buildingName: string;
  roadAddress: string;
  lawdCode?: string;
  roomType?: "ONE_ROOM" | "OFFICETEL" | "APARTMENT" | "VILLA" | "DORM_NEARBY";
  reviewAreaSquareM?: number;
  reviewDepositAmount?: number;
  reviewMonthlyRent?: number;
  reviewMaintenanceFee?: number;
  optionItems?: string[];
  rentSatisfaction: number;
  safetyRating: number;
  noiseRating: number;
  landlordRating: number;
  maintenanceRating: number;
  content: string;
  contractFileName: string;
  contractFileUrl: string;
  contractMimeType: string;
}) {
  return requestJson<Review>("/api/reviews/custom", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function fetchMyReviews(userId: string) {
  return requestJson<Review[]>(`/api/users/${encodeURIComponent(userId)}/reviews`);
}

export function updateUserProfile(
  userId: string,
  payload: Partial<{
    email: string;
    phone: string;
    nickname: string;
    realName: string;
    birthDate: string;
    password: string;
  }>
) {
  return requestJson<UserSession>(`/api/users/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function updateMyReview(
  userId: string,
  reviewId: string,
  payload: Partial<{
    buildingId: string;
    buildingName: string;
    roadAddress: string;
    reviewAreaSquareM: number;
    reviewDepositAmount: number;
    reviewMonthlyRent: number;
    reviewMaintenanceFee: number;
    optionItems: string[];
    rentSatisfaction: number;
    safetyRating: number;
    noiseRating: number;
    landlordRating: number;
    maintenanceRating: number;
    content: string;
    contractFileName: string;
    contractFileUrl: string;
    contractMimeType: string;
  }>
) {
  return requestJson<Review>(`/api/users/${encodeURIComponent(userId)}/reviews/${encodeURIComponent(reviewId)}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function deleteMyReview(userId: string, reviewId: string) {
  return requestJson<Review>(`/api/users/${encodeURIComponent(userId)}/reviews/${encodeURIComponent(reviewId)}`, {
    method: "DELETE"
  });
}

export function fetchAdminReviews(token: string, status = "PENDING") {
  return requestJson<AdminReview[]>(`/api/admin/reviews?status=${status}`, {
    headers: { "x-admin-token": token }
  });
}

export function fetchAdminUsers(token: string) {
  return requestJson<AdminUser[]>("/api/admin/users", {
    headers: { "x-admin-token": token }
  });
}

export function decideAdminReview(token: string, reviewId: string, status: "APPROVED" | "REJECTED") {
  return requestJson<AdminReview>(`/api/admin/reviews/${reviewId}/status`, {
    method: "PATCH",
    headers: { "x-admin-token": token },
    body: JSON.stringify({ status })
  });
}

export function deleteAdminReview(token: string, reviewId: string) {
  return requestJson<AdminReview>(`/api/admin/reviews/${encodeURIComponent(reviewId)}`, {
    method: "DELETE",
    headers: { "x-admin-token": token }
  });
}

export function fetchNationwideCollectionStatus(token: string) {
  return requestJson<NationwideCollectionStatus>("/api/admin/collection/nationwide", {
    headers: { "x-admin-token": token }
  });
}

export function startNationwideCollection(token: string, payload: { monthsBack?: number } = { monthsBack: 2 }) {
  return requestJson<NationwideCollectionStatus>("/api/admin/collection/nationwide", {
    method: "POST",
    headers: { "x-admin-token": token },
    body: JSON.stringify(payload)
  });
}
