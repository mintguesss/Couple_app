import { Platform } from 'react-native';

// 從環境變數讀（本機 .env.local，線上 Vercel Environment Variables）
const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export async function uploadImage(uri: string): Promise<string> {
  const formData = new FormData();

  if (Platform.OS === 'web') {
    // On web, URI is a blob URL — fetch it to get the actual Blob
    const response = await fetch(uri);
    const blob = await response.blob();
    formData.append('file', blob, 'upload.jpg');
  } else {
    // On native, use the { uri, type, name } object
    formData.append('file', { uri, type: 'image/jpeg', name: 'upload.jpg' } as any);
  }

  formData.append('upload_preset', UPLOAD_PRESET ?? '');

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData },
  );
  const data = await res.json();
  if (!data.secure_url) throw new Error(data.error?.message ?? '上傳失敗');
  return data.secure_url as string;
}
