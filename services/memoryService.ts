import {
  collection, addDoc, deleteDoc, updateDoc, doc,
  onSnapshot, query, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { uploadImage } from './cloudinaryService';

export interface MemoryPhoto {
  id: string;
  imageUrl: string;
  caption: string;
  date: string;
  uploadedBy: string;
  createdAt: Date;
  focalX?: number;  // 0-100, default 50
  focalY?: number;  // 0-100, default 50
  focalScale?: number; // 1-3, default 1 (zoom)
}

export function subscribeToMemories(
  coupleId: string,
  callback: (photos: MemoryPhoto[]) => void,
) {
  const q = query(
    collection(db, 'couples', coupleId, 'memories'),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(q, (snap) => {
    const photos = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate() ?? new Date(),
    })) as MemoryPhoto[];
    callback(photos);
  });
}

export async function uploadMemory(
  coupleId: string,
  userId: string,
  uri: string,
  caption: string,
  date: string,
): Promise<void> {
  const imageUrl = await uploadImage(uri);
  await addDoc(collection(db, 'couples', coupleId, 'memories'), {
    imageUrl,
    caption,
    date,
    uploadedBy: userId,
    focalX: 50,
    focalY: 50,
    createdAt: serverTimestamp(),
  });
}

export async function updateMemory(
  coupleId: string,
  photoId: string,
  caption: string,
  date: string,
  focalX = 50,
  focalY = 50,
  focalScale = 1,
): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId, 'memories', photoId), {
    caption, date, focalX, focalY, focalScale,
  });
}

export async function deleteMemory(coupleId: string, photoId: string): Promise<void> {
  await deleteDoc(doc(db, 'couples', coupleId, 'memories', photoId));
}
