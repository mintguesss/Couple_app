import {
  collection, doc, setDoc, onSnapshot, query, runTransaction, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

export interface CollectibleItem {
  id: string;
  emoji: string;
  name: string;
  category: '植物' | '動物' | '其他';
  // 放在 public/models/<id>.glb，有提供的話會用可旋轉的 3D 模型取代 emoji
  model?: string;
}

export const COLLECTIBLES: CollectibleItem[] = [
  // 自己準備的 3D 模型（放在 public/models/<id>.glb）
  { id: 'rilakkuma', emoji: '🐻', name: '拉拉熊', category: '動物', model: '/models/rilakkuma.glb' },
  { id: 'rilakkuma2', emoji: '🐻', name: '拉拉熊 2', category: '動物', model: '/models/rilakkuma2.glb' },
  { id: 'rilakkuma3', emoji: '🐻', name: '拉拉熊 3', category: '動物', model: '/models/rilakkuma3.glb' },
  { id: 'rilakkuma4', emoji: '🐻', name: '拉拉熊 4', category: '動物', model: '/models/rilakkuma4.glb' },
  { id: 'f1-car-1', emoji: '🏎️', name: 'F1 賽車', category: '其他', model: '/models/f1-car-1.glb' },
  { id: 'f1-car-2', emoji: '🏎️', name: 'F1 賽車 2', category: '其他', model: '/models/f1-car-2.glb' },
  { id: 'sunflower', emoji: '🌻', name: '向日葵', category: '植物' },
  { id: 'cherry-blossom', emoji: '🌸', name: '櫻花', category: '植物' },
  { id: 'cactus', emoji: '🌵', name: '仙人掌', category: '植物' },
  { id: 'clover', emoji: '🍀', name: '幸運草', category: '植物' },
  { id: 'tulip', emoji: '🌷', name: '鬱金香', category: '植物' },
  { id: 'maple', emoji: '🍁', name: '楓葉', category: '植物' },
  { id: 'cat', emoji: '🐱', name: '貓咪', category: '動物' },
  { id: 'dog', emoji: '🐶', name: '狗狗', category: '動物' },
  { id: 'rabbit', emoji: '🐰', name: '兔子', category: '動物' },
  { id: 'panda', emoji: '🐼', name: '貓熊', category: '動物' },
  { id: 'penguin', emoji: '🐧', name: '企鵝', category: '動物' },
  { id: 'turtle', emoji: '🐢', name: '烏龜', category: '動物' },
  { id: 'star', emoji: '⭐', name: '星星', category: '其他' },
  { id: 'rainbow', emoji: '🌈', name: '彩虹', category: '其他' },
  { id: 'crystal', emoji: '💎', name: '水晶', category: '其他' },
  { id: 'gift', emoji: '🎁', name: '禮物', category: '其他' },
];

// 測試用：把這些 id 強制當成「已收集」，方便看完成後的 3D 效果。測完清空成 [] 即可。
export const TEST_COLLECTED_IDS: string[] = [];

export interface CollectedEntry {
  weekId: string;
  itemId: string;
  collectedAt: Date;
}

export interface WeeklyTarget {
  weekId: string;
  itemId: string;
  selectedAt: Date;
}

// 一週從「禮拜一 4:00」開始算，所以禮拜一凌晨 0:00~3:59 還算上一週
function weekStart(date: Date): Date {
  const shifted = new Date(date.getTime() - 4 * 60 * 60 * 1000);
  const day = shifted.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const monday = new Date(shifted.getFullYear(), shifted.getMonth(), shifted.getDate() + diff);
  monday.setHours(4, 0, 0, 0);
  return monday;
}

export function currentWeekStart(): Date {
  return weekStart(new Date());
}

export function currentWeekId(): string {
  const s = currentWeekStart();
  return `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}-${String(s.getDate()).padStart(2, '0')}`;
}

// 本週至今已經過了幾天（含今天，以禮拜一 4:00 為一週起點）；禮拜一 = 1，禮拜日 = 7
export function daysIntoWeek(): number {
  const shifted = new Date(Date.now() - 4 * 60 * 60 * 1000);
  const day = shifted.getDay();
  return day === 0 ? 7 : day;
}

// 雙方合力的一週目標：每人每天 5 杯水（5×7×2），拉屎一週共 9 次
export const WEEKLY_WATER_TARGET = 5 * 7 * 2;
export const WEEKLY_POOP_TARGET = 9;
// 拉屎超過目標後，每多一次再加多少進度
export const POOP_OVERFLOW_BONUS = 0.05;

// 一週進度（0~1）：
//  基礎 = (喝水達成率 + 拉屎達成率，各自最多算到滿) / 2 —— 喝滿水＋拉滿 9 次 = 100%
//  加成 = 拉屎超過 9 次的部分，每多一次 +5%，可以補喝水的不足
export function weeklyProgress(totalWater: number, totalPoop: number): number {
  const water = Math.min(totalWater / WEEKLY_WATER_TARGET, 1);
  const poop = Math.min(totalPoop / WEEKLY_POOP_TARGET, 1);
  const base = (water + poop) / 2;
  const overflow = Math.max(totalPoop - WEEKLY_POOP_TARGET, 0) * POOP_OVERFLOW_BONUS;
  return Math.min(base + overflow, 1);
}

export function isWeeklyGoalMet(totalWater: number, totalPoop: number): boolean {
  return weeklyProgress(totalWater, totalPoop) >= 1;
}

export function subscribeToCollection(
  coupleId: string,
  callback: (entries: CollectedEntry[]) => void,
) {
  const q = query(collection(db, 'couples', coupleId, 'collection'));
  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((d) => ({
        weekId: d.id,
        itemId: d.data().itemId,
        collectedAt: d.data().collectedAt?.toDate() ?? new Date(),
      })),
    );
  });
}

// 訂閱「本週選定要收集的圖鑑」
export function subscribeToWeeklyTarget(
  coupleId: string,
  weekId: string,
  callback: (target: WeeklyTarget | null) => void,
) {
  const ref = doc(db, 'couples', coupleId, 'weeklyTarget', weekId);
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    const data = snap.data();
    callback({ weekId, itemId: data.itemId, selectedAt: data.selectedAt?.toDate() ?? new Date() });
  });
}

// 雙方挑選本週想收集的圖鑑（達標後就會把這個項目收進收藏，可在領取前隨時更換）
export async function selectWeeklyTarget(coupleId: string, weekId: string, itemId: string) {
  const ref = doc(db, 'couples', coupleId, 'weeklyTarget', weekId);
  await setDoc(ref, { itemId, selectedAt: serverTimestamp() });
}

// 本週已達標且尚未領取時，把雙方選定的圖鑑收進收藏。
// 用 transaction 確保雙方裝置同時觸發時也只會寫入一次。
export async function tryCollectWeekly(
  coupleId: string,
  weekId: string,
  itemId: string,
): Promise<string | null> {
  const ref = doc(db, 'couples', coupleId, 'collection', weekId);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists()) return null;

    tx.set(ref, { itemId, collectedAt: serverTimestamp() });
    return itemId;
  });
}
