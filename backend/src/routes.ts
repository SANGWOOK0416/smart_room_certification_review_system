import crypto from "node:crypto";
import { DealType, RoomType, UserRole, VerificationStatus } from "@prisma/client";
import { Request, Router } from "express";
import { z } from "zod";
import { prisma } from "./db.js";
import { withLawdAddressPrefix } from "./lawdPrefixes.js";
import { fetchMolitDeals, MolitDealKind } from "./molit.js";
import { getNationwideCollectionStatus, startNationwideCollection } from "./nationwideCollector.js";

export const router = Router();

const adminToken = "demo-admin-token";
const buildingCache = new Map<string, { expiresAt: number; payload: unknown }>();
const buildingCacheTtlMs = 15_000;

function hashPassword(password: string) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

async function ensureAdminUser() {
  const existing = await prisma.user.findUnique({ where: { loginId: "admin" } });
  if (existing) {
    const nextPasswordHash = hashPassword("admin");
    if (existing.passwordHash === nextPasswordHash && existing.role === UserRole.ADMIN) {
      return existing;
    }

    return prisma.user.update({
      where: { id: existing.id },
      data: {
        passwordHash: nextPasswordHash,
        role: UserRole.ADMIN
      }
    });
  }

  return prisma.user.create({
    data: {
      loginId: "admin",
      passwordHash: hashPassword("admin"),
      role: UserRole.ADMIN,
      nickname: "관리자",
      realName: "관리자"
    }
  });
}

function isAdminRequest(req: Request) {
  return req.headers["x-admin-token"] === adminToken;
}

function getBuildingCacheKey(req: Request) {
  const lawdCode = typeof req.query.lawdCode === "string" ? req.query.lawdCode : "";
  const userId = typeof req.query.userId === "string" ? req.query.userId : "";
  const keyword = typeof req.query.keyword === "string" ? req.query.keyword.trim() : "";
  return JSON.stringify({
    lawdCode,
    userId,
    keyword,
    admin: isAdminRequest(req)
  });
}

function readBuildingCache(key: string) {
  const cached = buildingCache.get(key);
  if (!cached || cached.expiresAt < Date.now()) {
    buildingCache.delete(key);
    return undefined;
  }
  return cached.payload;
}

function writeBuildingCache(key: string, payload: unknown) {
  buildingCache.set(key, {
    expiresAt: Date.now() + buildingCacheTtlMs,
    payload
  });
}

function clearBuildingCache() {
  buildingCache.clear();
}

const userRegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
  phone: z.string().min(8),
  nickname: z.string().min(2),
  realName: z.string().min(2),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

const loginSchema = z.object({
  loginId: z.string().min(1),
  password: z.string().min(1)
});

const userProfileSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(8).optional(),
  nickname: z.string().min(2).optional(),
  realName: z.string().min(2).optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  password: z.string().min(4).optional()
});

const publicUserSelect = {
  id: true,
  loginId: true,
  email: true,
  phone: true,
  nickname: true,
  realName: true,
  birthDate: true,
  role: true
} as const;

const loginUserSelect = {
  ...publicUserSelect,
  passwordHash: true
} as const;

