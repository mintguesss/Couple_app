import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, TextInput, Alert,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useCouple } from '@/context/CoupleContext';
import {
  subscribeToHealthHistory, DailyHealth, Meal,
  addMealForDate, moveMealToDate, removeMeal,
} from '@/services/healthService';
import DatePickerButton from '@/components/DatePickerButton';

const CATEGORIES = [
  { key: '早餐', emoji: '🌅' },
  { key: '午餐', emoji: '☀️' },
  { key: '晚餐', emoji: '🌙' },
  { key: '飲料', emoji: '🧋' },
  { key: '點心', emoji: '🍪' },
];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function mealEmoji(cat?: string) {
  return CATEGORIES.find(c => c.key === cat)?.emoji ?? '🍽️';
}

export default function MealsRecords() {
  const { profile } = useAuth();
  const { partner, couple } = useCouple();
  const [myRecords, setMyRecords] = useState<DailyHealth[]>([]);
  const [partnerRecords, setPartnerRecords] = useState<DailyHealth[]>([]);
  const [tab, setTab] = useState<'me' | 'partner'>('me');

  const [addModal, setAddModal] = useState(false);
  const [addDate, setAddDate] = useState(todayStr());
  const [addDesc, setAddDesc] = useState('');
  const [addCat, setAddCat] = useState('早餐');

  const [editTarget, setEditTarget] = useState<{ date: string; index: number } | null>(null);
  const [editDate, setEditDate] = useState(todayStr());
  const [editDesc, setEditDesc] = useState('');
  const [editCat, setEditCat] = useState('早餐');

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
  const withMeals = records.filter(r => r.meals?.length > 0).sort((a, b) => b.date.localeCompare(a.date));
  const totalMeals = withMeals.reduce((s, r) => s + r.meals.length, 0);

  const handleAdd = async () => {
    if (!addDesc.trim()) { Alert.alert('提示', '請輸入飲食內容'); return; }
    await addMealForDate(coupleId, userId, addDate, addDesc.trim(), undefined, addCat);
    setAddDesc(''); setAddModal(false);
  };

  const handleEdit = async () => {
    if (!editTarget || !editDesc.trim()) return;
    await moveMealToDate(coupleId, userId, editTarget.date, editTarget.index, editDate, editDesc.trim());
    setEditTarget(null);
  };

  const openEdit = (date: string, index: number, meal: Meal) => {
    setEditTarget({ date, index });
    setEditDate(date);
    setEditDesc(meal.description);
    setEditCat(meal.category ?? '早餐');
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

      {/* Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{totalMeals}</Text>
          <Text style={styles.statLabel}>總記錄餐數</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{records.length > 0 ? (totalMeals / records.length).toFixed(1) : '—'}</Text>
          <Text style={styles.statLabel}>每日平均</Text>
        </View>
      </View>

      {isMe && (
        <TouchableOpacity style={styles.addBtn} onPress={() => { setAddDate(todayStr()); setAddDesc(''); setAddCat('早餐'); setAddModal(true); }}>
          <Text style={styles.addBtnText}>+ 新增飲食紀錄</Text>
        </TouchableOpacity>
      )}

      {withMeals.length === 0 ? (
        <Text style={styles.empty}>還沒有飲食紀錄</Text>
      ) : (
        withMeals.map((record) => (
          <View key={record.date} style={styles.daySection}>
            <Text style={styles.dayDate}>{record.date}</Text>
            {record.meals.map((meal, i) => (
              <View key={i} style={styles.mealRow}>
                <Text style={styles.mealEmoji}>{mealEmoji(meal.category)}</Text>
                <View style={styles.mealInfo}>
                  {meal.category && <Text style={styles.mealCat}>{meal.category}</Text>}
                  <Text style={styles.mealDesc}>{meal.description}</Text>
                  <Text style={styles.mealTime}>{meal.time}</Text>
                </View>
                {isMe && (
                  <>
                    <TouchableOpacity onPress={() => openEdit(record.date, i, meal)}><Text style={styles.actionBtn}>✏️</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => Alert.alert('刪除', '確定？', [{ text: '取消', style: 'cancel' }, { text: '刪除', style: 'destructive', onPress: () => removeMeal(coupleId, userId, i) }])}><Text style={styles.actionBtn}>🗑️</Text></TouchableOpacity>
                  </>
                )}
              </View>
            ))}
          </View>
        ))
      )}

      {/* Add modal */}
      <Modal visible={addModal} transparent animationType="slide">
        <TouchableOpacity style={styles.overlay} onPress={() => setAddModal(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>新增飲食紀錄 🍽️</Text>
          <DatePickerButton value={addDate} onChange={setAddDate} label="日期" />
          <Text style={styles.catLabel}>類別</Text>
          <View style={styles.catRow}>
            {CATEGORIES.map(c => (
              <TouchableOpacity key={c.key} style={[styles.catBtn, addCat === c.key && styles.catBtnActive]} onPress={() => setAddCat(c.key)}>
                <Text style={styles.catEmoji}>{c.emoji}</Text>
                <Text style={[styles.catText, addCat === c.key && styles.catTextActive]}>{c.key}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput style={styles.input} placeholder="飲食內容" placeholderTextColor="#BBBBBB" value={addDesc} onChangeText={setAddDesc} autoFocus multiline />
          <TouchableOpacity style={styles.saveBtn} onPress={handleAdd}>
            <Text style={styles.saveBtnText}>新增 ✓</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Edit modal */}
      <Modal visible={!!editTarget} transparent animationType="slide">
        <TouchableOpacity style={styles.overlay} onPress={() => setEditTarget(null)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>修改飲食紀錄 ✏️</Text>
          <DatePickerButton value={editDate} onChange={setEditDate} label="日期" />
          <Text style={styles.catLabel}>類別</Text>
          <View style={styles.catRow}>
            {CATEGORIES.map(c => (
              <TouchableOpacity key={c.key} style={[styles.catBtn, editCat === c.key && styles.catBtnActive]} onPress={() => setEditCat(c.key)}>
                <Text style={styles.catEmoji}>{c.emoji}</Text>
                <Text style={[styles.catText, editCat === c.key && styles.catTextActive]}>{c.key}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput style={styles.input} value={editDesc} onChangeText={setEditDesc} autoFocus multiline />
          <TouchableOpacity style={styles.saveBtn} onPress={handleEdit}>
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
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, padding: 4, marginBottom: 16, shadowColor: '#C77DFF', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 2 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#C77DFF' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#888' },
  tabTextActive: { color: '#fff' },
  summaryCard: { backgroundColor: '#C77DFF', borderRadius: 18, padding: 20, flexDirection: 'row', marginBottom: 16 },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 26, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 2, textAlign: 'center' },
  divider: { width: 1, backgroundColor: 'rgba(255,255,255,0.4)', marginVertical: 4 },
  addBtn: { backgroundColor: '#C77DFF', borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginBottom: 20 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  empty: { textAlign: 'center', color: '#BBBBBB', marginTop: 40, fontSize: 15 },
  daySection: { marginBottom: 20 },
  dayDate: { fontSize: 14, fontWeight: '700', color: '#2D2D2D', marginBottom: 8 },
  mealRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  mealEmoji: { fontSize: 24, marginRight: 10 },
  mealInfo: { flex: 1 },
  mealCat: { fontSize: 11, color: '#C77DFF', fontWeight: '700', marginBottom: 1 },
  mealDesc: { fontSize: 14, color: '#2D2D2D' },
  mealTime: { fontSize: 11, color: '#BBBBBB', marginTop: 1 },
  actionBtn: { fontSize: 18, paddingLeft: 8 },
  catLabel: { fontSize: 13, color: '#888', marginBottom: 8 },
  catRow: { flexDirection: 'row', gap: 6, marginBottom: 14, flexWrap: 'wrap' },
  catBtn: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, backgroundColor: '#F5F5F5', borderRadius: 12, minWidth: 52 },
  catBtnActive: { backgroundColor: '#F3E8FF', borderWidth: 1.5, borderColor: '#C77DFF' },
  catEmoji: { fontSize: 20, marginBottom: 2 },
  catText: { fontSize: 11, color: '#888', fontWeight: '600' },
  catTextActive: { color: '#C77DFF' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: '#2D2D2D', marginBottom: 16 },
  input: { backgroundColor: '#FFF5F7', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#2D2D2D', marginBottom: 16, minHeight: 70, textAlignVertical: 'top' },
  saveBtn: { backgroundColor: '#C77DFF', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
