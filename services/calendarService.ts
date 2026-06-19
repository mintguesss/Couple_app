import {
  collection, addDoc, deleteDoc, updateDoc, doc,
  onSnapshot, query, orderBy, serverTimestamp, arrayUnion, arrayRemove, getDoc,
} from 'firebase/firestore';
import { db } from './firebase';

export const EVENT_CATEGORIES = [
  { key: 'date',     label: '約會',  emoji: '💑', color: '#FF6B9D' },
  { key: 'food',     label: '美食',  emoji: '🍜', color: '#FF9F43' },
  { key: 'travel',   label: '旅行',  emoji: '✈️', color: '#56CFE1' },
  { key: 'work',     label: '工作',  emoji: '💼', color: '#4A90D9' },
  { key: 'health',   label: '聚會',  emoji: '🎉', color: '#4CAF50' },
  { key: 'other',    label: '其他',  emoji: '📌', color: '#888888' },
] as const;

export type EventCategory = typeof EVENT_CATEGORIES[number]['key'];

export function getCategoryColor(category?: string): string {
  return EVENT_CATEGORIES.find(c => c.key === category)?.color ?? '#FF6B9D';
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  description?: string;
  category?: EventCategory;
  isAnniversary: boolean;
  createdBy: string;
  createdAt: Date;
}

export function subscribeToEvents(
  coupleId: string,
  callback: (events: CalendarEvent[]) => void,
) {
  const q = query(
    collection(db, 'couples', coupleId, 'events'),
    orderBy('date', 'asc'),
  );
  return onSnapshot(q, (snap) => {
    const events = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate() ?? new Date(),
    })) as CalendarEvent[];
    callback(events);
  });
}

export async function addEvent(
  coupleId: string,
  userId: string,
  title: string,
  date: string,
  description?: string,
  isAnniversary = false,
  category?: string,
) {
  await addDoc(collection(db, 'couples', coupleId, 'events'), {
    title,
    date,
    description: description ?? '',
    isAnniversary,
    category: category ?? 'other',
    createdBy: userId,
    createdAt: serverTimestamp(),
  });
}

export async function updateEvent(
  coupleId: string,
  eventId: string,
  title: string,
  date: string,
  description: string,
  isAnniversary: boolean,
  category?: string,
) {
  await updateDoc(doc(db, 'couples', coupleId, 'events', eventId), {
    title, date, description, isAnniversary, category: category ?? 'other',
  });
}

export async function deleteEvent(coupleId: string, eventId: string) {
  await deleteDoc(doc(db, 'couples', coupleId, 'events', eventId));
}

export interface CustomCategory {
  key: string;
  label: string;
  color: string;
}

export async function addCustomCategory(coupleId: string, cat: CustomCategory): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId), {
    customEventCategories: arrayUnion(cat),
  });
}

export async function removeCustomCategory(coupleId: string, cat: CustomCategory): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId), {
    customEventCategories: arrayRemove(cat),
  });
}

export function getEventsForMonth(events: CalendarEvent[], year: number, month: number): Record<string, CalendarEvent[]> {
  const result: Record<string, CalendarEvent[]> = {};
  for (const e of events) {
    const [y, m] = e.date.split('-').map(Number);
    if (y === year && m === month) {
      if (!result[e.date]) result[e.date] = [];
      result[e.date].push(e);
    }
  }
  return result;
}
