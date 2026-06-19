import {
  collection, addDoc, deleteDoc, doc,
  onSnapshot, query, orderBy, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

export const TASK_CATEGORIES = [
  { key: 'date',   label: '約會',  emoji: '💑' },
  { key: 'home',   label: '家事',  emoji: '🏠' },
  { key: 'shop',   label: '購物',  emoji: '🛒' },
  { key: 'health', label: '健康',  emoji: '🏃' },
  { key: 'work',   label: '工作',  emoji: '💼' },
  { key: 'other',  label: '其他',  emoji: '📌' },
];

export interface Task {
  id: string;
  title: string;
  assignedTo: string;
  completed: boolean;
  dueDate?: string;
  category?: string;
  createdBy: string;
  createdAt: Date;
}

export function subscribeToTasks(
  coupleId: string,
  callback: (tasks: Task[]) => void,
) {
  const q = query(
    collection(db, 'couples', coupleId, 'tasks'),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({
      id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate() ?? new Date(),
    })) as Task[]);
  });
}

export async function addTask(
  coupleId: string,
  userId: string,
  title: string,
  assignedTo: string,
  dueDate?: string,
  category?: string,
) {
  await addDoc(collection(db, 'couples', coupleId, 'tasks'), {
    title, assignedTo,
    completed: false,
    dueDate: dueDate ?? null,
    category: category ?? 'other',
    createdBy: userId,
    createdAt: serverTimestamp(),
  });
}

export async function toggleTask(coupleId: string, taskId: string, completed: boolean) {
  await updateDoc(doc(db, 'couples', coupleId, 'tasks', taskId), { completed });
}

export async function deleteTask(coupleId: string, taskId: string) {
  await deleteDoc(doc(db, 'couples', coupleId, 'tasks', taskId));
}
