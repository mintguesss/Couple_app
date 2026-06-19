import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, TextInput, Alert,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useCouple } from '@/context/CoupleContext';
import {
  subscribeToHealthHistory, DailyHealth,
  setWaterForDate, deleteWaterForDate,
} from '@/services/healthService';
import DatePickerButton from '@/components/DatePickerButton';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function groupByMonth(records: DailyHealth[]): Record<string, DailyHealth[]> {
  const map: Record<string, DailyHealth[]> = {};
  for (const r of records) {
    const m = r.date.slice(0, 7);
    if (!map[m]) map[m] = [];
    map[m].push(r);
  }
  return map;
}

export default function WaterRecords() {
  const { profile } = useAuth();
  const { partner, couple } = useCouple();
  const [myRecords, setMyRecords] = useState<DailyHealth[]>([]);
  const [partnerRecords, setPartnerRecords] = useState<DailyHealth[]>([]);
  const [tab, setTab] = useState<'me' | 'partner'>('me');
  const [modal, setModal] = useState(false);
  const [editTarget, setEditTarget] = useState<DailyHealth | null>(null);
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [waterCount, setWaterCount] = useState('4');

  const coupleId = profile?.coupleId ?? '';
  const userId = profile?.uid ?? '';
  const partnerId = couple?.members.find(id => id !== userId) ?? '';

  useEffect(() => {
    if (!coupleId || !userId) return;
    const u1 = subscribeToHealthHistory(coupleId, userId, setMyRecords);
    const u2 = partnerId ? subscribeToHealthHistory(coupleId, partnerId, setPartnerRecords) : () => {};
    return () => { u1(); u2(); };
  }, [coupleId, userId, partnerId]);

  const isMe = tab === 'me';
  const records = isMe ? myRecords : partnerRecords;
  const activeRecords = records.filter(r => r.water > 0);
  const avgWater = activeRecords.length > 0
    ? (activeRecords.reduce((s, r) => s + r.water, 0) / activeRecords.length).toFixed(1) : '—';
  const goalDays = activeRecords.filter(r => r.water >= 8).length;

  const handleSave = async () => {
    const count = parseInt(waterCount, 10);
    if (isNaN(count) || count < 0 || count > 20) { Alert.alert('提示', '請輸入 0-20'); return; }
    await setWaterForDate(coupleId, userId, selectedDate, count);
    setModal(false); setEditTarget(null);
  };

  const openEdit = (r: DailyHealth) => {
    setEditTarget(r); setSelectedDate(r.date); setWaterCount(String(r.water)); setModal(true);
  };

  const handleDelete = (r: DailyHealth) => {
    Alert.alert('刪除', `確定清除 ${r.date} 的喝水紀錄？`, [
      { text: '取消', style: 'cancel' },
      { text: '刪除', style: 'destructive', onPress: () => deleteWaterForDate(coupleId, userId, r.date) },
    ]);
  };

  const byMonth = groupByMonth(activeRecords);
  const months = Object.keys(byMonth).sort((a, b) => b.localeCompare(a));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Tab */}
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'me' && styles.tabActive]} onPress={() => setTab('me')}>
          <Text style={[styles.tabText, tab === 'me' && styles.tabTextActive]}>我的</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'partner' && styles.tabActive]} onPress={() => setTab('partner')}>
          <Text style={[styles.tabText, tab === 'partner' && styles.tabTextActive]}>{partner?.name ?? '對方'}的</Text>
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{avgWater}</Text>
          <Text style={styles.statLabel}>每日平均（杯）</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{goalDays}</Text>
          <Text style={styles.statLabel}>達標天數</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{activeRecords.length}</Text>
          <Text style={styles.statLabel}>紀錄天數</Text>
        </View>
      </View>

      {isMe && (
        <TouchableOpacity style={styles.addBtn} onPress={() => { setEditTarget(null); setSelectedDate(todayStr()); setWaterCount('4'); setModal(true); }}>
          <Text style={styles.addBtnText}>+ 新增喝水紀錄</Text>
        </TouchableOpacity>
      )}

      {months.length === 0 ? (
        <Text style={styles.empty}>還沒有紀錄</Text>
      ) : (
        months.map((month) => {
          const recs = byMonth[month].sort((a, b) => b.date.localeCompare(a.date));
          const avg = (recs.reduce((s, r) => s + r.water, 0) / recs.length).toFixed(1);
          return (
            <View key={month} style={styles.monthSection}>
              <View style={styles.monthHeader}>
                <Text style={styles.monthTitle}>{month.replace('-', ' 年 ')} 月</Text>
                <Text style={styles.monthAvg}>平均 {avg} 杯/天</Text>
              </View>
              {recs.map((r) => (
                <View key={r.date} style={styles.dayRow}>
                  <Text style={styles.dayDate}>{r.date.slice(5)}</Text>
                  <View style={styles.barWrap}>
                    <View style={[styles.barFill, { width: `${Math.min(r.water / 8, 1) * 100}%` as any }]} />
                  </View>
                  <Text style={[styles.dayCount, r.water >= 8 && styles.goalText]}>
                    {r.water} 杯{r.water >= 8 ? ' ✓' : ''}
                  </Text>
                  {isMe && (
                    <>
                      <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(r)}><Text>✏️</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(r)}><Text>🗑️</Text></TouchableOpacity>
                    </>
                  )}
                </View>
              ))}
            </View>
          );
        })
      )}

      <Modal visible={modal} transparent animationType="slide">
        <TouchableOpacity style={styles.overlay} onPress={() => setModal(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>{editTarget ? '修改' : '新增'}喝水紀錄 💧</Text>
          <DatePickerButton value={selectedDate} onChange={setSelectedDate} label="日期" />
          <Text style={styles.inputLabel}>喝了幾杯水</Text>
          <View style={styles.counterRow}>
            <TouchableOpacity style={styles.counterBtn} onPress={() => setWaterCount(v => String(Math.max(0, parseInt(v||'0',10)-1)))}>
              <Text style={styles.counterBtnText}>−</Text>
            </TouchableOpacity>
            <TextInput style={styles.counterInput} value={waterCount} onChangeText={setWaterCount} keyboardType="numeric" textAlign="center" />
            <TouchableOpacity style={styles.counterBtn} onPress={() => setWaterCount(v => String(parseInt(v||'0',10)+1))}>
              <Text style={styles.counterBtnText}>+</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>儲存 ✓</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF5F7' },
  content: { padding: 20, paddingBottom: 50 },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, padding: 4, marginBottom: 16, shadowColor: '#56CFE1', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 2 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#56CFE1' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#888' },
  tabTextActive: { color: '#fff' },
  summaryCard: { backgroundColor: '#56CFE1', borderRadius: 18, padding: 20, flexDirection: 'row', marginBottom: 16 },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 26, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 2, textAlign: 'center' },
  divider: { width: 1, backgroundColor: 'rgba(255,255,255,0.4)', marginVertical: 4 },
  addBtn: { backgroundColor: '#56CFE1', borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginBottom: 20 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  empty: { textAlign: 'center', color: '#BBBBBB', marginTop: 40, fontSize: 15 },
  monthSection: { marginBottom: 24 },
  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  monthTitle: { fontSize: 15, fontWeight: '700', color: '#2D2D2D' },
  monthAvg: { fontSize: 12, color: '#888' },
  dayRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  dayDate: { width: 38, fontSize: 13, color: '#555' },
  barWrap: { flex: 1, height: 10, backgroundColor: '#E8F9FC', borderRadius: 5, overflow: 'hidden', marginHorizontal: 6 },
  barFill: { height: 10, backgroundColor: '#56CFE1', borderRadius: 5 },
  dayCount: { width: 44, fontSize: 12, color: '#555', textAlign: 'right' },
  goalText: { color: '#56CFE1', fontWeight: '700' },
  actionBtn: { padding: 5 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: '#2D2D2D', marginBottom: 16 },
  inputLabel: { fontSize: 13, color: '#888', marginBottom: 10 },
  counterRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  counterBtn: { backgroundColor: '#E8F9FC', borderRadius: 10, width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  counterBtnText: { fontSize: 24, color: '#56CFE1', fontWeight: '700' },
  counterInput: { flex: 1, backgroundColor: '#FFF5F7', borderRadius: 12, paddingVertical: 12, fontSize: 24, fontWeight: '700', color: '#2D2D2D', borderWidth: 1.5, borderColor: '#E8F9FC' },
  saveBtn: { backgroundColor: '#56CFE1', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
