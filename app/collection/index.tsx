import { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useCouple } from '@/context/CoupleContext';
import { useWeeklyCollection } from '@/hooks/use-weekly-collection';
import { COLLECTIBLES, CollectibleItem, TEST_COLLECTED_IDS, currentWeekStart } from '@/services/collectionService';
import { CollectibleReveal } from '@/components/CollectibleReveal';
import { CollectibleModel } from '@/components/CollectibleModel';
import { CollectibleLightbox } from '@/components/CollectibleLightbox';

const CATEGORIES: CollectibleItem['category'][] = ['植物', '動物', '其他'];

export default function CollectionScreen() {
  const { user, profile } = useAuth();
  const { couple } = useCouple();
  const [picking, setPicking] = useState(false);
  const [zoomItem, setZoomItem] = useState<CollectibleItem | null>(null);

  const coupleId = profile?.coupleId;
  const myId = user?.uid ?? '';
  const partnerId = couple?.members.find((id) => id !== myId) ?? '';

  const weekly = useWeeklyCollection(coupleId, myId, partnerId);

  // 本週進度的重置時間：下一個禮拜一 04:00（這週起點 + 7 天）
  const nextReset = useMemo(() => {
    const d = currentWeekStart();
    d.setDate(d.getDate() + 7);
    return d;
  }, []);

  const collectedMap = useMemo(() => {
    const map = new Map<string, Date>();
    for (const entry of weekly.collection) {
      const existing = map.get(entry.itemId);
      if (!existing || entry.collectedAt < existing) map.set(entry.itemId, entry.collectedAt);
    }
    // 測試用：強制把 TEST_COLLECTED_IDS 當成已收集
    for (const id of TEST_COLLECTED_IDS) {
      if (!map.has(id)) map.set(id, new Date());
    }
    return map;
  }, [weekly.collection]);

  async function handlePick(itemId: string) {
    await weekly.chooseTarget(itemId);
    setPicking(false);
  }

  return (
    <>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Weekly progress summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>本週圖鑑挑戰</Text>
        <Text style={styles.summaryCount}>已收集 {weekly.collectedCount} / {weekly.totalCount}</Text>
        <Text style={styles.updatedAt}>進度將於 {formatReset(nextReset)} 重置</Text>
        <View style={styles.weeklyRow}>
          <Text style={styles.weeklyLabel}>💧 雙方喝水 {weekly.totalWater}/{weekly.waterTarget} 杯</Text>
          <Bar value={weekly.totalWater} max={weekly.waterTarget} color="#56CFE1" />
        </View>
        <View style={styles.weeklyRow}>
          <Text style={styles.weeklyLabel}>💩 雙方拉屎 {weekly.totalPoop}/{weekly.poopTarget} 次</Text>
          <Bar value={weekly.totalPoop} max={weekly.poopTarget} color="#8B6914" />
        </View>

        {/* This week's chosen target — silhouette reveals as progress fills up */}
        <View style={styles.targetBox}>
          {weekly.collectedThisWeek && weekly.selectedItem ? (
            <>
              {weekly.selectedItem.model ? (
                <CollectibleModel src={weekly.selectedItem.model} locked={false} style={styles.targetModel} />
              ) : (
                <Text style={styles.targetEmoji}>{weekly.selectedItem.emoji}</Text>
              )}
              <Text style={styles.targetHint}>🎉 本週已收集到「{weekly.selectedItem.name}」！下週再選一個吧</Text>
            </>
          ) : weekly.selectedItem ? (
            <>
              {weekly.selectedItem.model ? (
                <CollectibleModel
                  src={weekly.selectedItem.model}
                  locked
                  progress={weekly.revealProgress}
                  style={styles.targetModel}
                />
              ) : (
                <CollectibleReveal emoji={weekly.selectedItem.emoji} progress={weekly.revealProgress} size={44} />
              )}
              <Text style={styles.targetHint}>本週目標：{weekly.selectedItem.name}（隨進度逐漸顯現，達標就能收進圖鑑）</Text>
              <TouchableOpacity onPress={() => setPicking((v) => !v)}>
                <Text style={styles.targetLink}>{picking ? '收起選擇 ︿' : '重新選擇 ›'}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.targetEmoji}>❔</Text>
              <Text style={styles.targetHint}>還沒選擇本週想收集的圖鑑</Text>
              <TouchableOpacity onPress={() => setPicking((v) => !v)}>
                <Text style={styles.targetLink}>{picking ? '收起選擇 ︿' : '選擇本週圖鑑 ›'}</Text>
              </TouchableOpacity>
            </>
          )}

          {picking && !weekly.collectedThisWeek && (
            <View style={styles.pickerGrid}>
              {weekly.selectableItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.pickerItem, weekly.selectedItem?.id === item.id && styles.pickerItemActive]}
                  onPress={() => handlePick(item.id)}
                >
                  {item.model ? (
                    <CollectibleModel src={item.model} locked progress={0} style={styles.pickerModel} />
                  ) : (
                    <CollectibleReveal emoji={item.emoji} progress={0} size={24} showBadge={false} />
                  )}
                  <Text style={styles.pickerName}>{item.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Collection grid by category */}
      {CATEGORIES.map((category) => {
        const items = COLLECTIBLES.filter((c) => c.category === category);
        return (
          <View key={category} style={styles.section}>
            <Text style={styles.sectionTitle}>{category}</Text>
            <View style={styles.grid}>
              {items.map((item) => {
                const collectedAt = collectedMap.get(item.id);
                const collected = !!collectedAt;
                const isTarget = !collected && weekly.selectedItem?.id === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.itemCard, !collected && styles.itemCardLocked]}
                    activeOpacity={collected ? 0.7 : 1}
                    onPress={() => collected && setZoomItem(item)}
                  >
                    {collected ? (
                      item.model ? (
                        <CollectibleModel src={item.model} locked={false} style={styles.itemModel} />
                      ) : (
                        <Text style={styles.itemEmoji}>{item.emoji}</Text>
                      )
                    ) : isTarget ? (
                      item.model ? (
                        <CollectibleModel src={item.model} locked progress={weekly.revealProgress} style={styles.itemModel} />
                      ) : (
                        <CollectibleReveal emoji={item.emoji} progress={weekly.revealProgress} size={36} />
                      )
                    ) : (
                      <Text style={styles.itemEmoji}>❔</Text>
                    )}
                    <Text style={[styles.itemName, !collected && styles.itemNameLocked]}>
                      {collected ? item.name : isTarget ? '本週目標' : '尚未收集'}
                    </Text>
                    {collected && (
                      <Text style={styles.itemDate}>
                        {collectedAt.getFullYear()}/{collectedAt.getMonth() + 1}/{collectedAt.getDate()}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      })}
    </ScrollView>
    <CollectibleLightbox item={zoomItem} onClose={() => setZoomItem(null)} />
    </>
  );
}

function formatReset(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getMonth() + 1)}/${p(d.getDate())}（週一）${p(d.getHours())}:${p(d.getMinutes())}`;
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <View style={styles.barBg}>
      <View style={[styles.barFill, { width: `${Math.min(value / max, 1) * 100}%` as any, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF5F7' },
  content: { padding: 20, paddingBottom: 50 },
  summaryCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 20,
    shadowColor: '#FF6B9D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 4,
  },
  summaryTitle: { fontSize: 16, fontWeight: '800', color: '#2D2D2D', marginBottom: 4 },
  summaryCount: { fontSize: 13, color: '#FF6B9D', fontWeight: '700', marginBottom: 2 },
  updatedAt: { fontSize: 11, color: '#BBBBBB', marginBottom: 14 },
  weeklyRow: { marginBottom: 10 },
  weeklyLabel: { fontSize: 12, color: '#888', marginBottom: 5 },
  barBg: { height: 8, borderRadius: 4, backgroundColor: '#F5F5F5', overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  targetBox: {
    marginTop: 12, alignItems: 'center', paddingTop: 16,
    borderTopWidth: 1, borderTopColor: '#F5F5F5',
  },
  targetEmoji: { fontSize: 40, marginBottom: 6 },
  targetModel: { width: 90, height: 90, marginBottom: 6 },
  targetHint: { fontSize: 12, color: '#888', textAlign: 'center', marginBottom: 8, paddingHorizontal: 10 },
  targetLink: { fontSize: 12, color: '#FF6B9D', fontWeight: '700' },
  pickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14, justifyContent: 'center' },
  pickerItem: {
    backgroundColor: '#FAFAFA', borderRadius: 14, padding: 10, width: '21%', alignItems: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  pickerItemActive: { borderColor: '#FF6B9D', backgroundColor: '#FFF0F5' },
  pickerModel: { width: 36, height: 36, marginBottom: 4 },
  pickerName: { fontSize: 10, color: '#888', textAlign: 'center' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#2D2D2D', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  itemCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14, width: '30%', alignItems: 'center',
    shadowColor: '#FF6B9D', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
  },
  itemCardLocked: { backgroundColor: '#FAFAFA', shadowOpacity: 0 },
  itemEmoji: { fontSize: 36, marginBottom: 6 },
  itemModel: { width: 60, height: 60, marginBottom: 6 },
  itemName: { fontSize: 12, fontWeight: '700', color: '#2D2D2D', textAlign: 'center' },
  itemNameLocked: { color: '#BBBBBB', fontWeight: '600' },
  itemDate: { fontSize: 10, color: '#BBBBBB', marginTop: 2 },
});