router.post("/auth/register", async (req, res, next) => {
  try {
    const payload = userRegisterSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { loginId: payload.email } });
    if (existing) {
      res.status(409).json({ message: "이미 가입된 이메일입니다." });
      return;
    }

    const user = await prisma.user.create({
      data: {
        loginId: payload.email,
        email: payload.email,
        passwordHash: hashPassword(payload.password),
        phone: payload.phone,
        nickname: payload.nickname,
        realName: payload.realName,
        birthDate: new Date(`${payload.birthDate}T00:00:00.000Z`),
        role: UserRole.USER
      },
      select: {
        id: true,
        loginId: true,
        email: true,
        phone: true,
        nickname: true,
        realName: true,
        birthDate: true,
        role: true
      }
    });

    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

router.post("/auth/login", async (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { loginId: payload.loginId },
      select: loginUserSelect
    });
    if (!user || user.passwordHash !== hashPassword(payload.password) || user.role !== UserRole.USER) {
      res.status(401).json({ message: "이메일 또는 비밀번호를 확인해주세요." });
      return;
    }

    res.json({
      id: user.id,
      loginId: user.loginId,
      email: user.email,
      phone: user.phone,
      nickname: user.nickname,
      realName: user.realName,
      birthDate: user.birthDate,
      role: user.role
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/users/:userId", async (req, res, next) => {
  try {
    const payload = userProfileSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.params.userId } });
    if (!user || user.role !== UserRole.USER) {
      res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
      return;
    }

    if (payload.email && payload.email !== user.email) {
      const existing = await prisma.user.findUnique({ where: { loginId: payload.email } });
      if (existing) {
        res.status(409).json({ message: "이미 사용 중인 이메일입니다." });
        return;
      }
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(payload.email ? { email: payload.email, loginId: payload.email } : {}),
        ...(payload.phone ? { phone: payload.phone } : {}),
        ...(payload.nickname ? { nickname: payload.nickname } : {}),
        ...(payload.realName ? { realName: payload.realName } : {}),
        ...(payload.birthDate ? { birthDate: new Date(`${payload.birthDate}T00:00:00.000Z`) } : {}),
        ...(payload.password ? { passwordHash: hashPassword(payload.password) } : {})
      },
      select: publicUserSelect
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.post("/admin/login", async (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body);
    const admin = await ensureAdminUser();
    if (payload.loginId !== admin.loginId || hashPassword(payload.password) !== admin.passwordHash) {
      res.status(401).json({ message: "관리자 아이디 또는 비밀번호를 확인해주세요." });
      return;
    }

    res.json({
      token: adminToken,
      admin: {
        id: admin.id,
        loginId: admin.loginId,
        nickname: admin.nickname,
        role: admin.role
      }
    });
  } catch (error) {
    next(error);
  }
});

const dealQuerySchema = z.object({
  lawdCode: z.string().regex(/^\d{5}$/),
  dealYmd: z.string().regex(/^\d{6}$/),
  kind: z.enum(["aptTrade", "aptRent", "officetelRent", "rowHouseRent", "singleHouseRent"]).default("singleHouseRent")
});

function roomTypeForKind(kind: MolitDealKind) {
  if (kind === "officetelRent") return RoomType.OFFICETEL;
  if (kind === "rowHouseRent") return RoomType.VILLA;
  if (kind === "singleHouseRent") return RoomType.ONE_ROOM;
  return RoomType.APARTMENT;
}

