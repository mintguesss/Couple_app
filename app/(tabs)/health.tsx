import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, Animated, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useCouple } from '@/context/CoupleContext';
import {
  subscribeToTodayHealth, addWater, removeWater,
  addMeal, addMealForDate, removeMeal, DailyHealth,
  fetchPastHealth,
} from '@/services/healthService';
import DatePickerButton from '@/components/DatePickerButton';

const MEAL_CATEGORIES = [
  { key: '早餐', emoji: '🌅' },
  { key: '午餐', emoji: '☀️' },
  { key: '晚餐', emoji: '🌙' },
  { key: '飲料', emoji: '🧋' },
  { key: '點心', emoji: '🍪' },
];
import {
  recordPoop, deletePoop, subscribeToMonthlyPoop, PoopRecord,
} from '@/services/poopService';
import { useWeeklyCollection } from '@/hooks/use-weekly-collection';
import { CollectibleReveal } from '@/components/CollectibleReveal';

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <View style={styles.barBg}>
      <View style={[styles.barFill, { width: `${Math.min(value / max, 1) * 100}%` as any, backgroundColor: color }]} />
    </View>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <View style={styles.miniBarBg}>
      <View style={[styles.miniBarFill, { height: `${Math.min(value / max, 1) * 100}%` as any, backgroundColor: color }]} />
    </View>
  );
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const DAY_LABELS = ['今', '昨', '前', '4', '5', '6', '7'];

