import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';

// 非 web 平台尚未支援 3D 模型檢視（這個 app 目前只跑網頁 PWA）
export function CollectibleModel({
  style,
}: {
  src: string;
  locked: boolean;
  progress?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.wrap, style]} />;
}

const styles = StyleSheet.create({
  wrap: { width: '100%', height: '100%' },
});