router.get("/buildings", async (req, res, next) => {
  try {
    const cacheKey = getBuildingCacheKey(req);
    const cached = readBuildingCache(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const lawdCode = typeof req.query.lawdCode === "string" ? req.query.lawdCode : undefined;
    const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
    const keyword = typeof req.query.keyword === "string" ? req.query.keyword.trim() : "";
    const isAdmin = isAdminRequest(req);
    const buildingWhere = {
      ...(lawdCode ? { lawdCode } : {}),
      ...(keyword
        ? {
            AND: [
              {
                OR: [
                  { name: { contains: keyword, mode: "insensitive" as const } },
                  { address: { contains: keyword, mode: "insensitive" as const } },
                  { reviews: { some: { reviewBuildingName: { contains: keyword, mode: "insensitive" as const } } } },
                  { reviews: { some: { reviewRoadAddress: { contains: keyword, mode: "insensitive" as const } } } }
                ]
              }
            ]
          }
        : {}),
      OR: [
        { transactions: { some: {} } },
        { reviews: { some: { verificationStatus: VerificationStatus.APPROVED } } },
        ...(isAdmin ? [{ reviews: { some: {} } }] : []),
        ...(userId ? [{ reviews: { some: { userId } } }] : [])
      ]
    };
    const buildingInclude = {
      include: {
        reviews: {
          where: isAdmin
            ? undefined
            : {
                OR: [{ verificationStatus: VerificationStatus.APPROVED }, ...(userId ? [{ userId }] : [])]
              },
          select: {
            id: true,
            userId: true,
            buildingId: true,
            reviewBuildingName: true,
            reviewRoadAddress: true,
            reviewAreaSquareM: true,
            safetyRating: true,
            rentSatisfaction: true,
            noiseRating: true,
            landlordRating: true,
            maintenanceRating: true,
            content: true,
            reviewDepositAmount: true,
            reviewMonthlyRent: true,
            reviewMaintenanceFee: true,
            optionItems: true,
            verificationStatus: true,
            createdAt: true
          }
        },
        transactions: {
          orderBy: [{ dealYear: "desc" as const }, { dealMonth: "desc" as const }],
          take: 24
        }
      }
    };

    if (!lawdCode && !keyword) {
      const lawdBuckets = await prisma.building.findMany({
        where: buildingWhere,
        distinct: ["lawdCode"],
        select: { lawdCode: true },
        orderBy: { lawdCode: "asc" }
      });

      const perRegion = [];
      for (const bucketBatch of chunk(lawdBuckets, 6)) {
        perRegion.push(
          ...(await Promise.all(
            bucketBatch.map((bucket) =>
              prisma.building.findMany({
                where: { ...buildingWhere, lawdCode: bucket.lawdCode },
                ...buildingInclude,
                orderBy: { updatedAt: "desc" },
                take: 4
              })
            )
          ))
        );
      }

      const payload = mergeBuildingRecords(perRegion.flat()).map(normalizeBuildingAddress);
      writeBuildingCache(cacheKey, payload);
      res.json(payload);
      return;
    }

    const buildings = await prisma.building.findMany({
      where: buildingWhere,
      ...buildingInclude,
      orderBy: { updatedAt: "desc" },
      take: 200
    });

    const payload = mergeBuildingRecords(buildings).map(normalizeBuildingAddress);
    writeBuildingCache(cacheKey, payload);
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function normalizeBuildingAddress<T extends { lawdCode: string; address: string }>(building: T): T {
  return {
    ...building,
    address: withLawdAddressPrefix(building.lawdCode, building.address)
  };
}

const buildingLocationSchema = z.object({
  latitude: z.coerce.number(),
  longitude: z.coerce.number()
});

router.patch("/buildings/:id/location", async (req, res, next) => {
  try {
    const id = z.string().min(1).parse(req.params.id);
    const payload = buildingLocationSchema.parse(req.body);
    const building = await prisma.building.update({
      where: { id },
      data: {
        latitude: payload.latitude,
        longitude: payload.longitude
      }
    });
    clearBuildingCache();
    res.json(building);
  } catch (error) {
    next(error);
  }
});

router.get("/deals", async (req, res, next) => {
  try {
    const query = dealQuerySchema.parse(req.query);
    const deals = await fetchMolitDeals({
      kind: query.kind as MolitDealKind,
      lawdCode: query.lawdCode,
      dealYmd: query.dealYmd
    });

    const saved = await Promise.all(
      deals.map(async (deal) => {
        const building = await prisma.building.upsert({
          where: {
            name_address: {
              name: deal.buildingName,
              address: deal.address
            }
          },
          create: {
            name: deal.buildingName,
            address: deal.address,
            lawdCode: deal.lawdCode,
            roomType: roomTypeForKind(query.kind as MolitDealKind)
          },
          update: {
            lawdCode: deal.lawdCode
          }
        });

        return prisma.transaction.upsert({
          where: { sourceKey: deal.sourceKey },
          create: {
            buildingId: building.id,
            dealType: deal.dealType as DealType,
            dealYear: deal.dealYear,
            dealMonth: deal.dealMonth,
            dealDay: deal.dealDay,
            depositAmount: deal.depositAmount,
            monthlyAmount: deal.monthlyAmount,
            saleAmount: deal.saleAmount,
            areaSquareM: deal.areaSquareM,
            floor: deal.floor,
            sourceKey: deal.sourceKey
          },
          update: {
            fetchedAt: new Date()
          },
          include: { building: true }
        });
      })
    );

    res.json({ count: saved.length, deals: saved });
  } catch (error) {
    next(error);
  }
});

const reviewSchema = z.object({
  buildingId: z.string().min(1),
  userId: z.string().min(1),
  buildingName: z.string().trim().min(1).max(120).optional(),
  roadAddress: z.string().trim().min(1).max(240).optional(),
  reviewAreaSquareM: z.coerce.number().positive().max(9999).optional(),
  reviewDepositAmount: z.coerce.number().int().min(0).optional(),
  reviewMonthlyRent: z.coerce.number().int().min(0).optional(),
  reviewMaintenanceFee: z.coerce.number().int().min(0).optional(),
  optionItems: z.array(z.enum(["에어컨", "전자레인지", "세탁기", "건조기", "냉장고", "옷장", "책상"])).default([]),
  rentSatisfaction: z.coerce.number().int().min(1).max(5),
  safetyRating: z.coerce.number().int().min(1).max(5),
  noiseRating: z.coerce.number().int().min(1).max(5),
  landlordRating: z.coerce.number().int().min(1).max(5),
  maintenanceRating: z.coerce.number().int().min(1).max(5),
  content: z.string().trim().min(1, "리뷰 내용을 입력해주세요.").max(2000),
  contractFileName: z.string().min(1),
  contractFileUrl: z.string().min(1),
  contractMimeType: z.string().min(1)
});

const reviewEditSchema = reviewSchema
  .omit({ buildingId: true, userId: true })
  .partial()
  .extend({
    buildingId: z.string().min(1).optional(),
    contractFileName: z.string().min(1).optional(),
    contractFileUrl: z.string().min(1).optional(),
    contractMimeType: z.string().min(1).optional()
  });

const customReviewSchema = reviewSchema.omit({ buildingId: true }).extend({
  buildingName: z.string().trim().min(1).max(120),
  roadAddress: z.string().trim().min(1).max(240),
  lawdCode: z.string().regex(/^\d{5}$/).default("47130"),
  roomType: z.nativeEnum(RoomType).default(RoomType.ONE_ROOM)
});

function serializeOptions(options?: string[]) {
  return Array.from(new Set(options ?? [])).join(",");
}

async function upsertReviewTransaction(reviewId: string) {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: { building: true }
  });
  if (!review || review.verificationStatus !== VerificationStatus.APPROVED) {
    return;
  }

  const createdAt = review.createdAt ?? new Date();
  const dealType = review.reviewMonthlyRent != null ? DealType.MONTHLY_RENT : DealType.JEONSE;
  await prisma.transaction.upsert({
    where: { sourceKey: `review:${review.id}` },
    create: {
      buildingId: review.buildingId,
      dealType,
      dealYear: createdAt.getFullYear(),
      dealMonth: createdAt.getMonth() + 1,
      dealDay: createdAt.getDate(),
      depositAmount: review.reviewDepositAmount,
      monthlyAmount: review.reviewMonthlyRent,
      areaSquareM: review.reviewAreaSquareM,
      source: "REVIEW_VERIFICATION",
      sourceKey: `review:${review.id}`
    },
    update: {
      buildingId: review.buildingId,
      dealType,
      dealYear: createdAt.getFullYear(),
      dealMonth: createdAt.getMonth() + 1,
      dealDay: createdAt.getDate(),
      depositAmount: review.reviewDepositAmount,
      monthlyAmount: review.reviewMonthlyRent,
      areaSquareM: review.reviewAreaSquareM,
      fetchedAt: new Date()
    }
  });
}

async function deleteReviewTransaction(reviewId: string) {
  await prisma.transaction.deleteMany({ where: { sourceKey: `review:${reviewId}` } });
}

function normalizeAddressForMatch(address?: string | null) {
  return (address ?? "")
    .replace(/\s+/g, "")
    .trim()
    .toLowerCase();
}

function canonicalBuildingGroupKey(building: { address: string; name: string; lawdCode: string }) {
  const normalizedAddress = normalizeAddressForMatch(building.address);
  return normalizedAddress ? `${building.lawdCode}:${normalizedAddress}` : `${building.lawdCode}:${building.name.trim().toLowerCase()}`;
}

function mergeBuildingRecords<T extends {
  id: string;
  name: string;
  address: string;
  lawdCode: string;
  createdAt?: Date;
  updatedAt?: Date;
  latitude?: unknown;
  longitude?: unknown;
  roomType: RoomType;
  safetyScore?: unknown;
  reviews: Array<{ id: string; createdAt?: Date }>;
  transactions: Array<{ id: string; dealYear: number; dealMonth: number }>;
}>(items: T[]) {
  const grouped = new Map<string, T[]>();
  for (const item of items) {
    const key = canonicalBuildingGroupKey(item);
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }

  return [...grouped.values()].map((group) => {
    const [primary, ...rest] = [...group].sort((a, b) => {
      const updatedDelta = (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0);
      if (updatedDelta !== 0) return updatedDelta;
      return (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0);
    });

    if (!rest.length) return primary;

    const mergedReviews = [...group.flatMap((item) => item.reviews)].filter(
      (review, index, array) => array.findIndex((candidate) => candidate.id === review.id) === index
    );
    const mergedTransactions = [...group.flatMap((item) => item.transactions)]
      .filter((transaction, index, array) => array.findIndex((candidate) => candidate.id === transaction.id) === index)
      .sort((a, b) => {
        const yearDelta = b.dealYear - a.dealYear;
        if (yearDelta !== 0) return yearDelta;
        return b.dealMonth - a.dealMonth;
      });

    const addressRichest = [...group].sort((a, b) => b.address.length - a.address.length)[0];

    return {
      ...primary,
      name: primary.name || addressRichest.name,
      address: addressRichest.address,
      latitude: primary.latitude ?? addressRichest.latitude,
      longitude: primary.longitude ?? addressRichest.longitude,
      roomType: primary.roomType ?? addressRichest.roomType,
      safetyScore: primary.safetyScore ?? addressRichest.safetyScore,
      reviews: mergedReviews,
      transactions: mergedTransactions
    };
  });
}

async function findBuildingsByCanonicalAddress(roadAddress?: string | null) {
  const normalized = normalizeAddressForMatch(roadAddress);
  if (!normalized) return [];

  const buildings = await prisma.building.findMany({
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }]
  });

  return buildings.filter((building) => normalizeAddressForMatch(building.address) === normalized);
}

