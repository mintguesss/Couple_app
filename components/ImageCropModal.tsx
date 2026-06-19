import { useState, useRef, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';

const PREVIEW = 260;

interface Props {
  uri: string;
  onConfirm: (croppedUri: string) => void;
  onCancel: () => void;
}

// Web-only component using native HTML drag/pinch events
function WebCropPreview({
  uri, zoom, panX, panY, imgW, imgH,
  setZoom, setPanX, setPanY, setImgSize,
}: {
  uri: string;
  zoom: number; panX: number; panY: number;
  imgW: number; imgH: number;
  setZoom: (fn: (z: number) => number) => void;
  setPanX: (fn: (x: number) => number) => void;
  setPanY: (fn: (y: number) => number) => void;
  setImgSize: (w: number, h: number) => void;
}) {
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null);

  const coverScale = Math.max(PREVIEW / Math.max(imgW, 1), PREVIEW / Math.max(imgH, 1));
  const dispW = imgW * coverScale * zoom;
  const dispH = imgH * coverScale * zoom;
  const maxPX = Math.max(0, (dispW - PREVIEW) / 2);
  const maxPY = Math.max(0, (dispH - PREVIEW) / 2);
  const cpX = Math.max(-maxPX, Math.min(maxPX, panX));
  const cpY = Math.max(-maxPY, Math.min(maxPY, panY));
  const imgLeft = (PREVIEW - dispW) / 2 + cpX;
  const imgTop  = (PREVIEW - dispH) / 2 + cpY;

  const onMouseDown = (e: any) => {
    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    e.preventDefault();
  };
  const onMouseMove = (e: any) => {
    if (!isDragging.current) return;
    setPanX(x => x + e.clientX - lastPos.current.x);
    setPanY(y => y + e.clientY - lastPos.current.y);
    lastPos.current = { x: e.clientX, y: e.clientY };
  };
  const onMouseUp = () => { isDragging.current = false; };

  const onWheel = (e: any) => {
    e.preventDefault();
    setZoom(z => Math.max(1, Math.min(4, z + (e.deltaY < 0 ? 0.08 : -0.08))));
  };

  const onTouchStart = (e: any) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      isDragging.current = true;
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      isDragging.current = false;
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      pinchRef.current = { dist, zoom };
    }
  };
  const onTouchMove = (e: any) => {
    e.preventDefault();
    if (e.touches.length === 1 && isDragging.current) {
      setPanX(x => x + e.touches[0].clientX - lastPos.current.x);
      setPanY(y => y + e.touches[0].clientY - lastPos.current.y);
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2 && pinchRef.current) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      const scale = dist / pinchRef.current.dist;
      setZoom(() => Math.max(1, Math.min(4, pinchRef.current!.zoom * scale)));
    }
  };
  const onTouchEnd = () => { isDragging.current = false; pinchRef.current = null; };

  // @ts-ignore — web-specific JSX
  return (
    // @ts-ignore
    <div
      style={{
        width: PREVIEW, height: PREVIEW, borderRadius: '50%',
        overflow: 'hidden', cursor: 'grab', userSelect: 'none',
        position: 'relative', border: '3px solid #FF6B9D',
        backgroundColor: '#F5F5F5', touchAction: 'none',
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onWheel={onWheel}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* @ts-ignore */}
      <img
        src={uri}
        draggable={false}
        onLoad={(e: any) => setImgSize(e.target.naturalWidth, e.target.naturalHeight)}
        style={{
          position: 'absolute',
          width: dispW, height: dispH,
          left: imgLeft, top: imgTop,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      />
    </div>
  );
}

export default function ImageCropModal({ uri, onConfirm, onCancel }: Props) {
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [imgW, setImgW] = useState(1);
  const [imgH, setImgH] = useState(1);

  const setImgSize = (w: number, h: number) => { setImgW(w); setImgH(h); };

  const coverScale = Math.max(PREVIEW / Math.max(imgW, 1), PREVIEW / Math.max(imgH, 1));
  const dispW = imgW * coverScale * zoom;
  const dispH = imgH * coverScale * zoom;
  const maxPX = Math.max(0, (dispW - PREVIEW) / 2);
  const maxPY = Math.max(0, (dispH - PREVIEW) / 2);
  const cpX = Math.max(-maxPX, Math.min(maxPX, panX));
  const cpY = Math.max(-maxPY, Math.min(maxPY, panY));
  const imgLeft = (PREVIEW - dispW) / 2 + cpX;
  const imgTop  = (PREVIEW - dispH) / 2 + cpY;
  const effectiveScale = coverScale * zoom;

  const handleConfirm = () => {
    if (Platform.OS !== 'web') { onConfirm(uri); return; }
    const canvas = document.createElement('canvas');
    canvas.width = 400; canvas.height = 400;
    const ctx = canvas.getContext('2d')!;
    const img = new (window as any).Image();
    img.onload = () => {
      const sx = -imgLeft / effectiveScale;
      const sy = -imgTop / effectiveScale;
      const sSize = PREVIEW / effectiveScale;
      ctx.save();
      ctx.beginPath();
      ctx.arc(200, 200, 200, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, 400, 400);
      ctx.restore();
      onConfirm(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.src = uri;
  };

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>調整大頭貼</Text>
          <Text style={styles.hint}>拖動移動 · 滾輪/雙指縮放</Text>

          <View style={styles.previewWrap}>
            {Platform.OS === 'web' && (
              <WebCropPreview
                uri={uri} zoom={zoom} panX={panX} panY={panY}
                imgW={imgW} imgH={imgH}
                setZoom={setZoom} setPanX={setPanX} setPanY={setPanY}
                setImgSize={setImgSize}
              />
            )}
          </View>

          <Text style={styles.zoomText}>縮放：{Math.round(zoom * 100)}%</Text>

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
              <Text style={styles.confirmText}>確認 ✓</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center' },
  box: { backgroundColor: '#fff', borderRadius: 24, padding: 24, width: 320, alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: '#2D2D2D', marginBottom: 4 },
  hint: { fontSize: 12, color: '#888', marginBottom: 20 },
  previewWrap: { marginBottom: 14 },
  zoomText: { fontSize: 13, color: '#888', marginBottom: 16 },
  btnRow: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn: { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '600', color: '#888' },
  confirmBtn: { flex: 1, backgroundColor: '#FF6B9D', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  confirmText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
