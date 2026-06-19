import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, collection, deleteField } from 'firebase/firestore';
import { auth, db } from './firebase';

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function register(email: string, password: string, name: string) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  const inviteCode = generateInviteCode();
  await setDoc(doc(db, 'users', user.uid), {
    name,
    inviteCode,
    createdAt: new Date(),
  });
  await setDoc(doc(db, 'inviteCodes', inviteCode), { userId: user.uid });
  return user;
}

export async function login(email: string, password: string) {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
}

export async function pairWithPartner(inviteCode: string, myUserId: string): Promise<string> {
  const codeSnap = await getDoc(doc(db, 'inviteCodes', inviteCode.toUpperCase()));
  if (!codeSnap.exists()) throw new Error('邀請碼無效，請確認後重試');

  const partnerId: string = codeSnap.data().userId;
  if (partnerId === myUserId) throw new Error('不能和自己配對喔！');

  const partnerSnap = await getDoc(doc(db, 'users', partnerId));
  if (partnerSnap.data()?.coupleId) throw new Error('此邀請碼已被使用');

  const coupleRef = doc(collection(db, 'couples'));
  await setDoc(coupleRef, { members: [myUserId, partnerId], createdAt: new Date() });
  await updateDoc(doc(db, 'users', myUserId), { coupleId: coupleRef.id });
  await updateDoc(doc(db, 'users', partnerId), { coupleId: coupleRef.id });
  return coupleRef.id;
}

export async function updateBirthday(userId: string, birthday: string): Promise<void> {
  await updateDoc(doc(db, 'users', userId), { birthday });
}

export async function updateUserName(userId: string, name: string): Promise<void> {
  await updateDoc(doc(db, 'users', userId), { name });
}

export async function updateAvatarUrl(userId: string, avatarUrl: string): Promise<void> {
  await updateDoc(doc(db, 'users', userId), { avatarUrl });
}

export async function setPeriodOwner(coupleId: string, userId: string): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId), { periodOwnerId: userId });
}

export async function updateCoupleAnniversary(coupleId: string, date: string): Promise<void> {
  const [y, m, d] = date.split('-').map(Number);
  await updateDoc(doc(db, 'couples', coupleId), {
    anniversaryDate: new Date(y, m - 1, d),
  });
}

export async function unpairCouple(userId: string): Promise<void> {
  await updateDoc(doc(db, 'users', userId), { coupleId: deleteField() });
}

export async function signOut() {
  await firebaseSignOut(auth);
}
