import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useCouple } from '@/context/CoupleContext';
import {
  subscribeToAllPeriods, startPeriod, upsertDayEntry, deleteDayEntry,
  updatePeriodEnd, updatePeriodDates, deletePeriod,
  PeriodRecord, DailyEntry, FlowLevel,
  FLOW_LABELS, FLOW_EMOJI, PAIN_LEVELS, predictNextPeriod,
} from '@/services/periodService';
import { setPeriodOwner } from '@/services/authService';
import DatePickerButton from '@/components/DatePickerButton';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function daysAgo(dateStr: string) {
  const diff = Math.round((new Date().getTime() - new Date(dateStr).getTime()) / 86400000);
  if (diff === 0) return '今天';
  if (diff === 1) return '昨天';
  return `${diff} 天前`;
}

function FlowSelector({ value, onChange }: { value: FlowLevel; onChange: (v: FlowLevel) => void }) {
  return (
    <View style={s.selRow}>
      {(['light', 'medium', 'heavy'] as FlowLevel[]).map(f => (
        <TouchableOpacity key={f} style={[s.selBtn, value === f && s.selBtnActive]} onPress={() => onChange(f)}>
          <Text style={s.selEmoji}>{FLOW_EMOJI[f]}</Text>
          <Text style={[s.selText, value === f && s.selTextActive]}>{FLOW_LABELS[f]}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
function PainSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={s.selRow}>
      {PAIN_LEVELS.map(p => (
        <TouchableOpacity key={p.value} style={[s.selBtn, value === p.value && s.selBtnActive]} onPress={() => onChange(p.value)}>
          <Text style={s.selEmoji}>{p.emoji}</Text>
          <Text style={[s.selText, value === p.value && s.selTextActive]}>{p.value}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function PeriodScreen() {
  const { user, profile } = useAuth();
  const { partner, couple } = useCouple();
  const [records, setRecords] = useState<PeriodRecord[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Start modal
  const [startModal, setStartModal] = useState(false);
  const [startDate, setStartDate] = useState(todayStr());
  const [startFlow, setStartFlow] = useState<FlowLevel>('medium');
  const [startPain, setStartPain] = useState(1);
  const [startNotes, setStartNotes] = useState('');

  // Day entry modal (used for both active and history)
  const [dayModal, setDayModal] = useState(false);
  const [dayPeriodId, setDayPeriodId] = useState('');
  const [dayDate, setDayDate] = useState(todayStr());
  const [dayFlow, setDayFlow] = useState<FlowLevel>('medium');
  const [dayPain, setDayPain] = useState(1);
  const [dayNotes, setDayNotes] = useState('');

  // End modal
  const [endModal, setEndModal] = useState(false);
  const [endDate, setEndDate] = useState(todayStr());

  // Edit period dates modal
  const [editPeriodModal, setEditPeriodModal] = useState(false);
  const [editPeriodTarget, setEditPeriodTarget] = useState<PeriodRecord | null>(null);
  const [editPeriodStart, setEditPeriodStart] = useState('');
  const [editPeriodEnd, setEditPeriodEnd] = useState('');
  const [editPeriodSaving, setEditPeriodSaving] = useState(false);

  // Confirm delete modals (web-safe, no Alert)
  const [delDayTarget, setDelDayTarget] = useState<{ periodId: string; date: string } | null>(null);
  const [delPeriodTarget, setDelPeriodTarget] = useState<PeriodRecord | null>(null);

  const coupleId = profile?.coupleId ?? '';
  const myId = user?.uid ?? '';

  useEffect(() => {
    if (!coupleId) return;
    return subscribeToAllPeriods(coupleId, setRecords);
  }, [coupleId]);

  const activePeriod = records.find(r => r.isActive) ?? null;
  const completedRecords = records.filter(r => !r.isActive);
  const prediction = predictNextPeriod(completedRecords);

  // ── Handlers ──────────────────────────────────────────────

  const handleStart = async () => {
    if (!coupleId) return;
    await startPeriod(coupleId, myId, startDate, startFlow, startNotes, startPain);
    setStartModal(false); setStartNotes('');
  };

  const openDayModal = (periodId: string, existing?: DailyEntry) => {
    setDayPeriodId(periodId);
    setDayDate(existing?.date ?? todayStr());
    setDayFlow(existing?.flow ?? 'medium');
    setDayPain(existing?.pain ?? 1);
    setDayNotes(existing?.notes ?? '');
    setDayModal(true);
  };

  const handleSaveDay = async () => {
    await upsertDayEntry(coupleId, dayPeriodId, {
      date: dayDate, flow: dayFlow, pain: dayPain, notes: dayNotes,
    });
    setDayModal(false);
  };

  const handleConfirmDelDay = async () => {
    if (!delDayTarget) return;
    await deleteDayEntry(coupleId, delDayTarget.periodId, delDayTarget.date);
    setDelDayTarget(null);
  };

  const handleEnd = async () => {
    if (!activePeriod) return;
    await updatePeriodEnd(coupleId, activePeriod.id, activePeriod.startDate, endDate);
    setEndModal(false);
  };

  const openEditPeriod = (r: PeriodRecord) => {
    setEditPeriodTarget(r);
    setEditPeriodStart(r.startDate);
    setEditPeriodEnd(r.endDate ?? '');
    setEditPeriodModal(true);
  };

  const handleSaveEditPeriod = async () => {
    if (!editPeriodTarget) return;
    setEditPeriodSaving(true);
    try {
      await updatePeriodDates(coupleId, editPeriodTarget.id, editPeriodStart, editPeriodEnd || undefined);
      setEditPeriodModal(false);
    } finally { setEditPeriodSaving(false); }
  };

  const handleConfirmDelPeriod = async () => {
    if (!delPeriodTarget) return;
    await deletePeriod(coupleId, delPeriodTarget.id);
    setDelPeriodTarget(null);
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const avgDays = completedRecords.filter(r => r.daysCount).length > 0
    ? Math.round(completedRecords.filter(r => r.daysCount).reduce((sum, r) => sum + (r.daysCount ?? 0), 0) / completedRecords.filter(r => r.daysCount).length)
    : null;

  // 月經擁有者（從 couple 文件讀取，一次設定永久記憶）
  const periodOwnerId = couple?.periodOwnerId ?? null;
  const periodOwnerName = !periodOwnerId
    ? '未設定'
    : periodOwnerId === myId
      ? (profile?.name ?? '我')
      : (partner?.name ?? '對方');
  const whoRecorded = (_r: PeriodRecord) => periodOwnerName;

  // ── Day row (reused in active + history) ───────────────────
  const renderDayRow = (day: DailyEntry, periodId: string) => (
    <View key={day.date} style={s.dayRow}>
      <View style={s.dayLeft}>
        <Text style={s.dayDate}>{day.date.slice(5)}</Text>
        <Text style={s.dayAgo}>{daysAgo(day.date)}</Text>
      </View>
      <View style={s.dayMiddle}>
        <Text style={s.dayFlow}>{FLOW_EMOJI[day.flow]} {FLOW_LABELS[day.flow]}</Text>
        <Text style={s.dayPain}>{PAIN_LEVELS.find(p => p.value === day.pain)?.emoji} {day.pain}/5</Text>
      </View>
      {day.notes ? <Text style={s.dayNotes} numberOfLines={1}>{day.notes}</Text> : null}
      <View style={s.dayActions}>
        <TouchableOpacity onPress={() => openDayModal(periodId, day)} style={s.dayActionBtn}>
          <Text>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setDelDayTarget({ periodId, date: day.date })} style={s.dayActionBtn}>
          <Text>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>

      {/* One-time owner setup — disappears after setting */}
      {!periodOwnerId && couple?.id && (
        <View style={s.ownerSetup}>
          <Text style={s.ownerSetupTitle}>🩸 誰的月經？</Text>
          <Text style={s.ownerSetupSub}>設定一次，之後就不會再問</Text>
          <View style={s.ownerSetupBtns}>
            <TouchableOpacity style={s.ownerBtn} onPress={() => setPeriodOwner(couple.id, myId)}>
              <Text style={s.ownerBtnText}>{profile?.name ?? '我'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.ownerBtn, s.ownerBtnPartner]} onPress={() => setPeriodOwner(couple.id, partner?.uid ?? myId)}>
              <Text style={s.ownerBtnText}>{partner?.name ?? '對方'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Prediction */}
      {prediction && (
        <View style={[s.predCard, prediction.daysUntil < 5 && s.predCardWarn]}>
          <Text style={s.predEmoji}>{prediction.daysUntil <= 0 ? '🩸' : '📅'}</Text>
          <View>
            <Text style={s.predTitle}>預測下次月經</Text>
            <Text style={s.predDate}>{prediction.date}</Text>
            <Text style={s.predSub}>
              {prediction.daysUntil > 0 ? `還有 ${prediction.daysUntil} 天` : prediction.daysUntil === 0 ? '預計今天' : `已過 ${Math.abs(prediction.daysUntil)} 天`}
              　週期 {prediction.avgCycle} 天{prediction.isEstimate ? '（預設，累積紀錄後自動調整）' : ''}
            </Text>
          </View>
        </View>
      )}

      {/* Stats */}
      <View style={s.statsCard}>
        <View style={s.statItem}><Text style={s.statNum}>{completedRecords.length}</Text><Text style={s.statLabel}>總次數</Text></View>
        <View style={s.statDivider} />
        <View style={s.statItem}><Text style={s.statNum}>{avgDays ?? '—'}</Text><Text style={s.statLabel}>平均天數</Text></View>
        <View style={s.statDivider} />
        <View style={s.statItem}><Text style={s.statNum}>{prediction?.avgCycle ? `${prediction.avgCycle}天` : '—'}</Text><Text style={s.statLabel}>平均週期</Text></View>
      </View>

      {/* Active period */}
      {activePeriod ? (
        <View style={s.activeSection}>
          <View style={s.activeSectionHeader}>
            <View>
              <Text style={s.activeSectionTitle}>🩸 進行中（{whoRecorded(activePeriod)}）</Text>
              <Text style={s.activeSectionSub}>開始 {activePeriod.startDate}　已紀錄 {activePeriod.days.length} 天</Text>
            </View>
            <TouchableOpacity style={s.endBtn} onPress={() => { setEndDate(todayStr()); setEndModal(true); }}>
              <Text style={s.endBtnText}>結束</Text>
            </TouchableOpacity>
          </View>
          {activePeriod.days.map(day => renderDayRow(day, activePeriod.id))}
          <TouchableOpacity style={s.addDayBtn} onPress={() => openDayModal(activePeriod.id)}>
            <Text style={s.addDayBtnText}>+ 記錄今天 / 補登</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={s.startBtn} onPress={() => { setStartDate(todayStr()); setStartModal(true); }}>
          <Text style={s.startBtnEmoji}>🩸</Text>
          <Text style={s.startBtnText}>記錄月經開始</Text>
        </TouchableOpacity>
      )}

      {/* History */}
      <Text style={s.historyTitle}>歷史紀錄</Text>
      {completedRecords.length === 0 ? (
        <Text style={s.emptyText}>還沒有紀錄</Text>
      ) : (
        completedRecords.map(r => {
          const expanded = expandedIds.has(r.id);
          const avgPain = r.days.length > 0
            ? (r.days.reduce((sum, d) => sum + d.pain, 0) / r.days.length).toFixed(1)
            : null;
          return (
            <View key={r.id} style={s.historyCard}>
              <TouchableOpacity style={s.historyHeader} onPress={() => toggleExpand(r.id)}>
                <View style={s.historyLeft}>
                  <Text style={s.historyDate}>{r.startDate} ～ {r.endDate ?? '？'}</Text>
                  <Text style={s.historySub}>
                    {r.daysCount ? `${r.daysCount} 天　` : ''}
                    {avgPain ? `平均疼痛 ${avgPain}/5　` : ''}
                    {whoRecorded(r)}
                  </Text>
                </View>
                {/* Edit + Delete buttons in header */}
                <View style={s.historyBtns}>
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation?.(); openEditPeriod(r); }}
                    style={s.historyActionBtn}
                  >
                    <Text>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation?.(); setDelPeriodTarget(r); }}
                    style={s.historyActionBtn}
                  >
                    <Text>🗑️</Text>
                  </TouchableOpacity>
                  <Text style={s.historyArrow}>{expanded ? '▲' : '▼'}</Text>
                </View>
              </TouchableOpacity>

              {expanded && (
                <View style={s.historyExpanded}>
                  {r.days.length === 0 ? (
                    <Text style={s.emptyText}>無每日紀錄</Text>
                  ) : (
                    r.days.map(day => renderDayRow(day, r.id))
                  )}
                  {/* 補登按鈕 — available for ALL periods */}
                  <TouchableOpacity style={s.addDayBtn} onPress={() => openDayModal(r.id)}>
                    <Text style={s.addDayBtnText}>+ 補登記錄</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })
      )}

      {/* ── Start modal ──────────────────────────────────────── */}
      <Modal visible={startModal} transparent animationType="slide">
        <TouchableOpacity style={s.overlay} onPress={() => setStartModal(false)} />
        <View style={s.sheet}>
          <Text style={s.sheetTitle}>🩸 記錄月經開始</Text>
          <DatePickerButton value={startDate} onChange={setStartDate} label="開始日期" />
          <Text style={s.sheetLabel}>出血量</Text>
          <FlowSelector value={startFlow} onChange={setStartFlow} />
          <Text style={s.sheetLabel}>疼痛程度</Text>
          <PainSelector value={startPain} onChange={setStartPain} />
          <TextInput style={s.notesInput} placeholder="備註（可選）" placeholderTextColor="#BBBBBB" value={startNotes} onChangeText={setStartNotes} />
          <TouchableOpacity style={s.sheetBtn} onPress={handleStart}>
            <Text style={s.sheetBtnText}>記錄開始 ✓</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ── Day entry modal ───────────────────────────────────── */}
      <Modal visible={dayModal} transparent animationType="slide">
        <TouchableOpacity style={s.overlay} onPress={() => setDayModal(false)} />
        <View style={s.sheet}>
          <Text style={s.sheetTitle}>📝 每日紀錄</Text>
          <DatePickerButton value={dayDate} onChange={setDayDate} label="日期" />
          <Text style={s.sheetLabel}>出血量</Text>
          <FlowSelector value={dayFlow} onChange={setDayFlow} />
          <Text style={s.sheetLabel}>疼痛程度</Text>
          <PainSelector value={dayPain} onChange={setDayPain} />
          <TextInput style={s.notesInput} placeholder="備註（可選）" placeholderTextColor="#BBBBBB" value={dayNotes} onChangeText={setDayNotes} />
          <TouchableOpacity style={s.sheetBtn} onPress={handleSaveDay}>
            <Text style={s.sheetBtnText}>儲存 ✓</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ── End modal ─────────────────────────────────────────── */}
      <Modal visible={endModal} transparent animationType="slide">
        <TouchableOpacity style={s.overlay} onPress={() => setEndModal(false)} />
        <View style={s.sheet}>
          <Text style={s.sheetTitle}>🩸 記錄結束</Text>
          <DatePickerButton value={endDate} onChange={setEndDate} label="結束日期" />
          <TouchableOpacity style={[s.sheetBtn, { backgroundColor: '#FF6B9D' }]} onPress={handleEnd}>
            <Text style={s.sheetBtnText}>確認結束 ✓</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ── Edit period dates modal ───────────────────────────── */}
      <Modal visible={editPeriodModal} transparent animationType="slide">
        <TouchableOpacity style={s.overlay} onPress={() => setEditPeriodModal(false)} />
        <View style={s.sheet}>
          <Text style={s.sheetTitle}>✏️ 修改日期</Text>
          <DatePickerButton value={editPeriodStart} onChange={setEditPeriodStart} label="開始日期" />
          <DatePickerButton value={editPeriodEnd} onChange={setEditPeriodEnd} label="結束日期（可選）" />
          <TouchableOpacity
            style={[s.sheetBtn, editPeriodSaving && { opacity: 0.5 }]}
            onPress={handleSaveEditPeriod}
            disabled={editPeriodSaving}
          >
            <Text style={s.sheetBtnText}>{editPeriodSaving ? '儲存中...' : '儲存 ✓'}</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ── Confirm delete day (Modal, web-safe) ─────────────── */}
      <Modal visible={!!delDayTarget} transparent animationType="fade">
        <View style={s.confirmOverlay}>
          <View style={s.confirmBox}>
            <Text style={s.confirmTitle}>刪除這天紀錄？</Text>
            <Text style={s.confirmMsg}>{delDayTarget?.date}</Text>
            <View style={s.confirmBtns}>
              <TouchableOpacity style={s.confirmCancel} onPress={() => setDelDayTarget(null)}>
                <Text style={s.confirmCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmDel} onPress={handleConfirmDelDay}>
                <Text style={s.confirmDelText}>刪除</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Confirm delete period (Modal, web-safe) ───────────── */}
      <Modal visible={!!delPeriodTarget} transparent animationType="fade">
        <View style={s.confirmOverlay}>
          <View style={s.confirmBox}>
            <Text style={s.confirmTitle}>刪除整筆月經紀錄？</Text>
            <Text style={s.confirmMsg}>{delPeriodTarget?.startDate} 開始的紀錄（含所有每日記錄）</Text>
            <View style={s.confirmBtns}>
              <TouchableOpacity style={s.confirmCancel} onPress={() => setDelPeriodTarget(null)}>
                <Text style={s.confirmCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmDel} onPress={handleConfirmDelPeriod}>
                <Text style={s.confirmDelText}>刪除</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF5F7' },
  content: { padding: 16, paddingBottom: 50 },
  predCard: { backgroundColor: '#FFF0F5', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1.5, borderColor: '#FFB3CC' },
  predCardWarn: { borderColor: '#FF6B9D' },
  predEmoji: { fontSize: 32 },
  predTitle: { fontSize: 12, color: '#888', marginBottom: 2 },
  predDate: { fontSize: 18, fontWeight: '800', color: '#FF6B9D' },
  predSub: { fontSize: 12, color: '#888', marginTop: 2 },
  statsCard: { backgroundColor: '#FF6B9D', borderRadius: 16, padding: 16, flexDirection: 'row', marginBottom: 16 },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.85)' },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.4)', marginVertical: 4 },
  activeSection: { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 16, shadowColor: '#FF6B9D', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  activeSectionHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  activeSectionTitle: { fontSize: 15, fontWeight: '700', color: '#FF6B9D' },
  activeSectionSub: { fontSize: 12, color: '#888', marginTop: 3 },
  endBtn: { backgroundColor: '#FFF0F5', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#FF6B9D' },
  endBtnText: { color: '#FF6B9D', fontWeight: '700', fontSize: 13 },
  dayRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#FFF5F7' },
  dayLeft: { width: 52 },
  dayDate: { fontSize: 13, fontWeight: '700', color: '#2D2D2D' },
  dayAgo: { fontSize: 10, color: '#BBBBBB' },
  dayMiddle: { flex: 1, flexDirection: 'row', gap: 10 },
  dayFlow: { fontSize: 13, color: '#555' },
  dayPain: { fontSize: 13, color: '#555' },
  dayNotes: { flex: 1, fontSize: 11, color: '#888' },
  dayActions: { flexDirection: 'row' },
  dayActionBtn: { padding: 6 },
  addDayBtn: { marginTop: 10, backgroundColor: '#FFF0F5', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  addDayBtnText: { color: '#FF6B9D', fontWeight: '600', fontSize: 14 },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF0F5', borderRadius: 16, paddingVertical: 16, gap: 10, borderWidth: 1.5, borderColor: '#FFB3CC', marginBottom: 16 },
  startBtnEmoji: { fontSize: 22 },
  startBtnText: { color: '#FF6B9D', fontWeight: '700', fontSize: 16 },
  historyTitle: { fontSize: 15, fontWeight: '700', color: '#2D2D2D', marginBottom: 10 },
  emptyText: { color: '#BBBBBB', textAlign: 'center', fontSize: 13, padding: 12 },
  historyCard: { backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  historyHeader: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  historyLeft: { flex: 1 },
  historyDate: { fontSize: 14, fontWeight: '700', color: '#2D2D2D' },
  historySub: { fontSize: 12, color: '#888', marginTop: 2 },
  historyBtns: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  historyActionBtn: { padding: 6 },
  historyArrow: { fontSize: 12, color: '#888', paddingLeft: 4 },
  historyExpanded: { borderTopWidth: 1, borderTopColor: '#FFF5F7', paddingHorizontal: 14, paddingBottom: 10 },
  selRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  selBtn: { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  selBtnActive: { backgroundColor: '#FFF0F5', borderWidth: 1.5, borderColor: '#FF6B9D' },
  selEmoji: { fontSize: 16, marginBottom: 2 },
  selText: { fontSize: 11, color: '#888', fontWeight: '600' },
  selTextActive: { color: '#FF6B9D' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: '#2D2D2D', marginBottom: 14 },
  sheetLabel: { fontSize: 13, color: '#888', marginBottom: 8 },
  notesInput: { backgroundColor: '#FFF5F7', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#2D2D2D', marginBottom: 14 },
  sheetBtn: { backgroundColor: '#C77DFF', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  sheetBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  confirmBox: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: 290 },
  confirmTitle: { fontSize: 16, fontWeight: '800', color: '#2D2D2D', marginBottom: 8 },
  confirmMsg: { fontSize: 13, color: '#555', marginBottom: 20 },
  confirmBtns: { flexDirection: 'row', gap: 10 },
  confirmCancel: { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  confirmCancelText: { fontSize: 14, fontWeight: '600', color: '#888' },
  confirmDel: { flex: 1, backgroundColor: '#FF4444', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  confirmDelText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  ownerSetup: {
    backgroundColor: '#fff', borderRadius: 18, padding: 20, marginBottom: 14,
    shadowColor: '#FF6B9D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 4,
    alignItems: 'center',
  },
  ownerSetupTitle: { fontSize: 18, fontWeight: '800', color: '#2D2D2D', marginBottom: 6 },
  ownerSetupSub: { fontSize: 13, color: '#888', marginBottom: 18 },
  ownerSetupBtns: { flexDirection: 'row', gap: 14, width: '100%' },
  ownerBtn: {
    flex: 1, backgroundColor: '#FF6B9D', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
    shadowColor: '#FF6B9D', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 3,
  },
  ownerBtnPartner: { backgroundColor: '#C77DFF' },
  ownerBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
