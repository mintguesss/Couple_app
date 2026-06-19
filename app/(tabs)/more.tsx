import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, Image, Alert, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useCouple } from '@/context/CoupleContext';
import {
  signOut, updateBirthday, updateCoupleAnniversary,
  updateUserName, updateAvatarUrl,
} from '@/services/authService';
import { uploadImage } from '@/services/cloudinaryService';
import DatePickerButton from '@/components/DatePickerButton';
import ImageCropModal from '@/components/ImageCropModal';

const FEATURES = [
  { emoji: '📸', label: '回憶相冊', desc: '保存你們的珍貴照片', route: '/memory' },
  { emoji: '😊', label: '心情日記', desc: '記錄每天的心情與感受', route: '/mood' },
  { emoji: '🎮', label: '情侶遊戲', desc: '每日問答、情侶挑戰', route: '/games' },
  { emoji: '✅', label: '共同任務', desc: '一起管理代辦清單', route: '/tasks' },
  { emoji: '🩸', label: '月經追蹤', desc: '紀錄週期、天數、出血量', route: '/period' },
  { emoji: '📖', label: '圖鑑', desc: '達成本週健康目標來收集', route: '/collection' },
];

function dateToStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function AvatarCircle({ uri, emoji, size = 72, onPress, uploading }: {
  uri?: string; emoji: string; size?: number; onPress?: () => void; uploading?: boolean;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={{ alignItems: 'center' }}>
      <View style={[styles.avatarCircle, { width: size, height: size, borderRadius: size / 2 }]}>
        {uri ? (
          <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} resizeMode="cover" />
        ) : (
          <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>
        )}
        {uploading && (
          <View style={styles.avatarOverlay}>
            <Text style={styles.avatarOverlayText}>⏳</Text>
          </View>
        )}
      </View>
      {onPress && <Text style={styles.avatarEditHint}>點擊更換</Text>}
    </TouchableOpacity>
  );
}

