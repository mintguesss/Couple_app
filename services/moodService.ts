import {
  collection, addDoc, deleteDoc, updateDoc, doc,
  query, orderBy, limit, onSnapshot, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

export interface MoodEntry {
  id: string;
  userId: string;
  mood: number;
  emoji: string;
  note: string;
  createdAt: Date;
}

export const MOOD_OPTIONS = [
  { value: 1, emoji: '😢', label: '很難過' },
  { value: 2, emoji: '😕', label: '有點難過' },
  { value: 3, emoji: '😊', label: '還不錯' },
  { value: 4, emoji: '😄', label: '很開心' },
  { value: 5, emoji: '🥰', label: '超幸福' },
];

export async function addMoodEntry(coupleId: string, userId: string, mood: number, note: string) {
  const option = MOOD_OPTIONS.find((m) => m.value === mood);
  await addDoc(collection(db, 'couples', coupleId, 'moods'), {
    userId, mood, emoji: option?.emoji ?? '😊', note, createdAt: serverTimestamp(),
  });
}

export async function updateMoodEntry(coupleId: string, moodId: string, mood: number, note: string) {
  const option = MOOD_OPTIONS.find((m) => m.value === mood);
  await updateDoc(doc(db, 'couples', coupleId, 'moods', moodId), {
    mood, emoji: option?.emoji ?? '😊', note,
  });
}

export async function deleteMoodEntry(coupleId: string, moodId: string) {
  await deleteDoc(doc(db, 'couples', coupleId, 'moods', moodId));
}

export function subscribeToMoods(
  coupleId: string,
  callback: (entries: MoodEntry[]) => void,
  maxEntries = 30,
) {
  const q = query(
    collection(db, 'couples', coupleId, 'moods'),
    orderBy('createdAt', 'desc'),
    limit(maxEntries),
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({
      id: d.id, ...d.data(),
      createdAt: d.data().createdAt?.toDate() ?? new Date(),
    })) as MoodEntry[]);
  });
}
