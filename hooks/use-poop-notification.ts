import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { subscribeToMonthlyPoop } from '@/services/poopService';

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function usePoopNotification(
  coupleId: string | undefined,
  partnerId: string | undefined,
  partnerName: string,
) {
  const seenIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  useEffect(() => {
    if (!coupleId || !partnerId || Platform.OS !== 'web') return;

    seenIds.current = new Set();
    initialized.current = false;

    const month = currentMonth();
    const unsub = subscribeToMonthlyPoop(coupleId, month, (records) => {
      const partnerRecords = records.filter((r) => r.userId === partnerId);

      if (!initialized.current) {
        // 第一次收到資料：把現有紀錄全標為已知，不發通知
        partnerRecords.forEach((r) => seenIds.current.add(r.id));
        initialized.current = true;
        return;
      }

      for (const r of partnerRecords) {
        if (seenIds.current.has(r.id)) continue;
        seenIds.current.add(r.id);

        // 只通知 60 秒內的新紀錄
        const ageMs = Date.now() - r.recordedAt.getTime();
        if (ageMs < 60_000) {
          showPoopNotification(partnerName);
        }
      }
    });

    return () => {
      unsub();
      seenIds.current = new Set();
      initialized.current = false;
    };
  }, [coupleId, partnerId, partnerName]);
}

async function showPoopNotification(partnerName: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const payload = {
    body: '快去加入他吧😂',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'poop',
  };

  // Android Chrome 不支援 new Notification()，必須走 Service Worker
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(`💩 ${partnerName} 正在拉屎！`, payload);
      return;
    } catch {
      // SW 不可用時退回原生 API
    }
  }

  try {
    new Notification(`💩 ${partnerName} 正在拉屎！`, payload);
  } catch {
    // ignore
  }
}

export async function requestPoopNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const result = await Notification.requestPermission();
  return result === 'granted';
}
