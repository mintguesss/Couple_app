import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, TextInput,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useCouple } from '@/context/CoupleContext';
import {
  subscribeToEvents, addEvent, updateEvent, deleteEvent,
  CalendarEvent, EVENT_CATEGORIES, getCategoryColor,
  addCustomCategory, removeCustomCategory, CustomCategory,
} from '@/services/calendarService';
import { CustomEventCategory } from '@/context/CoupleContext';
import DatePickerButton from '@/components/DatePickerButton';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
const CELL_H = 88;

const HOLIDAYS = [
  { mmdd: '01-01', label: '元旦', color: '#FF9F43' },
  { mmdd: '02-14', label: '情人節 💕', color: '#FF6B9D' },
  { mmdd: '03-14', label: '白色情人節', color: '#C77DFF' },
  { mmdd: '04-05', label: '清明節', color: '#56CFE1' },
  { mmdd: '05-20', label: '520 ❤️', color: '#FF6B9D' },
  { mmdd: '08-10', label: '七夕 🌟', color: '#C77DFF' },
  { mmdd: '10-31', label: '萬聖節 🎃', color: '#FF9F43' },
  { mmdd: '11-11', label: '光棍節 🫶', color: '#56CFE1' },
  { mmdd: '12-24', label: '平安夜 🎁', color: '#4CAF50' },
  { mmdd: '12-25', label: '聖誕節 🎄', color: '#4CAF50' },
];

type DayEvent = { label: string; color: string; textColor: string; id?: string; isUser?: boolean };

function pad(n: number) { return String(n).padStart(2, '0'); }
function toStr(y: number, m: number, d: number) { return `${y}-${pad(m)}-${pad(d)}`; }

