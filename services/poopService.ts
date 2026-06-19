import {
  collection, addDoc, deleteDoc, updateDoc, doc, query, where,
  onSnapshot, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

export interface PoopRecord {
  id: string;
  userId: string;
  recordedAt: Date;
  month: string;
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function recordPoop(coupleId: string, userId: string): Promise<void> {
  await addDoc(collection(db, 'couples', coupleId, 'poop'), {
    userId, month: currentMonth(), recordedAt: serverTimestamp(),
  });
}

export async function recordPoopForDate(coupleId: string, userId: string, date: string): Promise<void> {
  const month = date.slice(0, 7);
  const [y, m, d] = date.split('-').map(Number);
  await addDoc(collection(db, 'couples', coupleId, 'poop'), {
    userId,
    month,
    recordedAt: new Date(y, m - 1, d, 12, 0, 0),
  });
}

export async function updatePoopDate(coupleId: string, poopId: string, newDate: string): Promise<void> {
  const month = newDate.slice(0, 7);
  const [y, m, d] = newDate.split('-').map(Number);
  await updateDoc(doc(db, 'couples', coupleId, 'poop', poopId), {
    month,
    recordedAt: new Date(y, m - 1, d, 12, 0, 0),
  });
}

export async function deletePoop(coupleId: string, poopId: string): Promise<void> {
  await deleteDoc(doc(db, 'couples', coupleId, 'poop', poopId));
}

export function subscribeToAllPoop(
  coupleId: string,
  userId: string,
  callback: (records: PoopRecord[]) => void,
) {
  const q = query(
    collection(db, 'couples', coupleId, 'poop'),
    where('userId', '==', userId),
  );
  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((d) => ({
        id: d.id, userId: d.data().userId, month: d.data().month,
        recordedAt: d.data().recordedAt?.toDate() ?? new Date(),
      })).sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime()),
    );
  });
}

export function subscribeToMonthlyPoop(
  coupleId: string,
  month: string,
  callback: (records: PoopRecord[]) => void,
) {
  const q = query(collection(db, 'couples', coupleId, 'poop'), where('month', '==', month));
  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((d) => ({
        id: d.id, userId: d.data().userId, month: d.data().month,
        recordedAt: d.data().recordedAt?.toDate() ?? new Date(),
      })).sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime()),
    );
  });
}
