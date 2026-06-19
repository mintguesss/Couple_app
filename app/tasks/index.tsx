import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Modal, Alert, Switch, ScrollView,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useCouple } from '@/context/CoupleContext';
import {
  subscribeToTasks, addTask, toggleTask, deleteTask, Task,
  TASK_CATEGORIES,
} from '@/services/tasksService';

const ALL_KEY = 'all';

function getCategoryMeta(key?: string) {
  return TASK_CATEGORIES.find(c => c.key === key) ?? { key: 'other', label: '其他', emoji: '📌' };
}

export default function TasksScreen() {
  const { user, profile } = useAuth();
  const { partner, couple } = useCouple();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [assignedTo, setAssignedTo] = useState<'me' | 'partner' | 'both'>('both');
  const [newCategory, setNewCategory] = useState('other');
  const [showCompleted, setShowCompleted] = useState(false);
  const [filterCat, setFilterCat] = useState(ALL_KEY);

  const coupleId = profile?.coupleId ?? '';
  const myId = user?.uid ?? '';
  const partnerId = couple?.members.find((id) => id !== myId) ?? '';

  useEffect(() => {
    if (!coupleId) return;
    return subscribeToTasks(coupleId, setTasks);
  }, [coupleId]);

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    const to = assignedTo === 'me' ? myId : assignedTo === 'partner' ? partnerId : 'both';
    await addTask(coupleId, myId, newTitle.trim(), to, undefined, newCategory);
    setNewTitle('');
    setModalVisible(false);
  };

  const getAssigneeLabel = (t: Task) => {
    if (t.assignedTo === 'both') return '一起 👫';
    if (t.assignedTo === myId) return '我負責';
    return `${partner?.name ?? '對方'}負責`;
  };

  // Filter
  const filtered = tasks.filter(t => {
    const catMatch = filterCat === ALL_KEY || (t.category ?? 'other') === filterCat;
    const completedMatch = showCompleted || !t.completed;
    return catMatch && completedMatch;
  });
  const pending = filtered.filter(t => !t.completed);
  const completed = filtered.filter(t => t.completed);
  const display = showCompleted ? [...pending, ...completed] : pending;

  // Category counts
  const catCounts = TASK_CATEGORIES.reduce((acc, c) => {
    acc[c.key] = tasks.filter(t => !t.completed && (t.category ?? 'other') === c.key).length;
    return acc;
  }, {} as Record<string, number>);

  const renderTask = ({ item }: { item: Task }) => {
    const cat = getCategoryMeta(item.category);
    return (
      <View style={[styles.taskItem, item.completed && styles.taskItemDone]}>
        <TouchableOpacity
          style={[styles.checkbox, item.completed && styles.checkboxChecked]}
          onPress={() => toggleTask(coupleId, item.id, !item.completed)}
        >
          {item.completed && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>
        <View style={styles.taskInfo}>
          <View style={styles.taskTop}>
            <Text style={[styles.taskTitle, item.completed && styles.taskTitleDone]}>{item.title}</Text>
            <View style={[styles.catChip, { backgroundColor: item.completed ? '#F5F5F5' : '#FFF5F7' }]}>
              <Text style={styles.catChipText}>{cat.emoji} {cat.label}</Text>
            </View>
          </View>
          <Text style={styles.taskAssignee}>{getAssigneeLabel(item)}</Text>
        </View>
        <TouchableOpacity
          onPress={() => Alert.alert('刪除任務', `確定刪除「${item.title}」？`, [
            { text: '取消', style: 'cancel' },
            { text: '刪除', style: 'destructive', onPress: () => deleteTask(coupleId, item.id) },
          ])}
        >
          <Text style={styles.deleteBtn}>×</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{tasks.filter(t => !t.completed).length}</Text>
          <Text style={styles.statLabel}>待完成</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{tasks.filter(t => t.completed).length}</Text>
          <Text style={styles.statLabel}>已完成</Text>
        </View>
      </View>

      {/* Category filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        <TouchableOpacity
          style={[styles.filterChip, filterCat === ALL_KEY && styles.filterChipActive]}
          onPress={() => setFilterCat(ALL_KEY)}
        >
          <Text style={[styles.filterChipText, filterCat === ALL_KEY && styles.filterChipTextActive]}>
            📋 全部
          </Text>
        </TouchableOpacity>
        {TASK_CATEGORIES.map(c => (
          <TouchableOpacity
            key={c.key}
            style={[styles.filterChip, filterCat === c.key && styles.filterChipActive]}
            onPress={() => setFilterCat(c.key)}
          >
            <Text style={[styles.filterChipText, filterCat === c.key && styles.filterChipTextActive]}>
              {c.emoji} {c.label}
              {catCounts[c.key] > 0 ? ` (${catCounts[c.key]})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.addBtn} onPress={() => { setNewTitle(''); setNewCategory('other'); setModalVisible(true); }}>
          <Text style={styles.addBtnText}>+ 新增任務</Text>
        </TouchableOpacity>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>已完成</Text>
          <Switch value={showCompleted} onValueChange={setShowCompleted} trackColor={{ true: '#FF6B9D' }} thumbColor={showCompleted ? '#fff' : '#f4f3f4'} />
        </View>
      </View>

      {/* Task list */}
      <FlatList
        data={display}
        keyExtractor={(item) => item.id}
        renderItem={renderTask}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>✅</Text>
            <Text style={styles.emptyTitle}>
              {filterCat === ALL_KEY ? '沒有待辦任務' : `沒有「${getCategoryMeta(filterCat).label}」類任務`}
            </Text>
            <Text style={styles.emptyDesc}>新增一個吧！</Text>
          </View>
        }
      />

      {/* Add modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setModalVisible(false)} />
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>新增任務</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="任務內容"
            placeholderTextColor="#BBBBBB"
            value={newTitle}
            onChangeText={setNewTitle}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleAdd}
          />

          {/* Category selector */}
          <Text style={styles.selectorLabel}>分類</Text>
          <View style={styles.catRow}>
            {TASK_CATEGORIES.map(c => (
              <TouchableOpacity
                key={c.key}
                style={[styles.catBtn, newCategory === c.key && styles.catBtnActive]}
                onPress={() => setNewCategory(c.key)}
              >
                <Text style={styles.catBtnEmoji}>{c.emoji}</Text>
                <Text style={[styles.catBtnText, newCategory === c.key && styles.catBtnTextActive]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Assignee selector */}
          <Text style={styles.selectorLabel}>指派給</Text>
          <View style={styles.assignRow}>
            {[
              { key: 'both', label: '一起 👫' },
              { key: 'me', label: '我 🙋' },
              { key: 'partner', label: `${partner?.name ?? '對方'} 💁` },
            ].map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.assignBtn, assignedTo === opt.key && styles.assignBtnActive]}
                onPress={() => setAssignedTo(opt.key as any)}
              >
                <Text style={[styles.assignBtnText, assignedTo === opt.key && styles.assignBtnTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.modalBtn} onPress={handleAdd}>
            <Text style={styles.modalBtnText}>新增 ✓</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF5F7' },
  statsBar: { backgroundColor: '#FF6B9D', flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 20 },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 26, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 12, color: '#FFD6E7', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: '#FFB3CC', marginVertical: 4 },
  filterRow: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0E0E5', maxHeight: 52 },
  filterContent: { paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F5F5F5' },
  filterChipActive: { backgroundColor: '#FF6B9D' },
  filterChipText: { fontSize: 13, fontWeight: '600', color: '#555', whiteSpace: 'nowrap' as any },
  filterChipTextActive: { color: '#fff' },
  controls: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F0E0E5',
  },
  addBtn: { backgroundColor: '#FF6B9D', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleLabel: { fontSize: 13, color: '#888' },
  list: { padding: 14, paddingBottom: 40 },
  taskItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  taskItemDone: { opacity: 0.55 },
  checkbox: {
    width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: '#FF6B9D',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  checkboxChecked: { backgroundColor: '#FF6B9D', borderColor: '#FF6B9D' },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  taskInfo: { flex: 1 },
  taskTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' },
  taskTitle: { fontSize: 15, fontWeight: '600', color: '#2D2D2D' },
  taskTitleDone: { textDecorationLine: 'line-through', color: '#BBBBBB' },
  catChip: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  catChipText: { fontSize: 11, color: '#888', fontWeight: '600' },
  taskAssignee: { fontSize: 12, color: '#888' },
  deleteBtn: { fontSize: 22, color: '#BBBBBB', paddingLeft: 10 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 52, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#2D2D2D', marginBottom: 6 },
  emptyDesc: { fontSize: 14, color: '#888' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#2D2D2D', marginBottom: 14 },
  modalInput: {
    backgroundColor: '#FFF5F7', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 15, color: '#2D2D2D', marginBottom: 16,
  },
  selectorLabel: { fontSize: 13, color: '#888', marginBottom: 8 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  catBtn: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, backgroundColor: '#F5F5F5', borderRadius: 12 },
  catBtnActive: { backgroundColor: '#FFF0F5', borderWidth: 1.5, borderColor: '#FF6B9D' },
  catBtnEmoji: { fontSize: 20, marginBottom: 2 },
  catBtnText: { fontSize: 11, color: '#888', fontWeight: '600' },
  catBtnTextActive: { color: '#FF6B9D' },
  assignRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  assignBtn: { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  assignBtnActive: { backgroundColor: '#FFF0F5', borderWidth: 1.5, borderColor: '#FF6B9D' },
  assignBtnText: { fontSize: 12, color: '#888', fontWeight: '600' },
  assignBtnTextActive: { color: '#FF6B9D' },
  modalBtn: { backgroundColor: '#FF6B9D', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  modalBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
