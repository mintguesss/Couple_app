import { ReactNode, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';

const MIN = 1;
const MAX = 4;

// 棋盤太小容易點錯：用雙指捏合縮放、雙指拖曳平移；單指照常落子。右下角「重置」回到原始大小。
// 只在網頁 PWA 用（用 Pointer Events 直接操作 DOM），native 端走 PinchZoom.tsx 的 passthrough。
export function PinchZoom({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const containerRef = useRef<any>(null);
  const contentRef = useRef<any>(null);
  const [zoomed, setZoomed] = useState(false);

  const st = useRef({
    scale: 1, tx: 0, ty: 0,
    pointers: new Map<number, { x: number; y: number }>(),
    startDist: 0, startScale: 1, anchor: { x: 0, y: 0 },
    gesturing: false,
  }).current;

  const apply = () => {
    const c = contentRef.current;
    if (c) c.style.transform = `translate(${st.tx}px, ${st.ty}px) scale(${st.scale})`;
  };

  const clamp = () => {
    const cont = containerRef.current;
    if (!cont) return;
    const W = cont.clientWidth, H = cont.clientHeight;
    st.tx = Math.min(0, Math.max(W - W * st.scale, st.tx));
    st.ty = Math.min(0, Math.max(H - H * st.scale, st.ty));
  };

  const reset = () => {
    st.scale = 1; st.tx = 0; st.ty = 0;
    apply();
    setZoomed(false);
  };

  useEffect(() => {
    const cont = containerRef.current;
    const content = contentRef.current;
    if (!cont || !content) return;
    cont.style.touchAction = 'none';
    cont.style.overflow = 'hidden';
    cont.style.position = 'relative';
    content.style.transformOrigin = '0 0';

    const local = (e: PointerEvent) => {
      const r = cont.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    const onDown = (e: PointerEvent) => {
      st.pointers.set(e.pointerId, local(e));
      // 單指不攔截（讓棋盤照常落子）；第二指出現才開始縮放手勢並攔截兩指
      if (st.pointers.size === 2) {
        const [a, b] = [...st.pointers.values()];
        st.startDist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        st.startScale = st.scale;
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        st.anchor = { x: (mid.x - st.tx) / st.scale, y: (mid.y - st.ty) / st.scale };
        st.gesturing = true;
        content.style.pointerEvents = 'none'; // 捏合中不要誤觸落子
        for (const id of st.pointers.keys()) { try { cont.setPointerCapture(id); } catch {} }
      }
    };

    const onMove = (e: PointerEvent) => {
      if (!st.pointers.has(e.pointerId)) return;
      st.pointers.set(e.pointerId, local(e));
      if (st.gesturing && st.pointers.size >= 2) {
        e.preventDefault();
        const [a, b] = [...st.pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        st.scale = Math.min(MAX, Math.max(MIN, st.startScale * dist / st.startDist));
        st.tx = mid.x - st.anchor.x * st.scale;
        st.ty = mid.y - st.anchor.y * st.scale;
        clamp();
        apply();
      }
    };

    const onUp = (e: PointerEvent) => {
      st.pointers.delete(e.pointerId);
      try { cont.releasePointerCapture(e.pointerId); } catch {}
      if (st.pointers.size < 2 && st.gesturing) st.gesturing = false;
      if (st.pointers.size === 0) {
        content.style.pointerEvents = '';
        setZoomed(st.scale > 1.01);
      }
    };

    cont.addEventListener('pointerdown', onDown);
    cont.addEventListener('pointermove', onMove, { passive: false });
    cont.addEventListener('pointerup', onUp);
    cont.addEventListener('pointercancel', onUp);
    return () => {
      cont.removeEventListener('pointerdown', onDown);
      cont.removeEventListener('pointermove', onMove);
      cont.removeEventListener('pointerup', onUp);
      cont.removeEventListener('pointercancel', onUp);
    };
  }, []);

  return (
    <View ref={containerRef} style={style}>
      <View ref={contentRef} style={styles.content}>{children}</View>
      {zoomed && (
        <TouchableOpacity style={styles.resetBtn} onPress={reset} activeOpacity={0.8}>
          <Text style={styles.resetText}>⟲ 重置</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', height: '100%', position: 'relative' },
  resetBtn: {
    position: 'absolute', right: 6, bottom: 6,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 14,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  resetText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
