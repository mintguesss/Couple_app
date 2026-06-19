import {
  collection, addDoc, doc, updateDoc, getDoc,
  onSnapshot, query, where, deleteDoc,
} from 'firebase/firestore';
import { db } from './firebase';

export type FlowLevel = 'light' | 'medium' | 'heavy';

export const FLOW_LABELS: Record<FlowLevel, string> = {
  light: '輕量', medium: '中量', heavy: '大量',
};
export const FLOW_EMOJI: Record<FlowLevel, string> = {
  light: '🩸', medium: '🩸🩸', heavy: '🩸🩸🩸',
};
export const PAIN_LEVELS = [
  { value: 1, emoji: '😊', label: '無感' },
  { value: 2, emoji: '😐', label: '輕微' },
  { value: 3, emoji: '😣', label: '中等' },
  { value: 4, emoji: '😫', label: '劇烈' },
  { value: 5, emoji: '😭', label: '難耐' },
];

export interface DailyEntry {
  date: string;       // YYYY-MM-DD
  flow: FlowLevel;
  pain: number;       // 1-5
  notes?: string;
}

export interface PeriodRecord {
  id: string;
  userId: string;
  startDate: string;
  endDate?: string;
  daysCount?: number;
  isActive: boolean;
  days: DailyEntry[]; // daily records
}

// ── CRUD ─────────────────────────────────────────────────────

export async function startPeriod(
  coupleId: string,
  userId: string,
  startDate: string,
  initialFlow: FlowLevel,
  notes?: string,
  pain?: number,
): Promise<string> {
  const firstDay: DailyEntry = {
    date: startDate,
    flow: initialFlow,
    pain: pain ?? 1,
    notes: notes ?? '',
  };
  const ref = await addDoc(collection(db, 'couples', coupleId, 'periods'), {
    userId,
    startDate,
    endDate: null,
    daysCount: null,
    isActive: true,
    days: [firstDay],
  });
  return ref.id;
}

export async function upsertDayEntry(
  coupleId: string,
  periodId: string,
  entry: DailyEntry,
): Promise<void> {
  const ref = doc(db, 'couples', coupleId, 'periods', periodId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const days: DailyEntry[] = [...(snap.data().days ?? [])];
  const idx = days.findIndex(d => d.date === entry.date);
  if (idx >= 0) {
    days[idx] = entry;
  } else {
    days.push(entry);
    days.sort((a, b) => a.date.localeCompare(b.date));
  }
  await updateDoc(ref, { days });
}

export async function deleteDayEntry(
  coupleId: string,
  periodId: string,
  date: string,
): Promise<void> {
  const ref = doc(db, 'couples', coupleId, 'periods', periodId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const days = (snap.data().days ?? []).filter((d: DailyEntry) => d.date !== date);
  await updateDoc(ref, { days });
}

export async function updatePeriodEnd(
  coupleId: string,
  periodId: string,
  startDate: string,
  endDate: string,
): Promise<void> {
  const s = new Date(startDate);
  const e = new Date(endDate);
  const daysCount = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
  await updateDoc(doc(db, 'couples', coupleId, 'periods', periodId), {
    endDate, daysCount, isActive: false,
  });
}

export async function updatePeriodDates(
  coupleId: string,
  periodId: string,
  startDate: string,
  endDate?: string,
): Promise<void> {
  const update: Record<string, any> = { startDate };
  if (endDate) {
    const daysCount = Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1;
    update.endDate = endDate;
    update.daysCount = daysCount;
  }
  await updateDoc(doc(db, 'couples', coupleId, 'periods', periodId), update);
}

export async function deletePeriod(coupleId: string, periodId: string): Promise<void> {
  await deleteDoc(doc(db, 'couples', coupleId, 'periods', periodId));
}

// ── Query ────────────────────────────────────────────────────

export function subscribeToAllPeriods(
  coupleId: string,
  callback: (records: PeriodRecord[]) => void,
) {
  return onSnapshot(
    collection(db, 'couples', coupleId, 'periods'),
    (snap) => {
      const records = snap.docs
        .map(d => ({ id: d.id, ...d.data(), days: d.data().days ?? [] } as PeriodRecord))
        .sort((a, b) => b.startDate.localeCompare(a.startDate));
      callback(records);
    },
  );
}

// ── Prediction ───────────────────────────────────────────────

export function predictNextPeriod(
  records: PeriodRecord[],
): { date: string; avgCycle: number; daysUntil: number; isEstimate: boolean } | null {
  const completed = records
    .filter(r => !r.isActive && r.startDate)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  if (completed.length === 0) return null;

  let avgCycle = 28; // default estimate
  let isEstimate = true;

  if (completed.length >= 2) {
    const cycles: number[] = [];
    for (let i = 1; i < completed.length; i++) {
      const diff = Math.round(
        (new Date(completed[i].startDate).getTime() - new Date(completed[i-1].startDate).getTime()) / 86400000
      );
      if (diff > 15 && diff < 90) cycles.push(diff);
    }
    if (cycles.length > 0) {
      // Weighted average — more recent cycles count more
      let totalW = 0, weightedSum = 0;
      cycles.forEach((c, i) => { const w = i + 1; totalW += w; weightedSum += c * w; });
      avgCycle = Math.round(weightedSum / totalW);
      isEstimate = false;
    }
  }

  const lastDate = new Date(completed[completed.length - 1].startDate);
  const predicted = new Date(lastDate);
  predicted.setDate(predicted.getDate() + avgCycle);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const daysUntil = Math.round((predicted.getTime() - today.getTime()) / 86400000);
  const dateStr = `${predicted.getFullYear()}-${String(predicted.getMonth()+1).padStart(2,'0')}-${String(predicted.getDate()).padStart(2,'0')}`;
  return { date: dateStr, avgCycle, daysUntil, isEstimate };
}

export function getAverageCycle(records: PeriodRecord[]): number | null {
  const prediction = predictNextPeriod(records);
  return prediction?.avgCycle ?? null;
}
