import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useCouple } from '@/context/CoupleContext';
import {
  subscribeToAllPoop, recordPoopForDate, updatePoopDate, deletePoop, PoopRecord,
} from '@/services/poopService';
import DatePickerButton from '@/components/DatePickerButton';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function groupByMonth(records: PoopRecord[]): Record<string, PoopRecord[]> {
  const map: Record<string, PoopRecord[]> = {};
  for (const r of records) {
    if (!map[r.month]) map[r.month] = [];
    map[r.month].push(r);
  }
  return map;
}

export default function PoopRecords() {
  const { profile } = useAuth();
  const { partner, couple } = useCouple();
  const [myRecords, setMyRecords] = useState<PoopRecord[]>([]);
  const [partnerRecords, setPartnerRecords] = useState<PoopRecord[]>([]);
  const [tab, setTab] = useState<'me' | 'partner'>('me');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [addModal, setAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<PoopRecord | null>(null);
  const [selDate, setSelDate] = useState(todayStr());
  const [saving, setSaving] = useState(false);

  const coupleId = profile?.coupleId ?? '';
  const userId = profile?.uid ?? '';
  const partnerId = couple?.members.find(id => id !== userId) ?? '';

  useEffect(() => {
    if (!coupleId || !userId) return;
    const u1 = subscribeToAllPoop(coupleId, userId, setMyRecords);
    const u2 = partnerId ? subscribeToAllPoop(coupleId, partnerId, setPartnerRecords) : () => {};
    return () => { u1(); u2(); };
  }, [coupleId, userId, partnerId]);

  const isMe = tab === 'me';
  const records = isMe ? myRecords : partnerRecords;
  const byMonth = groupByMonth(records);
  const months = Object.keys(byMonth).sort((a, b) => b.localeCompare(a));
  const maxCount = Math.max(...months.map(m => byMonth[m].length), 1);
  const avgPerMonth = months.length > 0 ? (records.length / months.length).toFixed(1) : '—';

  const handleAdd = async () => {
    setSaving(true);
    try {
      await recordPoopForDate(coupleId, userId, selDate);
      setAddModal(false);
    } finally { setSaving(false); }
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      await updatePoopDate(coupleId, editTarget.id, selDate);
      setEditTarget(null);
    } finally { setSaving(false); }
  };

  const openEdit = (r: PoopRecord) => {
    setEditTarget(r);
    const d = r.recordedAt;
    setSelDate(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
  };

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

      {/* Total */}
      <View style={styles.totalCard}>
        <Text style={styles.totalNum}>{records.length}</Text>
        <Text style={styles.totalLabel}>{isMe ? '我的' : `${partner?.name ?? '對方'}的`}總排便次數 💩</Text>
        <Text style={styles.totalSub}>{months.length} 個月　平均 {avgPerMonth} 次/月</Text>
      </View>

      {isMe && (
        <TouchableOpacity style={styles.addBtn} onPress={() => { setSelDate(todayStr()); setAddModal(true); }}>
          <Text style={styles.addBtnText}>+ 手動新增紀錄</Text>
        </TouchableOpacity>
      )}

      {months.length === 0 ? (
        <Text style={styles.empty}>還沒有紀錄</Text>
      ) : (
        months.map((month) => {
          const recs = byMonth[month];
          const isExp = expanded === month;
          const cur = new Date().toISOString().slice(0, 7);
          return (
            <View key={month} style={styles.monthCard}>
              <TouchableOpacity style={styles.monthHeader} onPress={() => setExpanded(isExp ? null : month)}>
                <View style={styles.monthLeft}>
                  <Text style={styles.monthTitle}>{month.replace('-', ' 年 ')} 月{month === cur ? ' （本月）' : ''}</Text>
                  <View style={styles.barWrap}>
                    <View style={[styles.barFill, { width: `${(recs.length / maxCount) * 100}%` as any }]} />
                  </View>
                </View>
                <Text style={styles.monthCount}>{recs.length} 次</Text>
                <Text style={styles.arrow}>{isExp ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {isExp && (
                <View style={styles.recordList}>
                  {recs.map((r) => (
                    <View key={r.id} style={styles.recordRow}>
                      <Text style={styles.recordEmoji}>💩</Text>
                      <Text style={styles.recordTime}>
                        {r.recordedAt.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })}{'  '}
                        {r.recordedAt.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      {isMe && (
                        <>
                          <TouchableOpacity onPress={() => openEdit(r)} style={styles.actionBtn}><Text>✏️</Text></TouchableOpacity>
                          <TouchableOpacity onPress={() => deletePoop(coupleId, r.id)} style={styles.actionBtn}><Text>🗑️</Text></TouchableOpacity>
                        </>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })
      )}

      <Modal visible={addModal} transparent animationType="slide">
        <TouchableOpacity style={styles.overlay} onPress={() => setAddModal(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>新增排便紀錄 💩</Text>
          <DatePickerButton value={selDate} onChange={setSelDate} label="日期" />
          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.5 }]} onPress={handleAdd} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? '儲存中...' : '記錄 ✓'}</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal visible={!!editTarget} transparent animationType="slide">
        <TouchableOpacity style={styles.overlay} onPress={() => setEditTarget(null)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>修改日期 ✏️</Text>
          <DatePickerButton value={selDate} onChange={setSelDate} label="修改為此日期" />
          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.5 }]} onPress={handleEdit} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? '儲存中...' : '儲存 ✓'}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF5F7' },
  content: { padding: 20, paddingBottom: 50 },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, padding: 4, marginBottom: 16, shadowColor: '#8B6914', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 2 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#8B6914' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#888' },
  tabTextActive: { color: '#fff' },
  totalCard: { backgroundColor: '#8B6914', borderRadius: 18, padding: 24, alignItems: 'center', marginBottom: 16 },
  totalNum: { fontSize: 56, fontWeight: '900', color: '#fff' },
  totalLabel: { fontSize: 15, color: '#FFE082', fontWeight: '600', marginTop: 4 },
  totalSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 6 },
  addBtn: { backgroundColor: '#8B6914', borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginBottom: 20 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  empty: { textAlign: 'center', color: '#BBBBBB', marginTop: 40, fontSize: 15 },
  monthCard: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  monthHeader: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  monthLeft: { flex: 1 },
  monthTitle: { fontSize: 14, fontWeight: '700', color: '#2D2D2D', marginBottom: 6 },
  barWrap: { height: 8, backgroundColor: '#FFF8E1', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, backgroundColor: '#FFD700', borderRadius: 4 },
  monthCount: { fontSize: 18, fontWeight: '800', color: '#8B6914', marginHorizontal: 12 },
  arrow: { fontSize: 12, color: '#888' },
  recordList: { borderTopWidth: 1, borderTopColor: '#FFF8E1', paddingHorizontal: 16, paddingBottom: 8 },
  recordRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#FAFAFA' },
  recordEmoji: { fontSize: 18, marginRight: 10 },
  recordTime: { flex: 1, fontSize: 14, color: '#555' },
  actionBtn: { padding: 6 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: '#2D2D2D', marginBottom: 16 },
  saveBtn: { backgroundColor: '#8B6914', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