async function findBuildingByRoadAddress(roadAddress?: string) {
  const [building] = await findBuildingsByCanonicalAddress(roadAddress);
  return building ?? null;
}

async function resolveReviewBuilding(payload: {
  buildingId: string;
  buildingName?: string;
  roadAddress?: string;
}) {
  const baseBuilding = await prisma.building.findUnique({ where: { id: payload.buildingId } });
  if (!baseBuilding) return null;

  if (!payload.buildingName || !payload.roadAddress) return baseBuilding;

  const matchedByAddress = await findBuildingByRoadAddress(payload.roadAddress);
  if (matchedByAddress) return matchedByAddress;

  return prisma.building.upsert({
    where: {
      name_address: {
        name: payload.buildingName,
        address: payload.roadAddress
      }
    },
    create: {
      name: payload.buildingName,
      address: payload.roadAddress,
      lawdCode: baseBuilding.lawdCode,
      roomType: baseBuilding.roomType
    },
    update: {
      lawdCode: baseBuilding.lawdCode,
      roomType: baseBuilding.roomType
    }
  });
}

router.get("/reviews", async (req, res, next) => {
  try {
    const buildingId = z.string().min(1).parse(req.query.buildingId);
    const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
    const isAdmin = isAdminRequest(req);
    const building = await prisma.building.findUnique({ where: { id: buildingId } });
    if (!building) {
      res.json([]);
      return;
    }

    const relatedBuildings = await findBuildingsByCanonicalAddress(building.address);
    const relatedBuildingIds = relatedBuildings.length ? relatedBuildings.map((item) => item.id) : [buildingId];
    const reviews = await prisma.review.findMany({
      where: {
        buildingId: { in: relatedBuildingIds },
        ...(isAdmin
          ? {}
          : {
              OR: [{ verificationStatus: VerificationStatus.APPROVED }, ...(userId ? [{ userId }] : [])]
            })
      },
      include: {
        user: { select: { nickname: true, realName: true } },
        verificationDocs: { select: { status: true } }
      },
      orderBy: { createdAt: "desc" }
    });
    res.json(reviews);
  } catch (error) {
    next(error);
  }
});

