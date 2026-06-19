import { useEffect, useState } from 'react';
import { Platform, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function InstallBanner() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [prompt, setPrompt] = useState<any>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // Already installed as PWA — don't show
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) return;

    const ua = navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua);
    setIsIOS(ios);

    if (ios) {
      // iOS Safari: no programmatic prompt, show manual instructions
      setShow(true);
      return;
    }

    // Android Chrome / desktop: listen for beforeinstallprompt
    const handler = (e: any) => {
      e.preventDefault();
      setPrompt(e);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setShow(false);
    setPrompt(null);
  };

  if (!show) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.icon}>📲</Text>
      <View style={styles.textWrap}>
        {isIOS ? (
          <Text style={styles.text}>
            加入主畫面：點 Safari 底部{' '}
            <Text style={styles.bold}>分享 ⎙</Text>
            {' '}→{' '}
            <Text style={styles.bold}>加入主畫面</Text>
          </Text>
        ) : (
          <Text style={styles.text}>
            安裝小堡到主畫面，隨時快速開啟
          </Text>
        )}
      </View>
      {!isIOS && (
        <TouchableOpacity style={styles.installBtn} onPress={handleInstall}>
          <Text style={styles.installBtnText}>安裝</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={styles.closeBtn} onPress={() => setShow(false)}>
        <Text style={styles.closeBtnText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FF6B9D', paddingHorizontal: 14, paddingVertical: 10,
    gap: 8,
  },
  icon: { fontSize: 20 },
  textWrap: { flex: 1 },
  text: { color: '#fff', fontSize: 13, lineHeight: 18 },
  bold: { fontWeight: '800' },
  installBtn: {
    backgroundColor: '#fff', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  installBtnText: { color: '#FF6B9D', fontWeight: '700', fontSize: 13 },
  closeBtn: { padding: 4 },
  closeBtnText: { color: 'rgba(255,255,255,0.8)', fontSize: 16 },
});
