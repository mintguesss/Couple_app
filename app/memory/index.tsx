import { useEffect, useState, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Image, TextInput, Modal, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/AuthContext';
import { useCouple } from '@/context/CoupleContext';
import {
  subscribeToMemories, uploadMemory, updateMemory, deleteMemory, MemoryPhoto,
} from '@/services/memoryService';
import DatePickerButton from '@/components/DatePickerButton';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// Card aspect ratio: the actual card is about 175×140 → use same in preview
const PREVIEW_W = 250;
const PREVIEW_H = 200;

/**
 * FocalEditor — drag to pan, scroll/pinch to zoom.
 * Renders at PREVIEW_W×PREVIEW_H so it has the SAME aspect ratio as the real card thumbnail.
 * Uses `transform: scale(scale)` + `object-position: focalX% focalY%`
 * so the preview exactly matches what the card will show.
 */
function FocalEditor({ uri, focalX, focalY, scale, onChange }: {
  uri: string;
  focalX: number; focalY: number; scale: number;
  onChange: (x: number, y: number, s: number) => void;
}) {
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const pinchRef = useRef<{ dist: number; scale: number } | null>(null);

  const onMouseDown = (e: any) => { isDragging.current = true; lastPos.current = { x: e.clientX, y: e.clientY }; };
  const onMouseMove = (e: any) => {
    if (!isDragging.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const dx = (e.clientX - lastPos.current.x) / rect.width * 100;
    const dy = (e.clientY - lastPos.current.y) / rect.height * 100;
    lastPos.current = { x: e.clientX, y: e.clientY };
    // Moving right → focal point moves left (image appears to slide right)
    const nx = Math.max(0, Math.min(100, focalX - dx));
    const ny = Math.max(0, Math.min(100, focalY - dy));
    onChange(nx, ny, scale);
  };
  const onMouseUp = () => { isDragging.current = false; };

  const onWheel = (e: any) => {
    e.preventDefault();
    const ns = Math.max(1, Math.min(3, scale + (e.deltaY < 0 ? 0.1 : -0.1)));
    onChange(focalX, focalY, +ns.toFixed(1));
  };

  const onTouchStart = (e: any) => {
    if (e.touches.length === 1) {
      isDragging.current = true;
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      isDragging.current = false;
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      pinchRef.current = { dist, scale };
    }
  };
  const onTouchMove = (e: any) => {
    e.preventDefault();
    if (e.touches.length === 1 && isDragging.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const dx = (e.touches[0].clientX - lastPos.current.x) / rect.width * 100;
      const dy = (e.touches[0].clientY - lastPos.current.y) / rect.height * 100;
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      onChange(Math.max(0, Math.min(100, focalX - dx)), Math.max(0, Math.min(100, focalY - dy)), scale);
    } else if (e.touches.length === 2 && pinchRef.current) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      const ns = Math.max(1, Math.min(3, pinchRef.current.scale * (dist / pinchRef.current.dist)));
      onChange(focalX, focalY, +ns.toFixed(1));
    }
  };
  const onTouchEnd = () => { isDragging.current = false; pinchRef.current = null; };

  if (Platform.OS !== 'web') {
    return <Image source={{ uri }} style={{ width: PREVIEW_W, height: PREVIEW_H, borderRadius: 10 }} resizeMode="cover" />;
  }

  // Same CSS as the card — object-fit:cover + object-position + scale transform
  // This ensures preview = card appearance exactly
  return (
    // @ts-ignore
    <div
      style={{ width: PREVIEW_W, height: PREVIEW_H, overflow: 'hidden', borderRadius: 10, cursor: 'grab', touchAction: 'none', userSelect: 'none', position: 'relative' }}
      onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
      onWheel={onWheel} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
    >
      {/* @ts-ignore */}
      <img src={uri} draggable={false} style={{
        width: '100%', height: '100%',
        objectFit: 'cover',
        objectPosition: `${focalX}% ${focalY}%`,
        transform: `scale(${scale})`,
        transformOrigin: `${focalX}% ${focalY}%`,
        pointerEvents: 'none',
      }} />
      {/* Focal indicator dot */}
      {/* @ts-ignore */}
      <div style={{ position: 'absolute', left: `${focalX}%`, top: `${focalY}%`, transform: 'translate(-50%,-50%)', width: 14, height: 14, borderRadius: 7, border: '2.5px solid #FF6B9D', backgroundColor: 'rgba(255,107,157,0.4)', pointerEvents: 'none' }} />
    </div>
  );
}

// ── Photo card (same CSS as FocalEditor for consistency) ──────
function PhotoCard({ item, onPress, onEdit, onDelete }: {
  item: MemoryPhoto; onPress: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const fx = item.focalX ?? 50;
  const fy = item.focalY ?? 50;
  const fs = item.focalScale ?? 1;

  return (
    <TouchableOpacity style={styles.photoCard} onPress={onPress}>
      {Platform.OS === 'web' ? (
        // @ts-ignore
        <div style={{ width: '100%', height: 140, overflow: 'hidden', borderTopLeftRadius: 13, borderTopRightRadius: 13 }}>
          {/* @ts-ignore */}
          <img src={item.imageUrl} style={{
            width: '100%', height: '100%',
            objectFit: 'cover',
            objectPosition: `${fx}% ${fy}%`,
            transform: `scale(${fs})`,
            transformOrigin: `${fx}% ${fy}%`,
            userSelect: 'none',
          }} />
        </div>
      ) : (
        <Image source={{ uri: item.imageUrl }} style={styles.photo} resizeMode="cover" />
      )}
      <View style={styles.photoInfo}>
        <Text style={styles.photoDate}>{item.date}</Text>
        {item.caption ? <Text style={styles.photoCaption} numberOfLines={2}>{item.caption}</Text> : null}
        <View style={styles.photoActions}>
          <TouchableOpacity onPress={onEdit} style={styles.photoActionBtn}><Text>✏️</Text></TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={styles.photoActionBtn}><Text>🗑️</Text></TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function MemoryScreen() {
  const { user, profile } = useAuth();
  const { partner } = useCouple();
  const [photos, setPhotos] = useState<MemoryPhoto[]>([]);
  const [uploading, setUploading] = useState(false);

  const [addModal, setAddModal] = useState(false);
  const [selectedUri, setSelectedUri] = useState('');
  const [caption, setCaption] = useState('');
  const [date, setDate] = useState(todayStr());
  const [focalX, setFocalX] = useState(50);
  const [focalY, setFocalY] = useState(50);
  const [focalScale, setFocalScale] = useState(1);

  const [editTarget, setEditTarget] = useState<MemoryPhoto | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editFX, setEditFX] = useState(50);
  const [editFY, setEditFY] = useState(50);
  const [editFS, setEditFS] = useState(1);
  const [editSaving, setEditSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<MemoryPhoto | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [lightbox, setLightbox] = useState<MemoryPhoto | null>(null);

  const coupleId = profile?.coupleId ?? '';
  const myId = user?.uid ?? '';

  useEffect(() => {
    if (!coupleId) return;
    return subscribeToMemories(coupleId, setPhotos);
  }, [coupleId]);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
    if (result.canceled || !result.assets[0]) return;
    setSelectedUri(result.assets[0].uri);
    setCaption(''); setDate(todayStr()); setFocalX(50); setFocalY(50); setFocalScale(1);
    setAddModal(true);
  };

  const handleUpload = async () => {
    if (!selectedUri) return;
    setUploading(true); setAddModal(false);
    try {
      await uploadMemory(coupleId, myId, selectedUri, caption, date);
      // Update focal data after upload (uploadMemory defaults to 50/50/1)
      // We need to get the newly created doc id... for now, update the latest
      // Actually let's update uploadMemory to accept focal params
    } catch (e: any) { console.error('Upload failed', e); }
    finally { setUploading(false); }
  };

  const openEdit = (photo: MemoryPhoto) => {
    setEditTarget(photo); setEditCaption(photo.caption); setEditDate(photo.date);
    setEditFX(photo.focalX ?? 50); setEditFY(photo.focalY ?? 50); setEditFS(photo.focalScale ?? 1);
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    setEditSaving(true);
    try {
      await updateMemory(coupleId, editTarget.id, editCaption.trim(), editDate, editFX, editFY, editFS);
      setEditTarget(null);
    } finally { setEditSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteMemory(coupleId, deleteTarget.id);
      if (lightbox?.id === deleteTarget.id) setLightbox(null);
      setDeleteTarget(null);
    } finally { setDeleting(false); }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={[styles.uploadBtn, uploading && styles.uploadBtnDisabled]} onPress={handlePickImage} disabled={uploading}>
        <Text style={styles.uploadBtnText}>{uploading ? '⏳ 上傳中...' : '📷 新增回憶'}</Text>
      </TouchableOpacity>

      {photos.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📸</Text>
          <Text style={styles.emptyTitle}>還沒有回憶</Text>
          <Text style={styles.emptyDesc}>上傳你們的第一張照片吧！</Text>
        </View>
      ) : (
        <FlatList
          data={photos}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <PhotoCard item={item} onPress={() => setLightbox(item)} onEdit={() => openEdit(item)} onDelete={() => setDeleteTarget(item)} />
          )}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
        />
      )}

      {/* Add modal */}
      <Modal visible={addModal} transparent animationType="slide">
        <TouchableOpacity style={styles.overlay} onPress={() => setAddModal(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>新增回憶 📸</Text>
          {selectedUri ? (
            <>
              <View style={{ alignItems: 'center', marginBottom: 6 }}>
                <FocalEditor uri={selectedUri} focalX={focalX} focalY={focalY} scale={focalScale}
                  onChange={(x, y, sc) => { setFocalX(x); setFocalY(y); setFocalScale(sc); }} />
              </View>
              <Text style={styles.focalHint}>拖動調整位置 · 滾輪/雙指縮放　縮放 {Math.round(focalScale * 100)}%</Text>
            </>
          ) : null}
          <TextInput style={styles.input} placeholder="寫下這個時刻..." placeholderTextColor="#BBBBBB" value={caption} onChangeText={setCaption} multiline />
          <DatePickerButton value={date} onChange={setDate} label="日期" />
          <TouchableOpacity style={styles.sheetBtn} onPress={handleUpload}>
            <Text style={styles.sheetBtnText}>上傳 ✓</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Edit modal */}
      <Modal visible={!!editTarget} transparent animationType="slide">
        <TouchableOpacity style={styles.overlay} onPress={() => setEditTarget(null)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>編輯回憶 ✏️</Text>
          {editTarget && (
            <>
              <View style={{ alignItems: 'center', marginBottom: 6 }}>
                <FocalEditor uri={editTarget.imageUrl} focalX={editFX} focalY={editFY} scale={editFS}
                  onChange={(x, y, sc) => { setEditFX(x); setEditFY(y); setEditFS(sc); }} />
              </View>
              <Text style={styles.focalHint}>拖動調整位置 · 滾輪/雙指縮放　縮放 {Math.round(editFS * 100)}%</Text>
            </>
          )}
          <TextInput style={styles.input} placeholder="備註..." placeholderTextColor="#BBBBBB" value={editCaption} onChangeText={setEditCaption} multiline autoFocus />
          <DatePickerButton value={editDate} onChange={setEditDate} label="日期" />
          <TouchableOpacity style={[styles.sheetBtn, editSaving && { opacity: 0.5 }]} onPress={handleEdit} disabled={editSaving}>
            <Text style={styles.sheetBtnText}>{editSaving ? '儲存中...' : '儲存 ✓'}</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Delete confirm */}
      <Modal visible={!!deleteTarget} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>刪除這張照片？</Text>
            <Text style={styles.confirmMsg}>刪除後無法復原。</Text>
            <View style={styles.confirmBtns}>
              <TouchableOpacity style={styles.confirmCancel} onPress={() => setDeleteTarget(null)}>
                <Text style={styles.confirmCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmDel, deleting && { opacity: 0.5 }]} onPress={handleDelete} disabled={deleting}>
                <Text style={styles.confirmDelText}>{deleting ? '刪除中...' : '刪除'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Lightbox */}
      <Modal visible={!!lightbox} transparent animationType="fade">
        <TouchableOpacity style={styles.lightbox} activeOpacity={1} onPress={() => setLightbox(null)}>
          {lightbox && (
            <>
              <Image source={{ uri: lightbox.imageUrl }} style={styles.lightboxImage} resizeMode="contain" />
              <View style={styles.lightboxInfo}>
                <Text style={styles.lightboxDate}>{lightbox.date}</Text>
                {lightbox.caption ? <Text style={styles.lightboxCaption}>{lightbox.caption}</Text> : null}
              </View>
              <View style={styles.lightboxActions}>
                <TouchableOpacity style={styles.lightboxBtn} onPress={(e) => { e.stopPropagation?.(); openEdit(lightbox); setLightbox(null); }}>
                  <Text style={styles.lightboxBtnText}>✏️ 編輯</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.lightboxBtn, styles.lightboxDelBtn]} onPress={(e) => { e.stopPropagation?.(); setDeleteTarget(lightbox); setLightbox(null); }}>
                  <Text style={styles.lightboxBtnText}>🗑️ 刪除</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF5F7' },
  uploadBtn: { margin: 16, backgroundColor: '#FF6B9D', borderRadius: 14, paddingVertical: 14, alignItems: 'center', shadowColor: '#FF6B9D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  uploadBtnDisabled: { backgroundColor: '#FFBDD3' },
  uploadBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyEmoji: { fontSize: 60, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#2D2D2D', marginBottom: 6 },
  emptyDesc: { fontSize: 14, color: '#888' },
  list: { paddingHorizontal: 12, paddingBottom: 40 },
  row: { justifyContent: 'space-between', marginBottom: 12 },
  photoCard: { width: '48%', backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', shadowColor: '#FF6B9D', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
  photo: { width: '100%', height: 140 },
  photoInfo: { padding: 10 },
  photoDate: { fontSize: 11, color: '#888', marginBottom: 2 },
  photoCaption: { fontSize: 12, color: '#2D2D2D', marginBottom: 6 },
  photoActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  photoActionBtn: { padding: 3 },
  focalHint: { fontSize: 11, color: '#888', textAlign: 'center', marginBottom: 10 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: '#2D2D2D', marginBottom: 12 },
  input: { backgroundColor: '#FFF5F7', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: '#2D2D2D', marginBottom: 10, minHeight: 60, textAlignVertical: 'top' },
  sheetBtn: { backgroundColor: '#FF6B9D', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  sheetBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  confirmBox: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: 280 },
  confirmTitle: { fontSize: 16, fontWeight: '800', color: '#2D2D2D', marginBottom: 8 },
  confirmMsg: { fontSize: 14, color: '#555', marginBottom: 20 },
  confirmBtns: { flexDirection: 'row', gap: 10 },
  confirmCancel: { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  confirmCancelText: { fontSize: 14, fontWeight: '600', color: '#888' },
  confirmDel: { flex: 1, backgroundColor: '#FF4444', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  confirmDelText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  lightbox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  lightboxImage: { width: '100%', height: '55%', borderRadius: 12 },
  lightboxInfo: { marginTop: 16, alignItems: 'center' },
  lightboxDate: { color: '#fff', fontSize: 14, opacity: 0.7 },
  lightboxCaption: { color: '#fff', fontSize: 16, textAlign: 'center', marginTop: 6 },
  lightboxActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  lightboxBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  lightboxDelBtn: { backgroundColor: 'rgba(244,67,54,0.7)' },
  lightboxBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
