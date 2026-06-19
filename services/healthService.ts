import {
  doc, setDoc, getDoc, onSnapshot, updateDoc, increment,
  collection, query, where,
} from 'firebase/firestore';
import { db } from './firebase';

export interface Meal {
  time: string;
  description: string;
  category?: string; // 早餐 | 午餐 | 晚餐 | 飲料 | 點心
}

export interface DailyHealth {
  userId: string;
  date: string;
  water: number;
  meals: Meal[];
  sleep?: number;
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function healthDocId(userId: string): string {
  return `${userId}_${todayKey()}`;
}

async function ensureDoc(coupleId: string, userId: string) {
  const ref = doc(db, 'couples', coupleId, 'health', healthDocId(userId));
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { userId, date: todayKey(), water: 0, meals: [] });
  }
  return ref;
}

export async function addWater(coupleId: string, userId: string) {
  const ref = await ensureDoc(coupleId, userId);
  await updateDoc(ref, { water: increment(1) });
}

export async function removeWater(coupleId: string, userId: string) {
  const ref = doc(db, 'couples', coupleId, 'health', healthDocId(userId));
  const snap = await getDoc(ref);
  const current = snap.data()?.water ?? 0;
  if (current > 0) await updateDoc(ref, { water: increment(-1) });
}

export async function addMeal(coupleId: string, userId: string, description: string) {
  const ref = await ensureDoc(coupleId, userId);
  const snap = await getDoc(ref);
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const meals: Meal[] = [...(snap.data()?.meals ?? []), { time, description }];
  await updateDoc(ref, { meals });
}

export async function removeMeal(coupleId: string, userId: string, index: number) {
  const ref = doc(db, 'couples', coupleId, 'health', healthDocId(userId));
  const snap = await getDoc(ref);
  const meals: Meal[] = [...(snap.data()?.meals ?? [])];
  meals.splice(index, 1);
  await updateDoc(ref, { meals });
}

export async function setSleep(coupleId: string, userId: string, hours: number) {
  const ref = await ensureDoc(coupleId, userId);
  await updateDoc(ref, { sleep: hours });
}

// ── Past-date editing ──────────────────────────────────────────────────

export async function setWaterForDate(coupleId: string, userId: string, date: string, count: number) {
  const ref = doc(db, 'couples', coupleId, 'health', `${userId}_${date}`);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, { water: count });
  } else {
    await setDoc(ref, { userId, date, water: count, meals: [] });
  }
}

export async function addMealForDate(
  coupleId: string,
  userId: string,
  date: string,
  description: string,
  time?: string,
  category?: string,
) {
  const ref = doc(db, 'couples', coupleId, 'health', `${userId}_${date}`);
  const snap = await getDoc(ref);
  const now = new Date();
  const mealTime = time ?? `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const meal: Meal = { time: mealTime, description, category };
  if (snap.exists()) {
    await updateDoc(ref, { meals: [...(snap.data()?.meals ?? []), meal] });
  } else {
    await setDoc(ref, { userId, date, water: 0, meals: [meal] });
  }
}

export async function updateMealForDate(
  coupleId: string,
  userId: string,
  date: string,
  mealIndex: number,
  description: string,
) {
  const ref = doc(db, 'couples', coupleId, 'health', `${userId}_${date}`);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const meals: Meal[] = [...(snap.data()?.meals ?? [])];
  if (meals[mealIndex]) meals[mealIndex] = { ...meals[mealIndex], description };
  await updateDoc(ref, { meals });
}

export async function deleteWaterForDate(coupleId: string, userId: string, date: string) {
  const ref = doc(db, 'couples', coupleId, 'health', `${userId}_${date}`);
  const snap = await getDoc(ref);
  if (snap.exists()) await updateDoc(ref, { water: 0 });
}

export async function moveMealToDate(
  coupleId: string,
  userId: string,
  oldDate: string,
  mealIndex: number,
  newDate: string,
  description: string,
) {
  // Remove from old date
  const oldRef = doc(db, 'couples', coupleId, 'health', `${userId}_${oldDate}`);
  const oldSnap = await getDoc(oldRef);
  if (oldSnap.exists()) {
    const meals: Meal[] = [...(oldSnap.data()?.meals ?? [])];
    const meal = meals[mealIndex];
    meals.splice(mealIndex, 1);
    await updateDoc(oldRef, { meals });
    // Add to new date
    if (oldDate === newDate) {
      // Same date, just update description
      const newMeals = [...meals];
      newMeals.splice(mealIndex, 0, { time: meal?.time ?? '12:00', description });
      await updateDoc(oldRef, { meals: newMeals });
    } else {
      await addMealForDate(coupleId, userId, newDate, description, meal?.time);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────

export async function fetchPastHealth(
  coupleId: string,
  userId: string,
  days = 7,
  offset = 0,
): Promise<{ date: string; water: number; meals: number }[]> {
  const results = [];
  for (let i = offset; i < offset + days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const snap = await getDoc(doc(db, 'couples', coupleId, 'health', `${userId}_${dateStr}`));
    results.push({
      date: dateStr,
      water: snap.exists() ? (snap.data()?.water ?? 0) : 0,
      meals: snap.exists() ? (snap.data()?.meals?.length ?? 0) : 0,
    });
  }
  return results;
}

export function subscribeToHealthHistory(
  coupleId: string,
  userId: string,
  callback: (records: DailyHealth[]) => void,
) {
  const q = query(
    collection(db, 'couples', coupleId, 'health'),
    where('userId', '==', userId),
  );
  return onSnapshot(q, (snap) => {
    const records = snap.docs
      .map((d) => d.data() as DailyHealth)
      .filter((r) => r.date)
      .sort((a, b) => b.date.localeCompare(a.date));
    callback(records);
  });
}

export function subscribeToTodayHealth(
  coupleId: string,
  userId: string,
  callback: (health: DailyHealth) => void,
) {
  const ref = doc(db, 'couples', coupleId, 'health', healthDocId(userId));
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      callback(snap.data() as DailyHealth);
    } else {
      callback({ userId, date: todayKey(), water: 0, meals: [] });
    }
  });
}

