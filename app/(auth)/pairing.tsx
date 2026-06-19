import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ScrollView, Share,
} from 'react-native';
import { doc, setDoc, updateDoc, getDoc, collection } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { pairWithPartner, signOut } from '@/services/authService';
import { useAuth } from '@/context/AuthContext';

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function PairingScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState(profile?.inviteCode ?? '');

  // 如果邀請碼是空的（Firestore 規則先前阻擋），自動補建
  useEffect(() => {
    const fix = async () => {
      if (!user) return;
      if (profile?.inviteCode) {
        setInviteCode(profile.inviteCode);
        return;
      }
      // 嘗試從 Firestore 讀取，或重新建立
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists() && snap.data().inviteCode) {
        setInviteCode(snap.data().inviteCode);
        await refreshProfile();
      } else {
        // 第一次寫入或之前被規則阻擋，重新建立
        const newCode = generateInviteCode();
        const name = profile?.name ?? snap.data()?.name ?? '使用者';
        await setDoc(doc(db, 'users', user.uid), { name, inviteCode: newCode, createdAt: new Date() }, { merge: true });
        await setDoc(doc(db, 'inviteCodes', newCode), { userId: user.uid });
        setInviteCode(newCode);
        await refreshProfile();
      }
    };
    fix();
  }, [user?.uid, profile?.inviteCode]);

  const handlePair = async () => {
    if (!code.trim() || !user) {
      Alert.alert('提示', '請輸入邀請碼');
      return;
    }
    setLoading(true);
    try {
      await pairWithPartner(code.trim(), user.uid);
      await refreshProfile();
    } catch (e: any) {
      Alert.alert('配對失敗', e.message ?? '請確認邀請碼是否正確');
    } finally {
      setLoading(false);
    }
  };

  const handleTestMode = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const coupleRef = doc(collection(db, 'couples'));
      await setDoc(coupleRef, { members: [user.uid, user.uid], createdAt: new Date(), isTestMode: true });
      await updateDoc(doc(db, 'users', user.uid), { coupleId: coupleRef.id });
      await refreshProfile();
    } catch {
      Alert.alert('錯誤', '請確認 Firestore 規則已設定');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!inviteCode) return;
    await Share.share({
      message: `用這個邀請碼加入小堡！\n邀請碼：${inviteCode}`,
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.logo}>💌</Text>
      <Text style={styles.title}>邀請你的另一半</Text>
      <Text style={styles.subtitle}>分享邀請碼給對方，或輸入對方的邀請碼</Text>

      {/* My invite code */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>我的邀請碼</Text>
        <Text style={styles.inviteCode}>{inviteCode || '載入中...'}</Text>
        <Text style={styles.cardHint}>將此邀請碼傳給你的另一半</Text>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare} disabled={!inviteCode}>
          <Text style={styles.shareBtnText}>📤 分享邀請碼</Text>
        </TouchableOpacity>
      </View>

      {/* Divider */}
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>或</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Enter partner's code */}
      <Text style={styles.sectionTitle}>輸入對方的邀請碼</Text>
      <TextInput
        style={styles.input}
        placeholder="例如：AB1C2D"
        placeholderTextColor="#BBBBBB"
        value={code}
        onChangeText={(t) => setCode(t.toUpperCase())}
        autoCapitalize="characters"
        maxLength={6}
        returnKeyType="done"
        onSubmitEditing={handlePair}
      />

      <TouchableOpacity style={styles.btn} onPress={handlePair} disabled={loading}>
        <Text style={styles.btnText}>{loading ? '配對中...' : '完成配對 💕'}</Text>
      </TouchableOpacity>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} /><Text style={styles.dividerText}>測試</Text><View style={styles.dividerLine} />
      </View>
      <TouchableOpacity style={styles.testBtn} onPress={handleTestMode} disabled={loading}>
        <Text style={styles.testBtnText}>🧪 單人測試模式</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutBtn} onPress={() => signOut()}>
        <Text style={styles.logoutText}>登出</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#FFF5F7', alignItems: 'center', padding: 28 },
  logo: { fontSize: 72, marginTop: 40, marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', color: '#FF6B9D', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  card: {
    width: '100%', backgroundColor: '#fff', borderRadius: 18,
    padding: 24, alignItems: 'center', marginBottom: 24,
    shadowColor: '#FF6B9D', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 10, elevation: 4,
  },
  cardLabel: { fontSize: 13, color: '#888', marginBottom: 8 },
  inviteCode: { fontSize: 38, fontWeight: '800', color: '#FF6B9D', letterSpacing: 6, marginBottom: 6 },
  cardHint: { fontSize: 12, color: '#BBBBBB', marginBottom: 16 },
  shareBtn: { backgroundColor: '#FFF0F5', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  shareBtnText: { color: '#FF6B9D', fontWeight: '600', fontSize: 14 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', width: '100%', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#F0E0E5' },
  dividerText: { marginHorizontal: 12, color: '#BBBBBB', fontSize: 14 },
  sectionTitle: { alignSelf: 'flex-start', fontSize: 15, fontWeight: '600', color: '#2D2D2D', marginBottom: 10 },
  input: {
    width: '100%', backgroundColor: '#fff', borderRadius: 14,
    paddingHorizontal: 18, paddingVertical: 14, marginBottom: 12,
    fontSize: 22, color: '#2D2D2D', fontWeight: '700', textAlign: 'center', letterSpacing: 4,
    shadowColor: '#FF6B9D', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
  },
  btn: {
    width: '100%', backgroundColor: '#FF6B9D', borderRadius: 14,
    paddingVertical: 15, alignItems: 'center',
    shadowColor: '#FF6B9D', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  testBtn: {
    width: '100%', backgroundColor: '#F5F5F5', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E0E0E0',
  },
  testBtnText: { color: '#888', fontSize: 15, fontWeight: '600' },
  logoutBtn: { marginTop: 24 },
  logoutText: { color: '#BBBBBB', fontSize: 14 },
});
