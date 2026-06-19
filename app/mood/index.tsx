import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useCouple } from '@/context/CoupleContext';
import {
  subscribeToMoods, addMoodEntry, updateMoodEntry,
  deleteMoodEntry, MoodEntry, MOOD_OPTIONS,
} from '@/services/moodService';

function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60000) return '剛剛';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分鐘前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小時前`;
  const d = date;
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

export default function MoodScreen() {
  const { user, profile } = useAuth();
  const { partner } = useCouple();
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editTarget, setEditTarget] = useState<MoodEntry | null>(null);
  const [editMood, setEditMood] = useState<number>(3);
  const [editNote, setEditNote] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<MoodEntry | null>(null);

  const coupleId = profile?.coupleId ?? '';
  const myId = user?.uid ?? '';

  useEffect(() => {
    if (!coupleId) return;
    return subscribeToMoods(coupleId, setEntries, 50);
  }, [coupleId]);

  const handleSave = async () => {
    if (!selectedMood) return;
    setSaving(true);
    try {
      await addMoodEntry(coupleId, myId, selectedMood, note.trim());
      setSelectedMood(null);
      setNote('');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (entry: MoodEntry) => {
    setEditTarget(entry);
    setEditMood(entry.mood);
    setEditNote(entry.note);
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    setEditSaving(true);
    try {
      await updateMoodEntry(coupleId, editTarget.id, editMood, editNote.trim());
      setEditTarget(null);
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteMoodEntry(coupleId, deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Record new mood */}
      <View style={styles.recordCard}>
        <Text style={styles.cardTitle}>今天感覺怎麼樣？</Text>
        <View style={styles.moodRow}>
          {MOOD_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.moodBtn, selectedMood === opt.value && styles.moodBtnSelected]}
              onPress={() => setSelectedMood(opt.value)}
            >
              <Text style={styles.moodBtnEmoji}>{opt.emoji}</Text>
              <Text style={[styles.moodBtnLabel, selectedMood === opt.value && styles.moodBtnLabelActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={styles.noteInput}
          placeholder="寫下今天的心情或想說的話..."
          placeholderTextColor="#BBBBBB"
          value={note}
          onChangeText={setNote}
          multiline
          numberOfLines={3}
        />
        <TouchableOpacity
          style={[styles.saveBtn, (!selectedMood || saving) && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!selectedMood || saving}
        >
          <Text style={styles.saveBtnText}>{saving ? '儲存中...' : '記錄心情 ✓'}</Text>
        </TouchableOpacity>
      </View>

      {/* History */}
      <Text style={styles.historyTitle}>所有心情紀錄 ({entries.length})</Text>

      {entries.length === 0 ? (
        <Text style={styles.emptyText}>還沒有心情記錄</Text>
      ) : (
        entries.map((entry) => {
          const isMe = entry.userId === myId;
          return (
            <View key={entry.id} style={[styles.entryCard, isMe && styles.entryCardMe]}>
              <View style={styles.entryTop}>
                <Text style={styles.entryEmoji}>{entry.emoji}</Text>
                <View style={styles.entryMeta}>
                  <Text style={styles.entryName}>{isMe ? '我' : (partner?.name ?? '對方')}</Text>
                  <Text style={styles.entryTime}>{formatDate(entry.createdAt)}</Text>
                </View>
                {isMe && (
                  <View style={styles.entryActions}>
                    <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(entry)}>
                      <Text style={styles.editBtnText}>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.delBtn} onPress={() => setDeleteTarget(entry)}>
                      <Text style={styles.delBtnText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              {entry.note ? <Text style={styles.entryNote}>{entry.note}</Text> : null}
            </View>
          );
        })
      )}

      {/* Edit modal */}
      <Modal visible={!!editTarget} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setEditTarget(null)} />
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>修改心情紀錄</Text>
          <View style={styles.moodRow}>
            {MOOD_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.moodBtn, editMood === opt.value && styles.moodBtnSelected]}
                onPress={() => setEditMood(opt.value)}
              >
                <Text style={styles.moodBtnEmoji}>{opt.emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.noteInput}
            value={editNote}
            onChangeText={setEditNote}
            placeholder="想說的話..."
            placeholderTextColor="#BBBBBB"
            multiline
          />
          <TouchableOpacity style={styles.saveBtn} onPress={handleEdit} disabled={editSaving}>
            <Text style={styles.saveBtnText}>{editSaving ? '儲存中...' : '儲存修改 ✓'}</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Delete confirm modal */}
      <Modal visible={!!deleteTarget} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>刪除心情紀錄</Text>
            <Text style={styles.confirmMsg}>確定要刪除這則紀錄嗎？</Text>
            <View style={styles.confirmBtns}>
              <TouchableOpacity style={styles.confirmCancel} onPress={() => setDeleteTarget(null)}>
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
  content: { padding: 20, paddingBottom: 50 },
  recordCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 24,
    shadowColor: '#FF6B9D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 4,
  },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#2D2D2D', marginBottom: 14, textAlign: 'center' },
  moodRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 14 },
  moodBtn: { alignItems: 'center', padding: 8, borderRadius: 12 },
  moodBtnSelected: { backgroundColor: '#FFF0F5' },
  moodBtnEmoji: { fontSize: 30, marginBottom: 4 },
  moodBtnLabel: { fontSize: 10, color: '#888' },
  moodBtnLabelActive: { color: '#FF6B9D', fontWeight: '700' },
  noteInput: {
    backgroundColor: '#FFF5F7', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: '#2D2D2D', marginBottom: 12, minHeight: 70, textAlignVertical: 'top',
  },
  saveBtn: { backgroundColor: '#FF6B9D', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  saveBtnDisabled: { backgroundColor: '#FFBDD3' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  historyTitle: { fontSize: 15, fontWeight: '700', color: '#2D2D2D', marginBottom: 12 },
  emptyText: { color: '#BBBBBB', textAlign: 'center', marginTop: 20, fontSize: 14 },
  entryCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  entryCardMe: { borderLeftWidth: 3, borderLeftColor: '#FF6B9D' },
  entryTop: { flexDirection: 'row', alignItems: 'center' },
  entryEmoji: { fontSize: 28, marginRight: 10 },
  entryMeta: { flex: 1 },
  entryName: { fontSize: 13, fontWeight: '700', color: '#2D2D2D' },
  entryTime: { fontSize: 11, color: '#BBBBBB' },
  entryActions: { flexDirection: 'row', gap: 4 },
  editBtn: { padding: 6 },
  editBtnText: { fontSize: 16 },
  delBtn: { padding: 6 },
  delBtnText: { fontSize: 16 },
  entryNote: { fontSize: 14, color: '#555', lineHeight: 20, marginTop: 6, marginLeft: 38 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#2D2D2D', marginBottom: 14 },
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  confirmBox: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: 280 },
  confirmTitle: { fontSize: 16, fontWeight: '800', color: '#2D2D2D', marginBottom: 8 },
  confirmMsg: { fontSize: 14, color: '#555', marginBottom: 20 },
  confirmBtns: { flexDirection: 'row', gap: 10 },
  confirmCancel: { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  confirmCancelText: { fontSize: 14, fontWeight: '600', color: '#888' },
  confirmDel: { flex: 1, backgroundColor: '#FF4444', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  confirmDelText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
