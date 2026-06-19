import { ReactNode } from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';

// 非 web 平台（這個 app 目前只跑網頁 PWA）：不處理捏合，直接原樣顯示
export function PinchZoom({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={style}>{children}</View>;
}
