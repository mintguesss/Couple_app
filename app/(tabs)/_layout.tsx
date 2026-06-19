import { Tabs } from 'expo-router';
import { Text } from 'react-native';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: focused ? 26 : 22, textAlign: 'center' }}>{emoji}</Text>;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FF6B9D',
        tabBarInactiveTintColor: '#BBBBBB',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#F0E0E5',
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: '首頁', tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} /> }} />
      <Tabs.Screen name="health" options={{ title: '健康', tabBarIcon: ({ focused }) => <TabIcon emoji="🌱" focused={focused} /> }} />
      <Tabs.Screen name="calendar" options={{ title: '日曆', tabBarIcon: ({ focused }) => <TabIcon emoji="📅" focused={focused} /> }} />
      <Tabs.Screen name="more" options={{ title: '更多', tabBarIcon: ({ focused }) => <TabIcon emoji="✨" focused={focused} /> }} />
      <Tabs.Screen name="chat" options={{ href: null }} />
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}