router.post("/reviews", async (req, res, next) => {
  try {
    const payload = reviewSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || user.role !== UserRole.USER) {
      res.status(403).json({ message: "로그인한 사용자만 계약서 인증 리뷰를 등록할 수 있습니다." });
      return;
    }

    const targetBuilding = await resolveReviewBuilding(payload);
    if (!targetBuilding) {
      res.status(404).json({ message: "건물 정보를 찾을 수 없습니다." });
      return;
    }

    const review = await prisma.review.create({
      data: {
        buildingId: targetBuilding.id,
        userId: payload.userId,
        reviewBuildingName: payload.buildingName ?? targetBuilding.name,
        reviewRoadAddress: payload.roadAddress ?? targetBuilding.address,
        reviewAreaSquareM: payload.reviewAreaSquareM,
        reviewDepositAmount: payload.reviewDepositAmount,
        reviewMonthlyRent: payload.reviewMonthlyRent,
        reviewMaintenanceFee: payload.reviewMaintenanceFee,
        optionItems: serializeOptions(payload.optionItems),
        rentSatisfaction: payload.rentSatisfaction,
        safetyRating: payload.safetyRating,
        noiseRating: payload.noiseRating,
        landlordRating: payload.landlordRating,
        maintenanceRating: payload.maintenanceRating,
        content: payload.content,
        verificationStatus: VerificationStatus.PENDING,
        verificationDocs: {
          create: {
            fileName: payload.contractFileName,
            fileUrl: payload.contractFileUrl,
            mimeType: payload.contractMimeType,
            status: VerificationStatus.PENDING
          }
        }
      },
      include: { verificationDocs: true }
    });
    clearBuildingCache();
    res.status(201).json(review);
  } catch (error) {
    next(error);
  }
});