export default function CalendarScreen() {
  const { user, profile } = useAuth();
  const { couple, partner } = useCouple();
  const coupleId = profile?.coupleId ?? '';
  const myId = user?.uid ?? '';

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [addModal, setAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('date');
  const [confirmDelete, setConfirmDelete] = useState<CalendarEvent | null>(null);
  const [editTarget, setEditTarget] = useState<CalendarEvent | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCategory, setEditCategory] = useState('date');

  // Custom category creation
  const [newCatModal, setNewCatModal] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatColor, setNewCatColor] = useState('#E74C3C');

  useEffect(() => {
    if (!coupleId) return;
    return subscribeToEvents(coupleId, setEvents);
  }, [coupleId]);

  const todayStr = toStr(now.getFullYear(), now.getMonth() + 1, now.getDate());

  // Custom categories — must be defined BEFORE eventMap building
  const customCats = couple?.customEventCategories ?? [];
  const allCategories = [
    ...EVENT_CATEGORIES,
    ...customCats.map(c => ({ key: c.key, label: c.label, emoji: '🏷️', color: c.color })),
  ];

  const getColorForCategory = (key?: string): string => {
    const custom = customCats.find(c => c.key === key);
    if (custom) return custom.color;
    return getCategoryColor(key);
  };

  // Build event map: date → list of DayEvent
  const eventMap: Record<string, DayEvent[]> = {};

  const pushEvent = (date: string, e: DayEvent) => {
    if (!eventMap[date]) eventMap[date] = [];
    eventMap[date].push(e);
  };

  // Holidays
  for (const h of HOLIDAYS) {
    pushEvent(`${year}-${h.mmdd}`, { label: h.label, color: h.color, textColor: '#fff' });
  }

  // User events — color from category (including custom)
  for (const e of events) {
    pushEvent(e.date, {
      label: e.title,
      color: getColorForCategory(e.category),
      textColor: '#fff',
      id: e.id,
      isUser: true,
    });
  }

  // Birthdays
  const myBday = profile?.birthday ? `${year}-${profile.birthday.slice(5)}` : null;
  const partnerBday = partner?.birthday ? `${year}-${partner.birthday.slice(5)}` : null;
  if (myBday) pushEvent(myBday, { label: `我的生日 🎂`, color: '#C77DFF', textColor: '#fff' });
  if (partnerBday) pushEvent(partnerBday, { label: `${partner?.name}生日 🎂`, color: '#C77DFF', textColor: '#fff' });

  // Custom anniversary (set by user in settings)
  if (couple?.anniversaryDate) {
    const ann = toStr(year, couple.anniversaryDate.getMonth() + 1, couple.anniversaryDate.getDate());
    pushEvent(ann, { label: '交往紀念日 💑', color: '#FF4D88', textColor: '#fff' });
  }

  // Build weeks grid
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const flatCells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (flatCells.length % 7 !== 0) flatCells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < flatCells.length; i += 7) weeks.push(flatCells.slice(i, i + 7));

  const prevMonth = () => { if (month === 1) { setYear(y => y - 1); setMonth(12); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setYear(y => y + 1); setMonth(1); } else setMonth(m => m + 1); };

  const handleAdd = async () => {
    if (!newTitle.trim() || !selectedDate) return;
    await addEvent(coupleId, myId, newTitle.trim(), selectedDate, newDesc.trim(), false, newCategory);
    setNewTitle(''); setNewDesc(''); setNewCategory('date');
    setAddModal(false);
  };

  const openEdit = (ev: CalendarEvent) => {
    setEditTarget(ev);
    setEditTitle(ev.title);
    setEditDate(ev.date);
    setEditDesc(ev.description ?? '');
    setEditCategory(ev.category ?? 'date');
  };

  const handleEdit = async () => {
    if (!editTarget || !editTitle.trim()) return;
    await updateEvent(coupleId, editTarget.id, editTitle.trim(), editDate, editDesc.trim(), false, editCategory);
    setEditTarget(null);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await deleteEvent(coupleId, confirmDelete.id);
    setConfirmDelete(null);
  };

  const handleAddCustomCat = async () => {
    if (!newCatLabel.trim()) return;
    const key = `custom_${Date.now()}`;
    await addCustomCategory(coupleId, { key, label: newCatLabel.trim(), color: newCatColor });
    setNewCatLabel('');
    setNewCatModal(false);
  };


  const selectedEvents = selectedDate ? (eventMap[selectedDate] ?? []) : [];
  const selectedUserEvents = selectedDate ? events.filter(e => e.date === selectedDate) : [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.navBtn} onPress={prevMonth}>
          <Text style={styles.navText}>‹</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.yearText}>{year}</Text>
          <Text style={styles.monthText}>{MONTH_NAMES[month - 1]}</Text>
        </View>
        <TouchableOpacity style={styles.navBtn} onPress={nextMonth}>
          <Text style={styles.navText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Weekday headers */}
      <View style={styles.weekHeader}>
        {WEEKDAYS.map((d, i) => (
          <Text key={d} style={[styles.weekDay, (i === 0 || i === 6) && styles.weekDayWeekend]}>
            {d}
          </Text>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.grid}>
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.weekRow}>
            {week.map((day, di) => {
              if (!day) return <View key={di} style={[styles.cell, styles.cellEmpty]} />;
              const dateStr = toStr(year, month, day);
              const dayEvents = eventMap[dateStr] ?? [];
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              const isWeekend = di === 0 || di === 6;

              return (
                <TouchableOpacity
                  key={di}
                  style={[
                    styles.cell,
                    isToday && styles.cellToday,
                    isSelected && styles.cellSelected,
                  ]}
                  onPress={() => setSelectedDate(dateStr === selectedDate ? null : dateStr)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.dayNum,
                    isWeekend && styles.dayNumWeekend,
                    isToday && styles.dayNumToday,
                    isSelected && styles.dayNumSelected,
                  ]}>
                    {day}
                  </Text>

                  {/* Event bars - show up to 2 */}
                  {dayEvents.slice(0, 2).map((ev, i) => (
                    <View key={i} style={[styles.eventBar, { backgroundColor: ev.color }]}>
                      <Text style={styles.eventBarText} numberOfLines={1}>{ev.label}</Text>
                    </View>
                  ))}

                  {/* Overflow indicator */}
                  {dayEvents.length > 2 && (
                    <Text style={styles.overflow}>+{dayEvents.length - 2}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* Selected date detail panel */}
      {selectedDate && (
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelDate}>{selectedDate}</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => setAddModal(true)}>
              <Text style={styles.addBtnText}>+ 新增行程</Text>
            </TouchableOpacity>
          </View>

          {selectedEvents.length === 0 ? (
            <Text style={styles.emptyText}>這天沒有行程</Text>
          ) : (
            selectedEvents.map((ev, i) => {
              const userEvent = selectedUserEvents.find(e => e.title === ev.label);
              return (
                <View key={i} style={[styles.detailRow, { borderLeftColor: ev.color }]}>
                  <View style={[styles.detailDot, { backgroundColor: ev.color }]} />
                  <Text style={styles.detailLabel}>{ev.label}</Text>
                  {ev.isUser && userEvent && (
                    <>
                      <Text style={styles.detailCreator}>
                        {userEvent.createdBy === myId ? '我' : (partner?.name ?? '對方')}
                      </Text>
                      <TouchableOpacity onPress={() => openEdit(userEvent)}>
                        <Text style={styles.detailAction}>✏️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setConfirmDelete(userEvent)}>
                        <Text style={styles.detailAction}>🗑️</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              );
            })
          )}
        </View>
      )}

      {/* Tomorrow only */}
      {!selectedDate && (() => {
        const tmrw = new Date(now); tmrw.setDate(now.getDate() + 1);
        const tomorrowStr = toStr(tmrw.getFullYear(), tmrw.getMonth() + 1, tmrw.getDate());
        const upcoming = [
          ...(eventMap[tomorrowStr] ?? []).map(e => ({ title: e.label, color: e.color, date: tomorrowStr })),
        ];
        if (!upcoming.length) return null;
        return (
          <View style={styles.upcomingCard}>
            <Text style={styles.upcomingTitle}>明天的行程</Text>
            {upcoming.map((e, i) => (
              <View key={i} style={styles.upcomingRow}>
                <View style={[styles.upcomingDot, { backgroundColor: e.color }]} />
                <Text style={styles.upcomingLabel}>{e.title}</Text>
              </View>
            ))}
          </View>
        );
      })()}

      {/* Add modal */}
      <Modal visible={addModal} transparent animationType="slide">
        <TouchableOpacity style={styles.overlay} onPress={() => setAddModal(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>新增行程</Text>
          <TextInput
            style={styles.sheetInput}
            placeholder="行程名稱"
            placeholderTextColor="#BBBBBB"
            value={newTitle}
            onChangeText={setNewTitle}
            autoFocus
          />
          <TextInput
            style={styles.sheetInput}
            placeholder="備註（可選）"
            placeholderTextColor="#BBBBBB"
            value={newDesc}
            onChangeText={setNewDesc}
          />
          <Text style={styles.catLabel}>類別</Text>
          <View style={styles.catRow}>
            {allCategories.map(c => (
              <TouchableOpacity
                key={c.key}
                style={[styles.catBtn, newCategory === c.key && { backgroundColor: c.color }]}
                onPress={() => setNewCategory(c.key)}
              >
                <Text style={styles.catEmoji}>{c.emoji}</Text>
                <Text style={[styles.catText, newCategory === c.key && styles.catTextActive]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.catAddBtn} onPress={() => setNewCatModal(true)}>
              <Text style={styles.catAddBtnText}>＋</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={[styles.sheetBtn, { backgroundColor: getColorForCategory(newCategory) }]} onPress={handleAdd}>
            <Text style={styles.sheetBtnText}>新增 ✓</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Edit modal */}
      <Modal visible={!!editTarget} transparent animationType="slide">
        <TouchableOpacity style={styles.overlay} onPress={() => setEditTarget(null)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>修改行程 ✏️</Text>
          <TextInput
            style={styles.sheetInput}
            placeholder="行程名稱"
            placeholderTextColor="#BBBBBB"
            value={editTitle}
            onChangeText={setEditTitle}
            autoFocus
          />
          <DatePickerButton value={editDate} onChange={setEditDate} label="日期" />
          <TextInput
            style={styles.sheetInput}
            placeholder="備註（可選）"
            placeholderTextColor="#BBBBBB"
            value={editDesc}
            onChangeText={setEditDesc}
          />
          <Text style={styles.catLabel}>類別</Text>
          <View style={styles.catRow}>
            {allCategories.map(c => (
              <TouchableOpacity
                key={c.key}
                style={[styles.catBtn, editCategory === c.key && { backgroundColor: c.color }]}
                onPress={() => setEditCategory(c.key)}
              >
                <Text style={styles.catEmoji}>{c.emoji}</Text>
                <Text style={[styles.catText, editCategory === c.key && styles.catTextActive]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.catAddBtn} onPress={() => setNewCatModal(true)}>
              <Text style={styles.catAddBtnText}>＋</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={[styles.sheetBtn, { backgroundColor: getColorForCategory(editCategory) }]} onPress={handleEdit}>
            <Text style={styles.sheetBtnText}>儲存 ✓</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* New custom category modal */}
      <Modal visible={newCatModal} transparent animationType="slide">
        <TouchableOpacity style={styles.overlay} onPress={() => setNewCatModal(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>新增自訂類別 🏷️</Text>
          <TextInput
            style={styles.sheetInput}
            placeholder="類別名稱（例如：健身、購物）"
            placeholderTextColor="#BBBBBB"
            value={newCatLabel}
            onChangeText={setNewCatLabel}
            autoFocus
          />
          <Text style={styles.catLabel}>選擇顏色</Text>
          <View style={styles.colorPalette}>
            {['#E74C3C','#E91E63','#9B59B6','#3498DB','#1ABC9C',
              '#2ECC71','#F39C12','#FF6B9D','#56CFE1','#C77DFF',
              '#FF9F43','#4A90D9'].map(color => (
              <TouchableOpacity
                key={color}
                style={[styles.colorSwatch, { backgroundColor: color }, newCatColor === color && styles.colorSwatchSelected]}
                onPress={() => setNewCatColor(color)}
              />
            ))}
          </View>
          {/* Preview */}
          <View style={[styles.catBtn, { backgroundColor: newCatColor, alignSelf: 'center', marginBottom: 16 }]}>
            <Text style={styles.catEmoji}>🏷️</Text>
            <Text style={[styles.catText, styles.catTextActive]}>{newCatLabel || '預覽'}</Text>
          </View>
          <TouchableOpacity style={[styles.sheetBtn, { backgroundColor: newCatColor }]} onPress={handleAddCustomCat}>
            <Text style={styles.sheetBtnText}>新增 ✓</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Delete confirm */}
      <Modal visible={!!confirmDelete} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>刪除行程</Text>
            <Text style={styles.confirmMsg}>確定刪除「{confirmDelete?.title}」？</Text>
            <View style={styles.confirmBtns}>
              <TouchableOpacity style={styles.confirmCancel} onPress={() => setConfirmDelete(null)}>
                <Text style={styles.confirmCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmDel} onPress={handleDelete}>
                <Text style={styles.confirmDelText}>刪除</Text>
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
  content: { paddingHorizontal: 16, paddingBottom: 50 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 16,
  },
  navBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF0F5', justifyContent: 'center', alignItems: 'center' },
  navText: { fontSize: 26, color: '#FF6B9D', lineHeight: 30 },
  yearText: { fontSize: 12, color: '#888', textAlign: 'center' },
  monthText: { fontSize: 26, fontWeight: '800', color: '#FF6B9D', textAlign: 'center' },
  weekHeader: { flexDirection: 'row', marginBottom: 4 },
  weekDay: { flex: 1, textAlign: 'center', fontSize: 12, color: '#888', fontWeight: '600', paddingBottom: 6 },
  weekDayWeekend: { color: '#FF6B9D' },
  grid: { marginBottom: 12 },
  weekRow: { flexDirection: 'row' },
  cell: {
    flex: 1,
    minHeight: CELL_H,
    paddingTop: 5,
    paddingHorizontal: 1,
    paddingBottom: 4,
    overflow: 'hidden',
  },
  cellEmpty: { backgroundColor: 'transparent' },
  cellToday: { backgroundColor: '#FFF0F5' },
  cellSelected: { backgroundColor: '#FFE0EE' },
  dayNum: { fontSize: 13, color: '#2D2D2D', fontWeight: '500', textAlign: 'center', marginBottom: 2 },
  dayNumWeekend: { color: '#FF8AB4' },
  dayNumToday: { color: '#FF6B9D', fontWeight: '900' },
  dayNumSelected: { color: '#FF4D88', fontWeight: '900' },
  eventBar: {
    borderRadius: 3,
    paddingHorizontal: 3,
    paddingVertical: 2,
    marginBottom: 2,
    minHeight: 16,
  },
  eventBarText: { fontSize: 9, color: '#fff', fontWeight: '700', lineHeight: 13 },
  overflow: { fontSize: 9, color: '#888', textAlign: 'right', paddingRight: 2 },
  panel: {
    backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 14,
    shadowColor: '#FF6B9D', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
  },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  panelDate: { fontSize: 15, fontWeight: '700', color: '#2D2D2D' },
  addBtn: { backgroundColor: '#FFF0F5', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnText: { color: '#FF6B9D', fontWeight: '600', fontSize: 13 },
  emptyText: { color: '#BBBBBB', fontSize: 13, textAlign: 'center', paddingVertical: 8 },
  detailRow: {
    flexDirection: 'row', alignItems: 'center',
    borderLeftWidth: 3, paddingLeft: 10, paddingVertical: 8, marginBottom: 6,
    backgroundColor: '#FAFAFA', borderRadius: 8,
  },
  detailDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  detailLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: '#2D2D2D' },
  detailDel: { fontSize: 18, paddingLeft: 10 },
  detailAction: { fontSize: 18, paddingLeft: 8 },
  detailCreator: { fontSize: 11, color: '#888', paddingHorizontal: 6, backgroundColor: '#F5F5F5', borderRadius: 6, overflow: 'hidden' },
  upcomingCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#FF6B9D', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
  },
  upcomingTitle: { fontSize: 14, fontWeight: '700', color: '#2D2D2D', marginBottom: 10 },
  upcomingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  upcomingDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  upcomingLabel: { fontSize: 14, fontWeight: '600', color: '#2D2D2D' },
  upcomingDate: { fontSize: 11, color: '#888' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: '#2D2D2D', marginBottom: 4 },
  sheetDate: { fontSize: 13, color: '#888', marginBottom: 14 },
  sheetInput: { backgroundColor: '#FFF5F7', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#2D2D2D', marginBottom: 12 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  toggleLabel: { fontSize: 15, color: '#2D2D2D' },
  toggle: { width: 46, height: 26, borderRadius: 13, backgroundColor: '#E0E0E0', padding: 2 },
  toggleOn: { backgroundColor: '#FF6B9D' },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
  toggleThumbOn: { transform: [{ translateX: 20 }] },
  sheetBtn: { backgroundColor: '#FF6B9D', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  sheetBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  confirmBox: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: 280 },
  confirmTitle: { fontSize: 16, fontWeight: '800', color: '#2D2D2D', marginBottom: 8 },
  confirmMsg: { fontSize: 14, color: '#555', marginBottom: 20 },
  confirmBtns: { flexDirection: 'row', gap: 10 },
  confirmCancel: { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  confirmCancelText: { fontSize: 14, fontWeight: '600', color: '#888' },
  confirmDel: { flex: 1, backgroundColor: '#FF4444', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  confirmDelText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  catLabel: { fontSize: 13, color: '#888', marginBottom: 8, marginTop: 4 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  catBtn: {
    alignItems: 'center', paddingVertical: 7, paddingHorizontal: 10,
    backgroundColor: '#F5F5F5', borderRadius: 10,
  },
  catEmoji: { fontSize: 16, marginBottom: 2 },
  catText: { fontSize: 10, color: '#888', fontWeight: '600' },
  catTextActive: { color: '#fff' },
  catAddBtn: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, paddingHorizontal: 10,
    backgroundColor: '#F0F0F0', borderRadius: 10,
    borderWidth: 1.5, borderColor: '#DDDDDD', borderStyle: 'dashed',
    minWidth: 40,
  },
  catAddBtnText: { fontSize: 18, color: '#888', fontWeight: '600' },
  colorPalette: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  colorSwatch: { width: 36, height: 36, borderRadius: 18 },
  colorSwatchSelected: { borderWidth: 3, borderColor: '#2D2D2D' },
});
