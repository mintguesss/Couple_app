import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';

// 用 CSS filter 把 emoji 壓成全黑剪影（保留形狀、抹掉顏色），
// 再隨 progress (0~1) 從剪影漸漸轉回原本的顏色 —— 純網頁 PWA 才能用 filter，這裡直接套用即可
export function CollectibleReveal({
  emoji,
  progress,
  size = 36,
  style,
  showBadge = true,
}: {
  emoji: string;
  progress: number;
  size?: number;
  style?: StyleProp<ViewStyle>;
  showBadge?: boolean;
}) {
  const clamped = Math.max(0, Math.min(progress, 1));
  const pct = Math.round(clamped * 100);

  // filter 是 web-only CSS 屬性；react-native-web 的型別已經支援，會直接透傳給 DOM
  const emojiStyle: TextStyle = {
    ...styles.emoji,
    fontSize: size,
    filter: `brightness(${clamped}) saturate(${clamped})`,
  };

  return (
    <View style={[styles.wrap, style]}>
      <Text style={emojiStyle}>{emoji}</Text>
      {showBadge && clamped < 1 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{pct}%</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  emoji: { textAlign: 'center' },
  badge: {
    position: 'absolute', bottom: -4, backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1,
  },
  badgeText: { fontSize: 9, color: '#fff', fontWeight: '700' },
});