router.post("/reviews/custom", async (req, res, next) => {
  try {
    const payload = customReviewSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || user.role !== UserRole.USER) {
      res.status(403).json({ message: "로그인한 사용자만 계약서 인증 리뷰를 등록할 수 있습니다." });
      return;
    }

    const building =
      (await findBuildingByRoadAddress(payload.roadAddress)) ??
      (await prisma.building.upsert({
        where: {
          name_address: {
            name: payload.buildingName,
            address: payload.roadAddress
          }
        },
        create: {
          name: payload.buildingName,
          address: payload.roadAddress,
          lawdCode: payload.lawdCode,
          roomType: payload.roomType
        },
        update: {
          lawdCode: payload.lawdCode,
          roomType: payload.roomType
        }
      }));

    const review = await prisma.review.create({
      data: {
        buildingId: building.id,
        userId: payload.userId,
        reviewBuildingName: payload.buildingName,
        reviewRoadAddress: payload.roadAddress,
        reviewAreaSquareM: payload.reviewAreaSquareM,
        reviewDepositAmount: payload.reviewDepositAmount,
        reviewMonthlyRent: payload.reviewMonthlyRent,
        reviewMaintenanceFee: payload.reviewMaintenanceFee,
        optionItems: serializeOptions(payload.optionItems),
        rentSatisfaction: payload.rentSatisfaction,
        safetyRating: payload.safetyRating,
        noiseRating: payload.noiseRating,
        landlordRating: payload.landlordRating,
        maintenanceRating: payload.maintenanceRating,
        content: payload.content,
        verificationStatus: VerificationStatus.PENDING,
        verificationDocs: {
          create: {
            fileName: payload.contractFileName,
            fileUrl: payload.contractFileUrl,
            mimeType: payload.contractMimeType,
            status: VerificationStatus.PENDING
          }
        }
      },
      include: { building: true, verificationDocs: true }
    });
    clearBuildingCache();

    res.status(201).json(review);
  } catch (error) {
    next(error);
  }
});

router.get("/users/:userId/reviews", async (req, res, next) => {
  try {
    const userId = z.string().min(1).parse(req.params.userId);
    const reviews = await prisma.review.findMany({
      where: { userId },
      include: {
        building: true,
        verificationDocs: true
      },
      orderBy: { updatedAt: "desc" }
    });
    res.json(reviews);
  } catch (error) {
    next(error);
  }
});

