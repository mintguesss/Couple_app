import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useCouple } from '@/context/CoupleContext';
import { subscribeToTodayHealth } from '@/services/healthService';
import { subscribeToMoods, MOOD_OPTIONS } from '@/services/moodService';
import { subscribeToEvents } from '@/services/calendarService';
import { useWeeklyCollection } from '@/hooks/use-weekly-collection';
import { CollectibleReveal } from '@/components/CollectibleReveal';
import { CollectibleModel } from '@/components/CollectibleModel';
import { CollectibleLightbox } from '@/components/CollectibleLightbox';
import { CollectibleItem } from '@/services/collectionService';

function daysSince(date: Date): number {
  const ms = Date.now() - date.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function HomeScreen() {
  const { user, profile } = useAuth();
  const { couple, partner } = useCouple();
  const router = useRouter();

  const [myHealth, setMyHealth] = useState({ water: 0, meals: [] as any[] });
  const [partnerHealth, setPartnerHealth] = useState({ water: 0, meals: [] as any[] });
  const [moods, setMoods] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [zoomItem, setZoomItem] = useState<CollectibleItem | null>(null);
  const [showcaseIndex, setShowcaseIndex] = useState(0);

  const coupleId = profile?.coupleId;
  const myId = user?.uid ?? '';
  const partnerId = couple?.members.find((id) => id !== myId) ?? '';

  useEffect(() => {
    if (!coupleId || !myId) return;
    const unsub1 = subscribeToTodayHealth(coupleId, myId, setMyHealth);
    const unsub2 = partnerId
      ? subscribeToTodayHealth(coupleId, partnerId, setPartnerHealth)
      : () => {};
    const unsub3 = subscribeToMoods(coupleId, setMoods, 4);
    const unsub4 = subscribeToEvents(coupleId, (events) => {
      const today = todayStr();
      setUpcomingEvents(events.filter((e) => e.date >= today).slice(0, 3));
    });
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }, [coupleId, myId, partnerId]);

  const weekly = useWeeklyCollection(coupleId, myId, partnerId);

  // 優先用手動設定的交往紀念日，否則用配對建立日期
  const baseDate = couple?.anniversaryDate ?? couple?.createdAt;
  const daysTogether = baseDate ? daysSince(baseDate) : 0;

  const todayDate = new Date().toDateString();
  const myMood = moods.find((m) => m.userId === myId && m.createdAt.toDateString() === todayDate);
  const partnerMood = moods.find((m) => m.userId === partnerId && m.createdAt.toDateString() === todayDate);

  return (
    <>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} tintColor="#FF6B9D" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {profile?.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.headerAvatar} />
          ) : (
            <View style={[styles.headerAvatar, styles.headerAvatarPlaceholder]}>
              <Text style={{ fontSize: 22 }}>🙂</Text>
            </View>
          )}
          <View>
            <Text style={styles.greeting}>你好，{profile?.name} 👋</Text>
            <Text style={styles.partnerLine}>
              {partner ? `與 ${partner.name} 在一起` : '等待配對中'}
            </Text>
          </View>
        </View>
        {partner?.avatarUrl ? (
          <Image source={{ uri: partner.avatarUrl }} style={styles.headerAvatar} />
        ) : (
          <View style={[styles.headerAvatar, styles.headerAvatarPlaceholder]}>
            <Text style={{ fontSize: 22 }}>🥰</Text>
          </View>
        )}
      </View>

      {/* Days together banner */}
      {couple && (
        <View style={styles.daysBanner}>
          <Text style={styles.daysNumber}>{daysTogether}</Text>
          <Text style={styles.daysLabel}>天</Text>
          <Text style={styles.daysDesc}>我們在一起的日子 💕</Text>
        </View>
      )}

      {/* Collection showcase — one centered model at a time, switchable */}
      <View style={styles.showcase}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>我們的收藏 🏆</Text>
          <TouchableOpacity onPress={() => router.push('/collection' as any)}>
            <Text style={styles.cardAction}>全部 ›</Text>
          </TouchableOpacity>
        </View>
        {weekly.collectedItems.length === 0 ? (
          <Text style={styles.showcaseEmpty}>還沒有收藏，完成本週挑戰來收集第一個吧！</Text>
        ) : (
          (() => {
            const items = weekly.collectedItems;
            const idx = ((showcaseIndex % items.length) + items.length) % items.length;
            const item = items[idx];
            return (
              <>
                <View style={styles.showcaseCarousel}>
                  {items.length > 1 && (
                    <TouchableOpacity
                      style={styles.showcaseArrow}
                      onPress={() => setShowcaseIndex(idx - 1)}
                    >
                      <Text style={styles.showcaseArrowText}>‹</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.showcaseStageBig}
                    activeOpacity={0.9}
                    onPress={() => setZoomItem(item)}
                  >
                    {item.model ? (
                      <CollectibleModel src={item.model} locked={false} style={styles.showcaseModel} />
                    ) : (
                      <Text style={styles.showcaseEmojiBig}>{item.emoji}</Text>
                    )}
                  </TouchableOpacity>
                  {items.length > 1 && (
                    <TouchableOpacity
                      style={styles.showcaseArrow}
                      onPress={() => setShowcaseIndex(idx + 1)}
                    >
                      <Text style={styles.showcaseArrowText}>›</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.showcaseName}>{item.name}</Text>
                {items.length > 1 && (
                  <View style={styles.showcaseDots}>
                    {items.map((it, i) => (
                      <View
                        key={it.id}
                        style={[styles.dot, i === idx && styles.dotActive]}
                      />
                    ))}
                  </View>
                )}
              </>
            );
          })()
        )}
      </View>

      {/* Weekly collection challenge */}
      <TouchableOpacity style={styles.card} onPress={() => router.push('/collection' as any)}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>本週圖鑑挑戰</Text>
          <Text style={styles.cardArrow}>›</Text>
        </View>
        <View style={styles.plantRow}>
          {weekly.selectedItem ? (
            <CollectibleReveal
              emoji={weekly.selectedItem.emoji}
              progress={weekly.revealProgress}
              size={48}
              style={styles.plantEmojiBox}
            />
          ) : (
            <Text style={styles.plantEmoji}>📖</Text>
          )}
          <View style={styles.plantInfo}>
            <Text style={styles.plantName}>已收集 {weekly.collectedCount}/{weekly.totalCount}</Text>
            <Text style={styles.plantDesc}>
              {weekly.collectedThisWeek
                ? `🎉 本週已收集到「${weekly.selectedItem?.name ?? '新圖鑑'}」！`
                : weekly.selectedItem
                  ? `本週目標：${weekly.selectedItem.name}（剪影會隨進度顯現）`
                  : '還沒選擇本週圖鑑，點我前往選擇'}
            </Text>
            <View style={styles.healthMini}>
              <Text style={styles.healthMiniText}>💧 {weekly.totalWater}/{weekly.waterTarget} 杯</Text>
              <Text style={styles.healthMiniText}>💩 {weekly.totalPoop}/{weekly.poopTarget} 次</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* Mood row */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>今日心情</Text>
          <TouchableOpacity onPress={() => router.push('/mood')}>
            <Text style={styles.cardAction}>記錄 ›</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.moodRow}>
          <View style={styles.moodItem}>
            <Text style={styles.moodName}>我</Text>
            <Text style={styles.moodEmoji}>{myMood?.emoji ?? '—'}</Text>
            <Text style={styles.moodLabel}>{myMood?.note || '還沒記錄'}</Text>
          </View>
          <Text style={styles.moodDivider}>💞</Text>
          <View style={styles.moodItem}>
            <Text style={styles.moodName}>{partner?.name ?? '他/她'}</Text>
            <Text style={styles.moodEmoji}>{partnerMood?.emoji ?? '—'}</Text>
            <Text style={styles.moodLabel}>{partnerMood?.note || '還沒記錄'}</Text>
          </View>
        </View>
      </View>

      {/* Upcoming events */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>即將到來</Text>
          <TouchableOpacity onPress={() => router.push('/calendar')}>
            <Text style={styles.cardAction}>查看 ›</Text>
          </TouchableOpacity>
        </View>
        {upcomingEvents.length === 0 ? (
          <Text style={styles.emptyText}>沒有即將到來的行程</Text>
        ) : (
          upcomingEvents.map((e) => (
            <View key={e.id} style={styles.eventRow}>
              <Text style={styles.eventDot}>{e.isAnniversary ? '💖' : '📌'}</Text>
              <View>
                <Text style={styles.eventTitle}>{e.title}</Text>
                <Text style={styles.eventDate}>{e.date}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Quick action grid */}
      <Text style={styles.sectionTitle}>快速入口</Text>
      <View style={styles.grid}>
        {[
          { emoji: '🎮', label: '情侶遊戲', route: '/games' },
          { emoji: '📸', label: '回憶相冊', route: '/memory' },
          { emoji: '✅', label: '共同任務', route: '/tasks' },
          { emoji: '😊', label: '心情日記', route: '/mood' },
        ].map((item) => (
          <TouchableOpacity
            key={item.label}
            style={styles.gridItem}
            onPress={() => router.push(item.route as any)}
          >
            <Text style={styles.gridEmoji}>{item.emoji}</Text>
            <Text style={styles.gridLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
    <CollectibleLightbox item={zoomItem} onClose={() => setZoomItem(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF5F7' },
  content: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 10 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  headerAvatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#FFB3CC' },
  headerAvatarPlaceholder: { backgroundColor: '#FFF0F5', justifyContent: 'center', alignItems: 'center' },
  greeting: { fontSize: 20, fontWeight: '800', color: '#2D2D2D' },
  partnerLine: { fontSize: 13, color: '#888', marginTop: 1 },
  daysBanner: {
    backgroundColor: '#FF6B9D', borderRadius: 18, padding: 20,
    alignItems: 'center', flexDirection: 'row', marginBottom: 16,
    shadowColor: '#FF6B9D', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  daysNumber: { fontSize: 52, fontWeight: '800', color: '#fff', lineHeight: 58 },
  daysLabel: { fontSize: 20, color: '#FFD6E7', fontWeight: '600', marginLeft: 4, alignSelf: 'flex-end', marginBottom: 8 },
  daysDesc: { fontSize: 15, color: '#FFE0EE', marginLeft: 12, flex: 1 },
  card: {
    backgroundColor: '#fff', borderRadius: 18, padding: 18,
    marginBottom: 14,
    shadowColor: '#FF6B9D', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  showcase: {
    backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 14,
    shadowColor: '#FF6B9D', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  showcaseEmpty: { fontSize: 13, color: '#BBBBBB', textAlign: 'center', paddingVertical: 24 },
  showcaseCarousel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  showcaseArrow: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF0F5',
    justifyContent: 'center', alignItems: 'center',
  },
  showcaseArrowText: { fontSize: 22, color: '#FF6B9D', fontWeight: '800', lineHeight: 24 },
  showcaseStageBig: {
    flex: 1, height: 220, backgroundColor: '#FAFAFA', borderRadius: 18,
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  showcaseModel: { width: '100%', height: '100%' },
  showcaseEmojiBig: { fontSize: 120 },
  showcaseName: { fontSize: 15, fontWeight: '800', color: '#2D2D2D', marginTop: 10, textAlign: 'center' },
  showcaseDots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#F0D0DC' },
  dotActive: { backgroundColor: '#FF6B9D', width: 18 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#2D2D2D' },
  cardArrow: { color: '#BBBBBB', fontSize: 18 },
  cardAction: { color: '#FF6B9D', fontSize: 14, fontWeight: '600' },
  plantRow: { flexDirection: 'row', alignItems: 'center' },
  plantEmoji: { fontSize: 52, marginRight: 16 },
  plantEmojiBox: { marginRight: 16 },
  plantInfo: { flex: 1 },
  plantName: { fontSize: 18, fontWeight: '700', color: '#2D2D2D', marginBottom: 2 },
  plantDesc: { fontSize: 13, color: '#888', marginBottom: 8 },
  healthMini: { flexDirection: 'row', gap: 12 },
  healthMiniText: { fontSize: 13, color: '#888' },
  moodRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  moodItem: { alignItems: 'center', flex: 1 },
  moodName: { fontSize: 13, color: '#888', marginBottom: 4 },
  moodEmoji: { fontSize: 32, marginBottom: 4 },
  moodLabel: { fontSize: 12, color: '#BBBBBB', textAlign: 'center' },
  moodDivider: { fontSize: 24 },
  emptyText: { color: '#BBBBBB', fontSize: 14, textAlign: 'center', paddingVertical: 8 },
  eventRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  eventDot: { fontSize: 18, marginRight: 10 },
  eventTitle: { fontSize: 14, fontWeight: '600', color: '#2D2D2D' },
  eventDate: { fontSize: 12, color: '#888' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#2D2D2D', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridItem: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18,
    alignItems: 'center', width: '47%',
    shadowColor: '#FF6B9D', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
  },
  gridEmoji: { fontSize: 32, marginBottom: 8 },
  gridLabel: { fontSize: 13, fontWeight: '600', color: '#2D2D2D' },
});
