import { useEffect, useState } from 'react';
import { subscribeToHealthHistory, DailyHealth } from '@/services/healthService';
import { subscribeToAllPoop, PoopRecord } from '@/services/poopService';
import {
  COLLECTIBLES, CollectedEntry, WeeklyTarget, currentWeekId, currentWeekStart,
  WEEKLY_WATER_TARGET, WEEKLY_POOP_TARGET, isWeeklyGoalMet, weeklyProgress, TEST_COLLECTED_IDS,
  subscribeToCollection, subscribeToWeeklyTarget, selectWeeklyTarget, tryCollectWeekly,
} from '@/services/collectionService';

export function useWeeklyCollection(
  coupleId: string | undefined,
  myId: string,
  partnerId: string,
) {
  const [myHistory, setMyHistory] = useState<DailyHealth[]>([]);
  const [partnerHistory, setPartnerHistory] = useState<DailyHealth[]>([]);
  const [myPoop, setMyPoop] = useState<PoopRecord[]>([]);
  const [partnerPoop, setPartnerPoop] = useState<PoopRecord[]>([]);
  const [collection, setCollection] = useState<CollectedEntry[]>([]);
  const [target, setTarget] = useState<WeeklyTarget | null>(null);

  const weekId = currentWeekId();

  useEffect(() => {
    if (!coupleId || !myId) return;
    // 用即時訂閱整段喝水歷史，補登過去日期的紀錄也會立刻反映進本週總量
    const u1 = subscribeToHealthHistory(coupleId, myId, setMyHistory);
    const u2 = partnerId ? subscribeToHealthHistory(coupleId, partnerId, setPartnerHistory) : () => {};
    const u3 = subscribeToAllPoop(coupleId, myId, setMyPoop);
    const u4 = partnerId ? subscribeToAllPoop(coupleId, partnerId, setPartnerPoop) : () => {};
    const u5 = subscribeToCollection(coupleId, setCollection);
    const u6 = subscribeToWeeklyTarget(coupleId, weekId, setTarget);
    return () => { u1(); u2(); u3(); u4(); u5(); u6(); };
  }, [coupleId, myId, partnerId, weekId]);

  const weekStart = currentWeekStart();
  // 本週起算的那個禮拜一日期字串（YYYY-MM-DD），用來篩本週的每日喝水紀錄
  const weekStartDate = weekId;
  const weekWater = (history: DailyHealth[]) =>
    history.filter((r) => r.date >= weekStartDate).reduce((s, r) => s + (r.water ?? 0), 0);
  const totalWater = weekWater(myHistory) + weekWater(partnerHistory);
  const totalPoop =
    myPoop.filter((r) => r.recordedAt >= weekStart).length +
    partnerPoop.filter((r) => r.recordedAt >= weekStart).length;

  const goalMet = isWeeklyGoalMet(totalWater, totalPoop);
  const collectedThisWeek = collection.some((c) => c.weekId === weekId);
  const collectedItemIds = collection.map((c) => c.itemId);

  // 已收集的圖鑑項目（含測試用強制收集），給首頁收藏展示用
  const collectedIdSet = new Set([...collectedItemIds, ...TEST_COLLECTED_IDS]);
  const collectedItems = COLLECTIBLES.filter((c) => collectedIdSet.has(c.id));

  // 本週選定要收集的圖鑑（雙方可在達標領取前隨時更換）
  const selectedItem = target ? COLLECTIBLES.find((c) => c.id === target.itemId) ?? null : null;

  // 可挑選的圖鑑：優先列出尚未收集過的，全部收集完才允許重複挑選
  const uncollected = COLLECTIBLES.filter((c) => !collectedItemIds.includes(c.id));
  const selectableItems = uncollected.length > 0 ? uncollected : COLLECTIBLES;

  // 喝水與拉屎合計的本週進度（拉屎不封頂，多拉可補喝水不足），用來讓剪影隨進度逐漸顯現（0~1）
  const revealProgress = weeklyProgress(totalWater, totalPoop);

  // 達標、已選好本週圖鑑、且尚未領取時，把選定的圖鑑收進收藏（transaction 確保不會重複寫入）
  useEffect(() => {
    if (!coupleId || !goalMet || collectedThisWeek || !selectedItem) return;
    tryCollectWeekly(coupleId, weekId, selectedItem.id);
  }, [coupleId, goalMet, collectedThisWeek, selectedItem, weekId]);

  async function chooseTarget(itemId: string) {
    if (!coupleId || collectedThisWeek) return;
    await selectWeeklyTarget(coupleId, weekId, itemId);
  }

  return {
    totalWater,
    totalPoop,
    waterTarget: WEEKLY_WATER_TARGET,
    poopTarget: WEEKLY_POOP_TARGET,
    goalMet,
    collectedThisWeek,
    collection,
    collectedItems,
    collectedCount: collectedIdSet.size,
    totalCount: COLLECTIBLES.length,
    revealProgress,
    selectedItem,
    selectableItems,
    chooseTarget,
  };
}
