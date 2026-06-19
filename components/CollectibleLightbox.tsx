import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CollectibleItem } from '@/services/collectionService';
import { CollectibleModel } from './CollectibleModel';

// 點開已收集的圖鑑，放大成一個可自由旋轉、縮放的 3D 檢視
export function CollectibleLightbox({
  item,
  onClose,
}: {
  item: CollectibleItem | null;
  onClose: () => void;
}) {
  return (
    <Modal visible={!!item} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {/* 點背景關閉 */}
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        {item && (
          <View style={styles.sheet}>
            <Text style={styles.name}>{item.name}</Text>
            <View style={styles.stage}>
              {item.model ? (
                <CollectibleModel src={item.model} locked={false} style={styles.model} />
              ) : (
                <Text style={styles.bigEmoji}>{item.emoji}</Text>
              )}
            </View>
            <Text style={styles.hint}>拖曳可旋轉 · 滾輪縮放</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeText}>關閉</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  sheet: {
    backgroundColor: '#fff', borderRadius: 24, padding: 20,
    width: '100%', maxWidth: 420, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 8,
  },
  name: { fontSize: 18, fontWeight: '800', color: '#2D2D2D', marginBottom: 12 },
  stage: { width: '100%', height: 340, backgroundColor: '#FAFAFA', borderRadius: 16, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  model: { width: '100%', height: '100%' },
  bigEmoji: { fontSize: 140 },
  hint: { fontSize: 12, color: '#BBBBBB', marginTop: 10 },
  closeBtn: { marginTop: 14, backgroundColor: '#FF6B9D', borderRadius: 24, paddingVertical: 10, paddingHorizontal: 36 },
  closeText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
