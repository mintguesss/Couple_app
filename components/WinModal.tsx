import { useEffect, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';

interface Props {
  visible: boolean;
  isMyWin: boolean;
  winnerName: string;
  reason: string;
  onNewGame: () => void;
  onReview?: () => void;
}

export default function WinModal({ visible, isMyWin, winnerName, reason, onNewGame, onReview }: Props) {
  const scale = useRef(new Animated.Value(0)).current;
  const star1 = useRef(new Animated.Value(0)).current;
  const star2 = useRef(new Animated.Value(0)).current;
  const star3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    scale.setValue(0);
    // Main card springs in
    Animated.spring(scale, {
      toValue: 1, friction: 5, tension: 100, useNativeDriver: true,
    }).start();
    // Stars loop
    const starAnim = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(val, { toValue: 0.3, duration: 500, useNativeDriver: true }),
        ])
      );
    starAnim(star1, 0).start();
    starAnim(star2, 200).start();
    starAnim(star3, 400).start();
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
          {/* Twinkling stars */}
          <Animated.Text style={[styles.star, styles.star1, { opacity: star1 }]}>✨</Animated.Text>
          <Animated.Text style={[styles.star, styles.star2, { opacity: star2 }]}>⭐</Animated.Text>
          <Animated.Text style={[styles.star, styles.star3, { opacity: star3 }]}>✨</Animated.Text>

          <Text style={styles.trophy}>{isMyWin ? '🏆' : '🎖️'}</Text>
          <Text style={styles.title}>{isMyWin ? '你獲勝了！🎉' : `${winnerName} 獲勝！`}</Text>
          <Text style={styles.reason}>{reason}</Text>

          <View style={styles.btnRow}>
            {onReview && (
              <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={onReview}>
                <Text style={[styles.btnText, styles.btnGhostText]}>🔍 復盤</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.btn} onPress={onNewGame}>
              <Text style={styles.btnText}>開新局</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center', alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff', borderRadius: 28, padding: 36,
    alignItems: 'center', width: 300, position: 'relative',
    shadowColor: '#FF6B9D', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 20, elevation: 12,
  },
  star: { position: 'absolute', fontSize: 22 },
  star1: { top: 16, left: 24 },
  star2: { top: 8, right: 20 },
  star3: { bottom: 60, right: 24 },
  trophy: { fontSize: 72, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', color: '#2D2D2D', textAlign: 'center', marginBottom: 8 },
  reason: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 28 },
  btnRow: { flexDirection: 'row', gap: 10 },
  btn: {
    backgroundColor: '#FF6B9D', borderRadius: 14,
    paddingVertical: 13, paddingHorizontal: 28,
    shadowColor: '#FF6B9D', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnGhost: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#FF6B9D', shadowOpacity: 0 },
  btnGhostText: { color: '#FF6B9D' },
});
