import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

// 復盤控制列：可往前/後一手、跳到開頭/結尾、離開復盤
export function ReviewBar({
  index, total, onSet, onExit,
}: {
  index: number;          // 目前顯示第幾手（0 = 開局空盤）
  total: number;          // 總手數
  onSet: (i: number) => void;
  onExit: () => void;
}) {
  const go = (i: number) => onSet(Math.max(0, Math.min(total, i)));
  return (
    <View style={styles.bar}>
      <TouchableOpacity style={styles.btn} onPress={() => go(0)} disabled={index <= 0}>
        <Text style={[styles.btnText, index <= 0 && styles.dim]}>⏮</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btn} onPress={() => go(index - 1)} disabled={index <= 0}>
        <Text style={[styles.btnText, index <= 0 && styles.dim]}>◀</Text>
      </TouchableOpacity>
      <Text style={styles.count}>第 {index} / {total} 手</Text>
      <TouchableOpacity style={styles.btn} onPress={() => go(index + 1)} disabled={index >= total}>
        <Text style={[styles.btnText, index >= total && styles.dim]}>▶</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btn} onPress={() => go(total)} disabled={index >= total}>
        <Text style={[styles.btnText, index >= total && styles.dim]}>⏭</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.exit} onPress={onExit}>
        <Text style={styles.exitText}>離開</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#fff', borderRadius: 14, paddingVertical: 8, paddingHorizontal: 10,
    marginBottom: 10, alignSelf: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  btn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  btnText: { fontSize: 14, color: '#2D2D2D', fontWeight: '700' },
  dim: { opacity: 0.3 },
  count: { fontSize: 12, color: '#555', fontWeight: '700', minWidth: 78, textAlign: 'center' },
  exit: { marginLeft: 4, backgroundColor: '#FF6B9D', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  exitText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