router.patch("/users/:userId/reviews/:reviewId", async (req, res, next) => {
  try {
    const userId = z.string().min(1).parse(req.params.userId);
    const reviewId = z.string().min(1).parse(req.params.reviewId);
    const payload = reviewEditSchema.parse(req.body);

    const existing = await prisma.review.findFirst({ where: { id: reviewId, userId }, include: { building: true } });
    if (!existing) {
      res.status(404).json({ message: "수정할 리뷰를 찾을 수 없습니다." });
      return;
    }

    const targetBuilding = payload.buildingId
      ? await resolveReviewBuilding({
          buildingId: payload.buildingId,
          buildingName: payload.buildingName,
          roadAddress: payload.roadAddress
        })
      : existing.building;

    if (!targetBuilding) {
      res.status(404).json({ message: "건물 정보를 찾을 수 없습니다." });
      return;
    }

    const hasNewContract = Boolean(payload.contractFileName && payload.contractFileUrl && payload.contractMimeType);
    const review = await prisma.review.update({
      where: { id: reviewId },
      data: {
        buildingId: targetBuilding.id,
        reviewBuildingName: payload.buildingName ?? existing.reviewBuildingName ?? targetBuilding.name,
        reviewRoadAddress: payload.roadAddress ?? existing.reviewRoadAddress ?? targetBuilding.address,
        reviewAreaSquareM: payload.reviewAreaSquareM ?? existing.reviewAreaSquareM,
        reviewDepositAmount: payload.reviewDepositAmount ?? existing.reviewDepositAmount,
        reviewMonthlyRent: payload.reviewMonthlyRent ?? existing.reviewMonthlyRent,
        reviewMaintenanceFee: payload.reviewMaintenanceFee ?? existing.reviewMaintenanceFee,
        optionItems: payload.optionItems ? serializeOptions(payload.optionItems) : existing.optionItems,
        rentSatisfaction: payload.rentSatisfaction ?? existing.rentSatisfaction,
        safetyRating: payload.safetyRating ?? existing.safetyRating,
        noiseRating: payload.noiseRating ?? existing.noiseRating,
        landlordRating: payload.landlordRating ?? existing.landlordRating,
        maintenanceRating: payload.maintenanceRating ?? existing.maintenanceRating,
        content: payload.content ?? existing.content,
        verificationStatus: VerificationStatus.PENDING,
        ...(hasNewContract
          ? {
              verificationDocs: {
                create: {
                  fileName: payload.contractFileName!,
                  fileUrl: payload.contractFileUrl!,
                  mimeType: payload.contractMimeType!,
                  status: VerificationStatus.PENDING
                }
              }
            }
          : {
              verificationDocs: {
                updateMany: {
                  where: { reviewId },
                  data: { status: VerificationStatus.PENDING }
                }
              }
            })
      },
      include: { building: true, verificationDocs: true }
    });
    await deleteReviewTransaction(reviewId);
    clearBuildingCache();

    res.json(review);
  } catch (error) {
    next(error);
  }
});

router.delete("/users/:userId/reviews/:reviewId", async (req, res, next) => {
  try {
    const userId = z.string().min(1).parse(req.params.userId);
    const reviewId = z.string().min(1).parse(req.params.reviewId);
    const existing = await prisma.review.findFirst({
      where: { id: reviewId, userId },
      include: { building: true, verificationDocs: true }
    });

    if (!existing) {
      res.status(404).json({ message: "삭제할 리뷰를 찾을 수 없습니다." });
      return;
    }

    await deleteReviewTransaction(reviewId);
    await prisma.review.delete({ where: { id: reviewId } });
    clearBuildingCache();
    res.json(existing);
  } catch (error) {
    next(error);
  }
});

const verificationSchema = z.object({
  reviewId: z.string().min(1),
  fileName: z.string().min(1),
  fileUrl: z.string().url(),
  mimeType: z.string().min(1)
});

router.post("/verifications", async (req, res, next) => {
  try {
    const payload = verificationSchema.parse(req.body);
    const document = await prisma.verificationDocument.create({ data: payload });
    res.status(201).json(document);
  } catch (error) {
    next(error);
  }
});

router.get("/admin/reviews", async (req, res, next) => {
  try {
    if (!isAdminRequest(req)) {
      res.status(401).json({ message: "관리자 로그인이 필요합니다." });
      return;
    }

    const status = z
      .enum(["PENDING", "APPROVED", "REJECTED"])
      .optional()
      .parse(req.query.status);

    const reviews = await prisma.review.findMany({
      where: status ? { verificationStatus: status as VerificationStatus } : undefined,
      include: {
        building: true,
        user: { select: { id: true, nickname: true, realName: true, email: true, phone: true, birthDate: true } },
        verificationDocs: true
      },
      orderBy: { createdAt: "desc" }
    });

    res.json(reviews);
  } catch (error) {
    next(error);
  }
});

