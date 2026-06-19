import { useEffect, useState } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';

// @google/model-viewer 一載入就 `class extends HTMLElement`，在 Expo 的 SSR/靜態預先渲染（Node）會找不到 HTMLElement 而崩潰，
// 所以只能在瀏覽器掛載後才動態 import。沒載好之前先顯示空白佔位。
let modelViewerLoaded = false;

// 藏掉 model-viewer 載入時頂部那條灰色進度條（shadow DOM 裡的 ::part，只能用全域 CSS 蓋）
function hideProgressBar() {
  if (typeof document === 'undefined' || document.getElementById('mv-hide-progress')) return;
  const style = document.createElement('style');
  style.id = 'mv-hide-progress';
  style.textContent = 'model-viewer::part(default-progress-bar){display:none!important;}';
  document.head.appendChild(style);
}

// 直接用 <model-viewer> 渲染 .glb，不需要額外準備 preview 圖：
// 收集前 = 固定角度 + 剪影 filter（隨進度從全黑漸漸顯現顏色）；收集後 = 可拖曳旋轉、自動旋轉的完整 3D 檢視
export function CollectibleModel({
  src,
  locked,
  progress = 0,
  style,
}: {
  src: string;
  locked: boolean;
  progress?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const [ready, setReady] = useState(modelViewerLoaded);

  useEffect(() => {
    hideProgressBar();
    if (modelViewerLoaded) return;
    let active = true;
    import('@google/model-viewer').then(() => {
      modelViewerLoaded = true;
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const clamped = Math.max(0, Math.min(progress, 1));

  const modelStyle = {
    width: '100%',
    height: '100%',
    filter: locked ? `brightness(${clamped}) saturate(${clamped})` : 'none',
  } as any;

  if (!ready) {
    return <View style={[styles.wrap, style]} />;
  }

  return (
    <View style={[styles.wrap, style]}>
      <model-viewer
        src={src}
        style={modelStyle}
        camera-controls={!locked}
        auto-rotate={!locked}
        disable-zoom={locked}
        interaction-prompt="none"
        camera-orbit={locked ? '0deg 75deg 105%' : undefined}
        shadow-intensity="1"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', height: '100%' },
});
