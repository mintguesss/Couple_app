import { useEffect } from 'react';
import { View, Platform } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { CoupleProvider, useCouple } from '@/context/CoupleContext';
import InstallBanner from '@/components/InstallBanner';
import { usePoopNotification, requestPoopNotificationPermission } from '@/hooks/use-poop-notification';

SplashScreen.preventAutoHideAsync();



function PoopNotificationProvider() {
  const { user, profile } = useAuth();
  const { couple, partner } = useCouple();

  const myId = user?.uid ?? '';
  const partnerId = couple?.members.find((id) => id !== myId) ?? '';

  usePoopNotification(profile?.coupleId, partnerId || undefined, partner?.name ?? '對方');

  useEffect(() => {
    if (!profile?.coupleId || Platform.OS !== 'web') return;
    requestPoopNotificationPermission();
  }, [profile?.coupleId]);

  return null;
}

function RootLayoutNav() {
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // Service Worker for Android PWA install prompt
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    // iOS PWA meta tags — makes "Add to Home Screen" open fullscreen without Safari UI
    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
      if (!el) { el = document.createElement('meta'); el.name = name; document.head.appendChild(el); }
      el.content = content;
    };
    setMeta('apple-mobile-web-app-capable', 'yes');
    setMeta('apple-mobile-web-app-status-bar-style', 'black-translucent');
    setMeta('apple-mobile-web-app-title', '小堡');
  }, []);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    SplashScreen.hideAsync();

    const inAuth = segments[0] === '(auth)';

    if (!user) {
      if (!inAuth) router.replace('/(auth)/login');
    } else if (!profile?.coupleId) {
      if (!(inAuth && segments[1] === 'pairing')) {
        router.replace('/(auth)/pairing');
      }
    } else {
      if (inAuth) router.replace('/(tabs)');
    }
  }, [user, profile, loading]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="memory/index"
        options={{ headerShown: true, title: '回憶相冊', headerTintColor: '#FF6B9D' }}
      />
      <Stack.Screen
        name="mood/index"
        options={{ headerShown: true, title: '心情日記', headerTintColor: '#FF6B9D' }}
      />
      <Stack.Screen
        name="games/index"
        options={{ headerShown: true, title: '情侶遊戲', headerTintColor: '#FF6B9D' }}
      />
      <Stack.Screen
        name="tasks/index"
        options={{ headerShown: true, title: '共同任務', headerTintColor: '#FF6B9D' }}
      />
      <Stack.Screen
        name="period/index"
        options={{ headerShown: true, title: '🩸 月經追蹤', headerTintColor: '#FF6B9D' }}
      />
      <Stack.Screen
        name="collection/index"
        options={{ headerShown: true, title: '📖 圖鑑', headerTintColor: '#FF6B9D' }}
      />
      <Stack.Screen
        name="records/water"
        options={{ headerShown: true, title: '💧 喝水紀錄', headerTintColor: '#56CFE1' }}
      />
      <Stack.Screen
        name="records/meals"
        options={{ headerShown: true, title: '🍽️ 飲食紀錄', headerTintColor: '#C77DFF' }}
      />
      <Stack.Screen
        name="records/poop"
        options={{ headerShown: true, title: '💩 排便紀錄', headerTintColor: '#8B6914' }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <CoupleProvider>
          <PoopNotificationProvider />
          {/* 電腦版：置中手機框；手機版：直接全版面 */}
          <View style={Platform.OS === 'web' ? desktopOuter : { flex: 1 }}>
            <View style={Platform.OS === 'web' ? desktopInner : { flex: 1 }}>
              <InstallBanner />
              <RootLayoutNav />
            </View>
          </View>
        </CoupleProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const desktopOuter: any = {
  flex: 1,
  backgroundColor: '#E8D4DA',
  alignItems: 'center',
  justifyContent: 'stretch',
};

const desktopInner: any = {
  flex: 1,
  width: '100%',
  maxWidth: 430,
  backgroundColor: '#fff',
  boxShadow: '0 0 48px rgba(0,0,0,0.18)',
  overflow: 'hidden',
};
