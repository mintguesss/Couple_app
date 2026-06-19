import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from './AuthContext';

export interface CustomEventCategory {
  key: string;
  label: string;
  color: string;
}

export interface CoupleProfile {
  id: string;
  members: string[];
  createdAt: Date;
  anniversaryDate?: Date;
  customEventCategories?: CustomEventCategory[];
  periodOwnerId?: string;
}

export interface PartnerProfile {
  uid: string;
  name: string;
  avatarUrl?: string;
  birthday?: string; // YYYY-MM-DD
}

interface CoupleContextType {
  couple: CoupleProfile | null;
  partner: PartnerProfile | null;
}

const CoupleContext = createContext<CoupleContextType>({ couple: null, partner: null });

export function CoupleProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const [couple, setCouple] = useState<CoupleProfile | null>(null);
  const [partner, setPartner] = useState<PartnerProfile | null>(null);

  useEffect(() => {
    if (!profile?.coupleId) { setCouple(null); setPartner(null); return; }

    const unsub = onSnapshot(doc(db, 'couples', profile.coupleId), async (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setCouple({
        id: snap.id,
        members: data.members,
        createdAt: data.createdAt?.toDate() ?? new Date(),
        anniversaryDate: data.anniversaryDate?.toDate(),
        customEventCategories: data.customEventCategories ?? [],
        periodOwnerId: data.periodOwnerId ?? null,
      });

      const partnerId = (data.members as string[]).find((id) => id !== profile.uid);
      if (partnerId) {
        const partnerSnap = await getDoc(doc(db, 'users', partnerId));
        if (partnerSnap.exists()) setPartner({ uid: partnerId, ...partnerSnap.data() } as PartnerProfile);
      }
    });

    return unsub;
  }, [profile?.coupleId, profile?.uid]);

  return <CoupleContext.Provider value={{ couple, partner }}>{children}</CoupleContext.Provider>;
}

export const useCouple = () => useContext(CoupleContext);
