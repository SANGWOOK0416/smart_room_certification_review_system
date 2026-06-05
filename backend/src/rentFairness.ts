import { DealType, RoomType, VerificationStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "./db.js";

const defaultConversionRate = Number(process.env.RENT_CONVERSION_RATE ?? "0.05");
const minimumSampleSize = 4;

export const rentFairnessRequestSchema = z.object({
  lawdCode: z.string().regex(/^\d{5}$/),
  legalDongCode: z.string().regex(/^\d{10}$/).optional(),
  eupmyeondong: z.string().min(1).optional(),
  deposit: z.coerce.number().min(0),
  monthlyRent: z.coerce.number().min(0),
  exclusiveArea: z.coerce.number().positive(),
  housingType: z.nativeEnum(RoomType),
  conversionRate: z.coerce.number().positive().max(1).optional()
});

type RentSample = {
  deposit: number;
  monthlyRent: number;
  exclusiveArea: number;
  source: "MOLIT" | "REVIEW";
};

export function calculateConvertedMonthlyRent(deposit: number, monthlyRent: number, conversionRate = defaultConversionRate) {
  return monthlyRent + (deposit * conversionRate) / 12;
}

export function calculateConvertedRentPerArea(params: {
  deposit: number;
  monthlyRent: number;
  exclusiveArea: number;
  conversionRate?: number;
}) {
  if (!Number.isFinite(params.exclusiveArea) || params.exclusiveArea <= 0) {
    throw new Error("전용면적은 0보다 커야 합니다.");
  }

  return calculateConvertedMonthlyRent(params.deposit, params.monthlyRent, params.conversionRate) / params.exclusiveArea;
}

function median(sortedValues: number[]) {
  const length = sortedValues.length;
  if (!length) return null;
  const middle = Math.floor(length / 2);
  return length % 2 ? sortedValues[middle] : (sortedValues[middle - 1] + sortedValues[middle]) / 2;
}

function quartiles(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const lower = sorted.slice(0, middle);
  const upper = sorted.length % 2 ? sorted.slice(middle + 1) : sorted.slice(middle);
  const q1 = median(lower) ?? sorted[0] ?? 0;
  const q2 = median(sorted) ?? 0;
  const q3 = median(upper) ?? sorted.at(-1) ?? 0;
  return { sorted, q1, median: q2, q3 };
}

export function calculateRentFairnessStats(values: number[]) {
  if (!values.length) return null;
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const { q1, median: medianValue, q3 } = quartiles(values);
  const iqr = q3 - q1;
  const upperBound = q3 + 1.5 * iqr;
  return { average, median: medianValue, q1, q3, iqr, upperBound };
}

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

async function getRentSamples(params: {
  lawdCode: string;
  eupmyeondong?: string;
  housingType: RoomType;
}) {
  const addressFilter = params.eupmyeondong
    ? { contains: params.eupmyeondong, mode: "insensitive" as const }
    : undefined;

  const [transactions, reviews] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        dealType: DealType.MONTHLY_RENT,
        monthlyAmount: { not: null },
        areaSquareM: { not: null },
        building: {
          lawdCode: params.lawdCode,
          roomType: params.housingType,
          ...(addressFilter ? { address: addressFilter } : {})
        }
      },
      select: {
        depositAmount: true,
        monthlyAmount: true,
        areaSquareM: true
      },
      take: 800
    }),
    prisma.review.findMany({
      where: {
        verificationStatus: VerificationStatus.APPROVED,
        reviewMonthlyRent: { not: null },
        reviewAreaSquareM: { not: null },
        building: {
          lawdCode: params.lawdCode,
          roomType: params.housingType,
          ...(addressFilter ? { address: addressFilter } : {})
        }
      },
      select: {
        reviewDepositAmount: true,
        reviewMonthlyRent: true,
        reviewAreaSquareM: true
      },
      take: 300
    })
  ]);

  const transactionSamples: RentSample[] = transactions.flatMap((transaction) => {
    const exclusiveArea = toNumber(transaction.areaSquareM);
    if (exclusiveArea == null || exclusiveArea <= 0) return [];
    return [
      {
        deposit: transaction.depositAmount ?? 0,
        monthlyRent: transaction.monthlyAmount ?? 0,
        exclusiveArea,
        source: "MOLIT" as const
      }
    ];
  });

  const reviewSamples: RentSample[] = reviews.flatMap((review) => {
    const exclusiveArea = toNumber(review.reviewAreaSquareM);
    if (exclusiveArea == null || exclusiveArea <= 0) return [];
    return [
      {
        deposit: review.reviewDepositAmount ?? 0,
        monthlyRent: review.reviewMonthlyRent ?? 0,
        exclusiveArea,
        source: "REVIEW" as const
      }
    ];
  });

  return [...transactionSamples, ...reviewSamples];
}

export async function evaluateRentFairness(input: z.infer<typeof rentFairnessRequestSchema>) {
  const conversionRate = input.conversionRate ?? defaultConversionRate;
  const convertedMonthlyRent = calculateConvertedMonthlyRent(input.deposit, input.monthlyRent, conversionRate);
  const convertedRentPerArea = calculateConvertedRentPerArea({
    deposit: input.deposit,
    monthlyRent: input.monthlyRent,
    exclusiveArea: input.exclusiveArea,
    conversionRate
  });

  const samples = await getRentSamples({
    lawdCode: input.lawdCode,
    eupmyeondong: input.eupmyeondong,
    housingType: input.housingType
  });
  const sampleValues = samples.map((sample) =>
    calculateConvertedRentPerArea({
      deposit: sample.deposit,
      monthlyRent: sample.monthlyRent,
      exclusiveArea: sample.exclusiveArea,
      conversionRate
    })
  );
  const stats = calculateRentFairnessStats(sampleValues);
  const insufficientSample = sampleValues.length < minimumSampleSize || !stats;
  const isOutlier = Boolean(stats && !insufficientSample && convertedRentPerArea > stats.upperBound);

  return {
    input: {
      lawdCode: input.lawdCode,
      legalDongCode: input.legalDongCode,
      eupmyeondong: input.eupmyeondong,
      housingType: input.housingType,
      deposit: input.deposit,
      monthlyRent: input.monthlyRent,
      exclusiveArea: input.exclusiveArea
    },
    conversionRate,
    convertedMonthlyRent,
    convertedRentPerArea,
    sampleCount: sampleValues.length,
    stats,
    insufficientSample,
    isOutlier,
    message: insufficientSample
      ? "해당 지역과 주택유형의 비교 표본이 부족합니다."
      : isOutlier
        ? "주변 시세 대비 월세가 높게 신고된 매물입니다. 면적, 옵션, 보증금 조건을 확인하세요."
        : "해당 지역 평균 시세 범위 내 매물입니다."
  };
}