router.get("/admin/users", async (req, res, next) => {
  try {
    if (!isAdminRequest(req)) {
      res.status(401).json({ message: "관리자 로그인이 필요합니다." });
      return;
    }

    const users = await prisma.user.findMany({
      where: { role: UserRole.USER },
      select: {
        id: true,
        loginId: true,
        email: true,
        phone: true,
        nickname: true,
        realName: true,
        birthDate: true,
        createdAt: true,
        _count: { select: { reviews: true } },
        reviews: {
          select: {
            id: true,
            verificationStatus: true,
            reviewBuildingName: true,
            reviewRoadAddress: true,
            reviewAreaSquareM: true,
            reviewDepositAmount: true,
            reviewMonthlyRent: true,
            reviewMaintenanceFee: true,
            optionItems: true,
            rentSatisfaction: true,
            safetyRating: true,
            noiseRating: true,
            landlordRating: true,
            maintenanceRating: true,
            content: true,
            createdAt: true,
            building: {
              select: {
                id: true,
                name: true,
                address: true
              }
            }
          },
          orderBy: { createdAt: "desc" }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json(users);
  } catch (error) {
    next(error);
  }
});

const adminDecisionSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"])
});

const collectionStartSchema = z.object({
  monthsBack: z.coerce.number().int().min(1).max(12).optional(),
  dealYmds: z.array(z.string().regex(/^\d{6}$/)).min(1).max(24).optional(),
  lawdCodes: z.array(z.string().regex(/^\d{5}$/)).min(1).max(300).optional(),
  kinds: z.array(z.enum(["aptTrade", "aptRent", "officetelRent", "rowHouseRent", "singleHouseRent"])).min(1).max(5).optional()
});

router.get("/admin/collection/nationwide", async (req, res) => {
  if (!isAdminRequest(req)) {
    res.status(401).json({ message: "관리자 로그인이 필요합니다." });
    return;
  }

  res.json(getNationwideCollectionStatus());
});

router.post("/admin/collection/nationwide", async (req, res, next) => {
  try {
    if (!isAdminRequest(req)) {
      res.status(401).json({ message: "관리자 로그인이 필요합니다." });
      return;
    }

    const payload = collectionStartSchema.parse(req.body ?? {});
    res.status(202).json(
      startNationwideCollection({
        monthsBack: payload.monthsBack,
        dealYmds: payload.dealYmds,
        lawdCodes: payload.lawdCodes,
        kinds: payload.kinds as MolitDealKind[] | undefined
      })
    );
  } catch (error) {
    next(error);
  }
});

router.patch("/admin/reviews/:id/status", async (req, res, next) => {
  try {
    if (!isAdminRequest(req)) {
      res.status(401).json({ message: "관리자 로그인이 필요합니다." });
      return;
    }

    const { status } = adminDecisionSchema.parse(req.body);
    const review = await prisma.review.update({
      where: { id: req.params.id },
      data: {
        verificationStatus: status as VerificationStatus,
        verificationDocs: {
          updateMany: {
            where: { reviewId: req.params.id },
            data: { status: status as VerificationStatus }
          }
        }
      },
      include: {
        building: true,
        user: { select: { nickname: true, realName: true, email: true, phone: true } },
        verificationDocs: true
      }
    });
    if (status === "APPROVED") {
      await upsertReviewTransaction(req.params.id);
    } else {
      await deleteReviewTransaction(req.params.id);
    }
    clearBuildingCache();

    res.json(review);
  } catch (error) {
    next(error);
  }
});

router.delete("/admin/reviews/:id", async (req, res, next) => {
  try {
    if (!isAdminRequest(req)) {
      res.status(401).json({ message: "관리자 로그인이 필요합니다." });
      return;
    }

    const reviewId = z.string().min(1).parse(req.params.id);
    const existing = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        building: true,
        user: { select: { id: true, nickname: true, realName: true, email: true, phone: true, birthDate: true } },
        verificationDocs: true
      }
    });

    if (!existing) {
      res.status(404).json({ message: "삭제할 리뷰를 찾을 수 없습니다." });
      return;
    }

    await deleteReviewTransaction(reviewId);
    await prisma.review.delete({ where: { id: reviewId } });
    clearBuildingCache();
    res.json(existing);
  } catch (error) {
    next(error);
  }
});
