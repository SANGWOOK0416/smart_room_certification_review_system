import { DealType, RoomType } from "@prisma/client";
import { prisma } from "./db.js";
import { fetchMolitDeals, MolitDealKind } from "./molit.js";
import { defaultNationwideLawdCodes } from "./nationwideCodes.js";

const defaultKinds: MolitDealKind[] = ["singleHouseRent", "rowHouseRent", "officetelRent", "aptRent", "aptTrade"];

type CollectionStatus = {
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

const status: CollectionStatus = {
  running: false,
  totalTasks: 0,
  completedTasks: 0,
  savedDeals: 0,
  failedTasks: 0,
  errors: []
};

function roomTypeForKind(kind: MolitDealKind) {
  if (kind === "officetelRent") return RoomType.OFFICETEL;
  if (kind === "rowHouseRent") return RoomType.VILLA;
  if (kind === "singleHouseRent") return RoomType.ONE_ROOM;
  return RoomType.APARTMENT;
}

function recentDealYmds(monthsBack: number) {
  const result: string[] = [];
  const date = new Date();
  for (let index = 0; index < monthsBack; index += 1) {
    const cursor = new Date(date.getFullYear(), date.getMonth() - index, 1);
    result.push(`${cursor.getFullYear()}${String(cursor.getMonth() + 1).padStart(2, "0")}`);
  }
  return result;
}

async function saveMolitDeals(params: { lawdCode: string; dealYmd: string; kind: MolitDealKind }) {
  const deals = await fetchMolitDeals(params);
  let saved = 0;

  for (const deal of deals) {
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
        roomType: roomTypeForKind(params.kind)
      },
      update: {
        lawdCode: deal.lawdCode
      }
    });

    await prisma.transaction.upsert({
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
      }
    });
    saved += 1;
  }

  return saved;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getNationwideCollectionStatus() {
  return status;
}

export function startNationwideCollection(options: {
  lawdCodes?: string[];
  dealYmds?: string[];
  monthsBack?: number;
  kinds?: MolitDealKind[];
  delayMs?: number;
} = {}) {
  if (status.running) return status;

  const lawdCodes = options.lawdCodes?.length ? options.lawdCodes : defaultNationwideLawdCodes;
  const dealYmds = options.dealYmds?.length ? options.dealYmds : recentDealYmds(options.monthsBack ?? 6);
  const kinds = options.kinds?.length ? options.kinds : defaultKinds;
  const delayMs = options.delayMs ?? 350;

  status.running = true;
  status.startedAt = new Date().toISOString();
  status.finishedAt = undefined;
  status.totalTasks = lawdCodes.length * dealYmds.length * kinds.length;
  status.completedTasks = 0;
  status.savedDeals = 0;
  status.failedTasks = 0;
  status.currentTask = undefined;
  status.errors = [];

  void (async () => {
    try {
      for (const lawdCode of lawdCodes) {
        for (const dealYmd of dealYmds) {
          for (const kind of kinds) {
            const task = `${lawdCode}/${dealYmd}/${kind}`;
            status.currentTask = task;
            try {
              status.savedDeals += await saveMolitDeals({ lawdCode, dealYmd, kind });
            } catch (error) {
              status.failedTasks += 1;
              status.errors.push({
                task,
                message: error instanceof Error ? error.message : "알 수 없는 오류"
              });
              status.errors = status.errors.slice(-30);
            } finally {
              status.completedTasks += 1;
              await delay(delayMs);
            }
          }
        }
      }
    } finally {
      status.running = false;
      status.currentTask = undefined;
      status.finishedAt = new Date().toISOString();
    }
  })();

  return status;
}