export default function MoreScreen() {
  const { profile, user, refreshProfile } = useAuth();
  const { partner, couple } = useCouple();
  const router = useRouter();

  // Avatar
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [cropUri, setCropUri] = useState<string | null>(null);

  // Name
  const [name, setName] = useState(profile?.name ?? '');
  const [editingName, setEditingName] = useState(false);
  const [savingName, setSavingName] = useState(false);

  // Birthday
  const [birthday, setBirthday] = useState(profile?.birthday ?? '');
  const [editingBday, setEditingBday] = useState(false);
  const [savingBday, setSavingBday] = useState(false);

  // Anniversary — useEffect so partner updates are reflected
  const [anniversary, setAnniversary] = useState('');
  const [editingAnn, setEditingAnn] = useState(false);
  const [savingAnn, setSavingAnn] = useState(false);

  const [logoutModal, setLogoutModal] = useState(false);

  useEffect(() => {
    if (profile?.name) setName(profile.name);
    if (profile?.birthday) setBirthday(profile.birthday);
  }, [profile?.name, profile?.birthday]);

  useEffect(() => {
    if (couple?.anniversaryDate) setAnniversary(dateToStr(couple.anniversaryDate));
  }, [couple?.anniversaryDate]);

  const handlePickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      // On native: let OS handle crop. On web: we show our crop modal.
      allowsEditing: Platform.OS !== 'web',
      aspect: Platform.OS !== 'web' ? [1, 1] : undefined,
      quality: 0.9,
    });
    if (result.canceled || !result.assets[0] || !user) return;
    if (Platform.OS === 'web') {
      setCropUri(result.assets[0].uri);
    } else {
      doUploadAvatar(result.assets[0].uri);
    }
  };

  const doUploadAvatar = async (uri: string) => {
    if (!user) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadImage(uri);
      await updateAvatarUrl(user.uid, url);
      await refreshProfile();
    } catch {
      Alert.alert('上傳失敗', '請確認網路連線後再試');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveName = async () => {
    if (!user || !name.trim()) return;
    setSavingName(true);
    try {
      await updateUserName(user.uid, name.trim());
      await refreshProfile();
      setEditingName(false);
    } finally { setSavingName(false); }
  };

  const handleSaveBirthday = async () => {
    if (!user) return;
    setSavingBday(true);
    try {
      await updateBirthday(user.uid, birthday);
      await refreshProfile();
      setEditingBday(false);
    } finally { setSavingBday(false); }
  };

  const handleSaveAnniversary = async () => {
    if (!couple?.id) return;
    setSavingAnn(true);
    try {
      await updateCoupleAnniversary(couple.id, anniversary);
      setEditingAnn(false);
    } finally { setSavingAnn(false); }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarRow}>
          <View style={styles.avatarItem}>
            <AvatarCircle
              uri={profile?.avatarUrl}
              emoji="🙂"
              onPress={handlePickAvatar}
              uploading={uploadingAvatar}
            />
            <Text style={styles.avatarName}>{profile?.name}</Text>
          </View>
          <Text style={styles.heartIcon}>💕</Text>
          <View style={styles.avatarItem}>
            <AvatarCircle
              uri={partner?.avatarUrl}
              emoji="🥰"
            />
            <Text style={styles.avatarName}>{partner?.name ?? '等待配對'}</Text>
          </View>
        </View>
        <View style={styles.inviteRow}>
          <Text style={styles.inviteLabel}>邀請碼：</Text>
          <Text style={styles.inviteCode}>{profile?.inviteCode}</Text>
        </View>
      </View>

      {/* Settings */}
      <View style={styles.settingsCard}>
        <Text style={styles.settingsTitle}>⚙️ 個人設定</Text>

        {/* Name */}
        <View style={styles.settingBlock}>
          <View style={styles.settingBlockHeader}>
            <Text style={styles.settingLabel}>👤 我的名字</Text>
            {!editingName && <TouchableOpacity onPress={() => setEditingName(true)}><Text style={styles.editHint}>✏️</Text></TouchableOpacity>}
          </View>
          {editingName ? (
            <View>
              <TextInput style={styles.nameInput} value={name} onChangeText={setName} autoFocus placeholder="輸入名字" placeholderTextColor="#BBBBBB" />
              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveName} disabled={savingName}>
                  <Text style={styles.saveBtnText}>{savingName ? '儲存中...' : '儲存 ✓'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setEditingName(false); setName(profile?.name ?? ''); }}>
                  <Text style={styles.cancelBtnText}>取消</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <Text style={styles.settingValue}>{profile?.name || '未設定'}</Text>
          )}
        </View>

        {/* Birthday */}
        <View style={styles.settingBlock}>
          <View style={styles.settingBlockHeader}>
            <Text style={styles.settingLabel}>🎂 我的生日</Text>
            {!editingBday && <TouchableOpacity onPress={() => setEditingBday(true)}><Text style={styles.editHint}>✏️</Text></TouchableOpacity>}
          </View>
          {editingBday ? (
            <View>
              <DatePickerButton value={birthday} onChange={setBirthday} />
              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveBirthday} disabled={savingBday}>
                  <Text style={styles.saveBtnText}>{savingBday ? '儲存中...' : '儲存 ✓'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setEditingBday(false); setBirthday(profile?.birthday ?? ''); }}>
                  <Text style={styles.cancelBtnText}>取消</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <Text style={styles.settingValue}>{profile?.birthday || '尚未設定'}</Text>
          )}
        </View>

        {/* Partner birthday */}
        {partner?.birthday && (
          <View style={styles.settingBlock}>
            <Text style={styles.settingLabel}>🎂 {partner.name}的生日</Text>
            <Text style={styles.settingValue}>{partner.birthday}</Text>
          </View>
        )}

        {/* Anniversary */}
        <View style={styles.settingBlock}>
          <View style={styles.settingBlockHeader}>
            <Text style={styles.settingLabel}>💕 交往紀念日</Text>
            {!editingAnn && <TouchableOpacity onPress={() => setEditingAnn(true)}><Text style={styles.editHint}>✏️</Text></TouchableOpacity>}
          </View>
          {editingAnn ? (
            <View>
              <DatePickerButton value={anniversary} onChange={setAnniversary} />
              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveAnniversary} disabled={savingAnn}>
                  <Text style={styles.saveBtnText}>{savingAnn ? '儲存中...' : '儲存 ✓'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingAnn(false)}>
                  <Text style={styles.cancelBtnText}>取消</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <Text style={styles.settingValue}>{anniversary || '尚未設定'}</Text>
          )}
        </View>
      </View>

      {/* Features */}
      <Text style={styles.sectionTitle}>功能</Text>
      <View style={styles.featureGrid}>
        {FEATURES.map((f) => (
          <TouchableOpacity key={f.label} style={styles.featureCard} onPress={() => router.push(f.route as any)}>
            <Text style={styles.featureEmoji}>{f.emoji}</Text>
            <Text style={styles.featureLabel}>{f.label}</Text>
            <Text style={styles.featureDesc}>{f.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sign out */}
      <TouchableOpacity style={styles.logoutBtn} onPress={() => setLogoutModal(true)}>
        <Text style={styles.logoutText}>登出帳號</Text>
      </TouchableOpacity>

      {/* Image crop modal (web only) */}
      {cropUri && (
        <ImageCropModal
          uri={cropUri}
          onConfirm={(croppedUri) => { setCropUri(null); doUploadAvatar(croppedUri); }}
          onCancel={() => setCropUri(null)}
        />
      )}

      {/* Logout confirm */}
      <Modal visible={logoutModal} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>登出</Text>
            <Text style={styles.confirmMsg}>確定要登出嗎？</Text>
            <View style={styles.confirmBtns}>
              <TouchableOpacity style={styles.confirmCancel} onPress={() => setLogoutModal(false)}>
                <Text style={styles.confirmCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmDel} onPress={() => { setLogoutModal(false); signOut(); }}>
                <Text style={styles.confirmDelText}>登出</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF5F7' },
  content: { padding: 20, paddingBottom: 50 },
  profileCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16,
    shadowColor: '#FF6B9D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 4,
  },
  avatarRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', marginBottom: 16 },
  avatarItem: { alignItems: 'center', flex: 1 },
  avatarCircle: {
    backgroundColor: '#FFF0F5', justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden', marginBottom: 6,
    borderWidth: 2, borderColor: '#FFB3CC',
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarOverlayText: { fontSize: 20 },
  avatarEditHint: { fontSize: 11, color: '#FF6B9D', marginTop: 2 },
  avatarName: { fontSize: 14, fontWeight: '700', color: '#2D2D2D', marginTop: 4 },
  heartIcon: { fontSize: 28, paddingTop: 22 },
  inviteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  inviteLabel: { fontSize: 13, color: '#888' },
  inviteCode: { fontSize: 16, fontWeight: '800', color: '#FF6B9D', letterSpacing: 3, marginLeft: 4 },
  settingsCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 20,
    shadowColor: '#FF6B9D', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
  },
  settingsTitle: { fontSize: 15, fontWeight: '700', color: '#2D2D2D', marginBottom: 14 },
  settingBlock: { marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  settingBlockHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  settingLabel: { fontSize: 14, color: '#555', fontWeight: '600' },
  editHint: { fontSize: 16 },
  settingValue: { fontSize: 14, color: '#FF6B9D', fontWeight: '600' },
  nameInput: {
    backgroundColor: '#FFF5F7', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, color: '#2D2D2D', borderWidth: 1.5, borderColor: '#F0E0E5', marginBottom: 8,
  },
  btnRow: { flexDirection: 'row', gap: 8 },
  saveBtn: { flex: 1, backgroundColor: '#FF6B9D', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  cancelBtn: { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  cancelBtnText: { color: '#888', fontWeight: '600', fontSize: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#2D2D2D', marginBottom: 12 },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  featureCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 18, width: '47%', alignItems: 'center',
    shadowColor: '#FF6B9D', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
  },
  featureEmoji: { fontSize: 34, marginBottom: 8 },
  featureLabel: { fontSize: 14, fontWeight: '700', color: '#2D2D2D', marginBottom: 4 },
  featureDesc: { fontSize: 11, color: '#888', textAlign: 'center' },
  logoutBtn: { backgroundColor: '#F5F5F5', borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  logoutText: { color: '#888', fontSize: 15, fontWeight: '600' },
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  confirmBox: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: 280 },
  confirmTitle: { fontSize: 17, fontWeight: '800', color: '#2D2D2D', marginBottom: 8 },
  confirmMsg: { fontSize: 14, color: '#555', marginBottom: 20 },
  confirmBtns: { flexDirection: 'row', gap: 10 },
  confirmCancel: { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  confirmCancelText: { fontSize: 14, fontWeight: '600', color: '#888' },
  confirmDel: { flex: 1, backgroundColor: '#FF4444', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  confirmDelText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