export default function HealthScreen() {
  const { user, profile } = useAuth();
  const { partner, couple } = useCouple();

  const [myHealth, setMyHealth] = useState<DailyHealth>({ userId: '', date: '', water: 0, meals: [] });
  const [partnerHealth, setPartnerHealth] = useState<DailyHealth>({ userId: '', date: '', water: 0, meals: [] });
  const [mealModal, setMealModal] = useState(false);
  const [mealInput, setMealInput] = useState('');
  const [mealDate, setMealDate] = useState('');
  const [mealCategory, setMealCategory] = useState('早餐');
  const [myPoop, setMyPoop] = useState<PoopRecord[]>([]);
  const [partnerPoop, setPartnerPoop] = useState<PoopRecord[]>([]);
  const [poopAnim] = useState(new Animated.Value(1));
  const [showPoopRecords, setShowPoopRecords] = useState(false);
  const [history, setHistory] = useState<{ date: string; water: number; meals: number }[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const coupleId = profile?.coupleId ?? '';
  const myId = user?.uid ?? '';
  const partnerId = couple?.members.find((id) => id !== myId) ?? '';
  const partnerName = partner?.name ?? '對方';
  const month = currentMonth();
  const router = useRouter();

  useEffect(() => {
    if (!coupleId || !myId) return;
    const u1 = subscribeToTodayHealth(coupleId, myId, setMyHealth);
    const u2 = partnerId ? subscribeToTodayHealth(coupleId, partnerId, setPartnerHealth) : () => {};
    const u3 = subscribeToMonthlyPoop(coupleId, month, (records) => {
      setMyPoop(records.filter((r) => r.userId === myId));
      setPartnerPoop(records.filter((r) => r.userId === partnerId));
    });
    return () => { u1(); u2(); u3(); };
  }, [coupleId, myId, partnerId]);

  const weekly = useWeeklyCollection(coupleId || undefined, myId, partnerId);

  const loadHistory = useCallback(async () => {
    if (!coupleId || !myId) return;
    const data = await fetchPastHealth(coupleId, myId, 7);
    setHistory(data);
    setShowHistory(true);
  }, [coupleId, myId]);

  const handlePoop = async () => {
    if (!coupleId) { Alert.alert('錯誤', '尚未配對'); return; }
    try {
      await recordPoop(coupleId, myId);
      Animated.sequence([
        Animated.timing(poopAnim, { toValue: 1.6, duration: 120, useNativeDriver: true }),
        Animated.timing(poopAnim, { toValue: 0.85, duration: 80, useNativeDriver: true }),
        Animated.timing(poopAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();
    } catch (e: any) {
      Alert.alert('記錄失敗', e.message ?? '請確認 Firestore 規則');
    }
  };

  const openMealModal = () => {
    setMealDate(todayStr());
    setMealCategory('早餐');
    setMealInput('');
    setMealModal(true);
  };

  const handleAddMeal = async () => {
    if (!mealInput.trim()) return;
    await addMealForDate(coupleId, myId, mealDate, mealInput.trim(), undefined, mealCategory);
    setMealInput('');
    setMealModal(false);
  };


  // Merge today's meals from both users, sorted by time
  const allMeals = [
    ...myHealth.meals.map((m, i) => ({ ...m, isMe: true, index: i })),
    ...partnerHealth.meals.map((m, i) => ({ ...m, isMe: false, index: i })),
  ].sort((a, b) => a.time.localeCompare(b.time));

  const todayPoopCount = myPoop.filter(r => r.recordedAt.toDateString() === new Date().toDateString()).length;
  const partnerTodayPoop = partnerPoop.filter(r => r.recordedAt.toDateString() === new Date().toDateString()).length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Weekly collection challenge */}
      <TouchableOpacity style={styles.weeklyCard} onPress={() => router.push('/collection' as any)} activeOpacity={0.85}>
        <View style={styles.weeklyHeader}>
          <Text style={styles.weeklyTitle}>本週圖鑑挑戰 📖</Text>
          <Text style={styles.weeklyCount}>已收集 {weekly.collectedCount}/{weekly.totalCount}</Text>
        </View>
        <View style={styles.weeklyRow}>
          <Text style={styles.weeklyLabel}>💧 雙方喝水 {weekly.totalWater}/{weekly.waterTarget} 杯</Text>
          <Bar value={weekly.totalWater} max={weekly.waterTarget} color="#56CFE1" />
        </View>
        <View style={styles.weeklyRow}>
          <Text style={styles.weeklyLabel}>💩 雙方拉屎 {weekly.totalPoop}/{weekly.poopTarget} 次</Text>
          <Bar value={weekly.totalPoop} max={weekly.poopTarget} color="#8B6914" />
        </View>

        {weekly.selectedItem && (
          <View style={styles.weeklyTargetRow}>
            <CollectibleReveal emoji={weekly.selectedItem.emoji} progress={weekly.revealProgress} size={34} />
            <Text style={styles.weeklyTargetText}>
              本週目標：{weekly.collectedThisWeek
                ? `已收集「${weekly.selectedItem.name}」🎉`
                : `${weekly.selectedItem.name}（剪影會隨進度逐漸顯現）`}
            </Text>
          </View>
        )}

        <Text style={styles.weeklyHint}>
          {weekly.selectedItem
            ? '點我查看圖鑑 ›'
            : weekly.collectedThisWeek
              ? '🎉 本週已收集到新圖鑑！點我查看圖鑑 ›'
              : '還沒選擇本週圖鑑，點我前往選擇 ›'}
        </Text>
      </TouchableOpacity>

      {/* ── Water (both users) ─────────────────────── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardIcon}>💧</Text>
          <Text style={styles.cardTitle}>喝水</Text>
          <TouchableOpacity onPress={() => router.push('/records/water' as any)} style={styles.recordLink}>
            <Text style={styles.recordLinkText}>紀錄 ›</Text>
          </TouchableOpacity>
        </View>

        {/* My row */}
        <View style={styles.userRow}>
          <Text style={styles.userName}>我</Text>
          <View style={styles.barWrap}><Bar value={myHealth.water} max={8} color="#56CFE1" /></View>
          <Text style={[styles.userCount, myHealth.water >= 8 && styles.goalText]}>{myHealth.water}/8</Text>
        </View>
        {/* Partner row */}
        <View style={styles.userRow}>
          <Text style={styles.userName}>{partnerName}</Text>
          <View style={styles.barWrap}><Bar value={partnerHealth.water} max={8} color="#B0E8F7" /></View>
          <Text style={[styles.userCount, partnerHealth.water >= 8 && styles.goalText]}>{partnerHealth.water}/8</Text>
        </View>

        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.minusBtn} onPress={() => removeWater(coupleId, myId)} disabled={myHealth.water === 0}>
            <Text style={styles.minusBtnText}>−</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addWaterBtn} onPress={() => addWater(coupleId, myId)}>
            <Text style={styles.addWaterBtnText}>+ 喝了一杯水 💧</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Meals (both users interleaved) ─────────── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardIcon}>🍽️</Text>
          <Text style={styles.cardTitle}>飲食</Text>
          <TouchableOpacity onPress={() => router.push('/records/meals' as any)} style={styles.recordLink}>
            <Text style={styles.recordLinkText}>紀錄 ›</Text>
          </TouchableOpacity>
        </View>

        {/* Progress rows — same layout as water */}
        <View style={styles.userRow}>
          <Text style={styles.userName}>我</Text>
          <View style={styles.barWrap}><Bar value={myHealth.meals.length} max={3} color="#C77DFF" /></View>
          <Text style={styles.userCount}>{myHealth.meals.length}/3</Text>
        </View>
        <View style={styles.userRow}>
          <Text style={styles.userName}>{partnerName}</Text>
          <View style={styles.barWrap}><Bar value={partnerHealth.meals.length} max={3} color="#E5C8FF" /></View>
          <Text style={styles.userCount}>{partnerHealth.meals.length}/3</Text>
        </View>

        {/* Combined meal list */}
        {allMeals.map((m, i) => (
          <View key={i} style={[styles.mealRow, m.isMe ? styles.mealRowMe : styles.mealRowPartner]}>
            <View style={[styles.mealTag, { backgroundColor: m.isMe ? '#C77DFF' : '#E5C8FF' }]}>
              <Text style={styles.mealTagText}>{m.isMe ? '我' : partnerName}</Text>
            </View>
            <Text style={styles.mealTime}>{m.time}</Text>
            <Text style={styles.mealDesc} numberOfLines={1}>{m.description}</Text>
            {m.isMe && (
              <TouchableOpacity onPress={() => removeMeal(coupleId, myId, m.index)}>
                <Text style={styles.mealDelete}>×</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        <TouchableOpacity style={styles.addMealBtn} onPress={openMealModal}>
          <Text style={styles.addMealBtnText}>+ 記錄我的飲食 🍽️</Text>
        </TouchableOpacity>
      </View>

      {/* ── Poop (both users) ────────────────────────── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardIcon}>💩</Text>
          <View style={styles.poopTitle}>
            <Text style={styles.cardTitle}>排便紀錄</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/records/poop' as any)} style={styles.recordLink}>
            <Text style={styles.recordLinkText}>所有紀錄 ›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.poopStatsRow}>
          <View style={styles.poopStatItem}>
            <Text style={styles.poopStatName}>我</Text>
            <Text style={styles.poopStatCount}>{myPoop.length}</Text>
            <Text style={styles.poopStatSub}>本月</Text>
            <Text style={styles.poopStatToday}>今天 {todayPoopCount} 次</Text>
          </View>
          <View style={styles.poopDivider} />
          <View style={styles.poopStatItem}>
            <Text style={styles.poopStatName}>{partnerName}</Text>
            <Text style={styles.poopStatCount}>{partnerPoop.length}</Text>
            <Text style={styles.poopStatSub}>本月</Text>
            <Text style={styles.poopStatToday}>今天 {partnerTodayPoop} 次</Text>
          </View>
          <Animated.View style={{ transform: [{ scale: poopAnim }], marginLeft: 16 }}>
            <TouchableOpacity style={styles.poopBtn} onPress={handlePoop}>
              <Text style={styles.poopBtnEmoji}>💩</Text>
              <Text style={styles.poopBtnText}>我拉了！</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        <TouchableOpacity style={styles.poopRecordsToggle} onPress={() => setShowPoopRecords(v => !v)}>
          <Text style={styles.poopRecordsToggleText}>
            {showPoopRecords ? '▲ 收起' : `▼ 本月明細（${myPoop.length} 筆）`}
          </Text>
        </TouchableOpacity>
        {showPoopRecords && (
          <View style={styles.poopList}>
            {myPoop.length === 0 ? (
              <Text style={styles.emptySmall}>本月還沒有紀錄</Text>
            ) : (
              myPoop.map((r) => (
                <View key={r.id} style={styles.poopRecordRow}>
                  <Text style={styles.poopRecordTime}>
                    {r.recordedAt.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })}  {r.recordedAt.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <TouchableOpacity onPress={() => deletePoop(coupleId, r.id)}>
                    <Text style={styles.poopRecordDel}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}
      </View>

      {/* History */}
      <TouchableOpacity style={styles.historyToggle} onPress={showHistory ? () => setShowHistory(false) : loadHistory}>
        <Text style={styles.historyToggleText}>{showHistory ? '▲ 收起歷史' : '▼ 查看我的過去 7 天'}</Text>
      </TouchableOpacity>

      {showHistory && history.length > 0 && (
        <View style={styles.historyCard}>
          <Text style={styles.historyTitle}>過去 7 天</Text>
          <View style={styles.chartRow}>
            {history.map((h, i) => (
              <View key={h.date} style={styles.chartCol}>
                <View style={styles.barsRow}>
                  <MiniBar value={h.water} max={8} color="#56CFE1" />
                  <MiniBar value={h.meals} max={3} color="#C77DFF" />
                </View>
                <Text style={styles.chartDay}>{DAY_LABELS[i]}</Text>
                <Text style={styles.chartNum}>{h.water}</Text>
              </View>
            ))}
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: '#56CFE1' }]} />
            <Text style={styles.legendText}>喝水（杯）</Text>
            <View style={[styles.legendDot, { backgroundColor: '#C77DFF', marginLeft: 12 }]} />
            <Text style={styles.legendText}>飲食（餐）</Text>
          </View>
        </View>
      )}

      {/* Meal modal */}
      <Modal visible={mealModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setMealModal(false)} />
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>記錄飲食</Text>
          <DatePickerButton value={mealDate} onChange={setMealDate} label="日期" />
          <Text style={styles.modalCatLabel}>類別</Text>
          <View style={styles.modalCatRow}>
            {MEAL_CATEGORIES.map(c => (
              <TouchableOpacity
                key={c.key}
                style={[styles.modalCatBtn, mealCategory === c.key && styles.modalCatBtnActive]}
                onPress={() => setMealCategory(c.key)}
              >
                <Text style={styles.modalCatEmoji}>{c.emoji}</Text>
                <Text style={[styles.modalCatText, mealCategory === c.key && styles.modalCatTextActive]}>{c.key}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.modalInput}
            placeholder="例如：蛋餅、豆漿"
            placeholderTextColor="#BBBBBB"
            value={mealInput}
            onChangeText={setMealInput}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleAddMeal}
          />
          <TouchableOpacity style={styles.modalBtn} onPress={handleAddMeal}>
            <Text style={styles.modalBtnText}>記錄 ✓</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF5F7' },
  content: { padding: 20, paddingBottom: 50 },
  weeklyCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16,
    shadowColor: '#FF6B9D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 4,
  },
  weeklyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  weeklyTitle: { fontSize: 16, fontWeight: '800', color: '#2D2D2D' },
  weeklyCount: { fontSize: 12, color: '#FF6B9D', fontWeight: '700' },
  weeklyRow: { marginBottom: 10 },
  weeklyLabel: { fontSize: 12, color: '#888', marginBottom: 5 },
  weeklyTargetRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F5F5F5',
  },
  weeklyTargetText: { flex: 1, fontSize: 12, color: '#888' },
  weeklyHint: { fontSize: 12, color: '#FF6B9D', fontWeight: '600', textAlign: 'center', marginTop: 8 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14,
    shadowColor: '#FF6B9D', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardIcon: { fontSize: 20, marginRight: 8 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: '#2D2D2D' },
  recordLink: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#FFF0F5', borderRadius: 8 },
  recordLinkText: { color: '#FF6B9D', fontSize: 12, fontWeight: '600' },
  userRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  userName: { width: 38, fontSize: 12, color: '#555', fontWeight: '600' },
  barWrap: { flex: 1, marginHorizontal: 8 },
  userCount: { width: 28, fontSize: 12, color: '#555', textAlign: 'right' },
  goalText: { color: '#56CFE1', fontWeight: '700' },
  btnRow: { flexDirection: 'row', marginTop: 8, gap: 8 },
  minusBtn: { backgroundColor: '#F5F5F5', borderRadius: 10, width: 42, height: 42, justifyContent: 'center', alignItems: 'center' },
  minusBtnText: { fontSize: 20, color: '#888' },
  addWaterBtn: { flex: 1, backgroundColor: '#E8F9FC', borderRadius: 10, height: 42, justifyContent: 'center', alignItems: 'center' },
  addWaterBtnText: { color: '#56CFE1', fontWeight: '600', fontSize: 14 },
  mealProgressRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  mealProgressItem: { flex: 1 },
  mealRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, borderRadius: 8, padding: 8 },
  mealRowMe: { backgroundColor: '#F9F3FF' },
  mealRowPartner: { backgroundColor: '#F5F5F5' },
  mealTag: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginRight: 8 },
  mealTagText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  mealTime: { fontSize: 11, color: '#888', marginRight: 6, width: 36 },
  mealDesc: { flex: 1, fontSize: 13, color: '#2D2D2D' },
  mealDelete: { fontSize: 18, color: '#BBBBBB', paddingLeft: 8 },
  addMealBtn: { marginTop: 8, backgroundColor: '#F3E8FF', borderRadius: 10, height: 40, justifyContent: 'center', alignItems: 'center' },
  addMealBtnText: { color: '#C77DFF', fontWeight: '600', fontSize: 14 },
  poopTitle: { flex: 1 },
  poopStatsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  poopStatItem: { flex: 1, alignItems: 'center' },
  poopStatName: { fontSize: 12, color: '#888', marginBottom: 2 },
  poopStatCount: { fontSize: 28, fontWeight: '800', color: '#8B6914' },
  poopStatSub: { fontSize: 10, color: '#BBBBBB' },
  poopStatToday: { fontSize: 11, color: '#888', marginTop: 2 },
  poopDivider: { width: 1, height: 50, backgroundColor: '#F0E0E5' },
  poopBtn: { backgroundColor: '#FFF8E1', borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 2, borderColor: '#FFE082' },
  poopBtnEmoji: { fontSize: 32, marginBottom: 2 },
  poopBtnText: { fontSize: 11, fontWeight: '700', color: '#8B6914' },
  poopRecordsToggle: { backgroundColor: '#FFF8E1', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  poopRecordsToggleText: { color: '#8B6914', fontSize: 12, fontWeight: '600' },
  poopList: { marginTop: 8 },
  poopRecordRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#FFF8E1' },
  poopRecordTime: { fontSize: 13, color: '#555' },
  poopRecordDel: { fontSize: 16 },
  emptySmall: { color: '#BBBBBB', fontSize: 12, textAlign: 'center', padding: 8 },
  historyToggle: { backgroundColor: '#FFF0F5', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginBottom: 12 },
  historyToggleText: { color: '#FF6B9D', fontWeight: '600', fontSize: 14 },
  historyCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16,
    shadowColor: '#FF6B9D', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
  },
  historyTitle: { fontSize: 14, fontWeight: '700', color: '#2D2D2D', marginBottom: 14 },
  chartRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 80, marginBottom: 8 },
  chartCol: { alignItems: 'center', flex: 1 },
  barsRow: { flexDirection: 'row', gap: 2, alignItems: 'flex-end', height: 60 },
  miniBarBg: { width: 10, height: 60, backgroundColor: '#F0E0E5', borderRadius: 5, justifyContent: 'flex-end', overflow: 'hidden' },
  miniBarFill: { width: '100%', borderRadius: 5 },
  chartDay: { fontSize: 10, color: '#888', marginTop: 4 },
  chartNum: { fontSize: 11, fontWeight: '600', color: '#56CFE1' },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: '#888', marginLeft: 4 },
  barBg: { height: 8, backgroundColor: '#F0E0E5', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#2D2D2D', marginBottom: 16 },
  modalInput: { backgroundColor: '#FFF5F7', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#2D2D2D', marginBottom: 16 },
  modalBtn: { backgroundColor: '#C77DFF', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  modalBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalCatLabel: { fontSize: 13, color: '#888', marginBottom: 8 },
  modalCatRow: { flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' },
  modalCatBtn: { alignItems: 'center', paddingVertical: 7, paddingHorizontal: 10, backgroundColor: '#F5F5F5', borderRadius: 10, minWidth: 50 },
  modalCatBtnActive: { backgroundColor: '#F3E8FF', borderWidth: 1.5, borderColor: '#C77DFF' },
  modalCatEmoji: { fontSize: 18, marginBottom: 2 },
  modalCatText: { fontSize: 10, color: '#888', fontWeight: '600' },
  modalCatTextActive: { color: '#C77DFF' },
});
