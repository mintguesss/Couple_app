import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Link } from 'expo-router';
import { login } from '@/services/authService';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('提示', '請填寫帳號和密碼');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch {
      Alert.alert('登入失敗', '帳號或密碼錯誤，請再試一次');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>💑</Text>
        <Text style={styles.title}>小堡</Text>
        <Text style={styles.subtitle}>你們的專屬空間</Text>

        <TextInput
          style={styles.input}
          placeholder="電子信箱"
          placeholderTextColor="#BBBBBB"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          returnKeyType="next"
        />

        <View style={styles.pwWrap}>
          <TextInput
            style={styles.pwInput}
            placeholder="密碼"
            placeholderTextColor="#BBBBBB"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPw}
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPw(v => !v)}>
            <Text style={styles.eyeIcon}>{showPw ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
          <Text style={styles.btnText}>{loading ? '登入中...' : '登入'}</Text>
        </TouchableOpacity>

        <Link href="/(auth)/register" asChild>
          <TouchableOpacity style={styles.linkWrap}>
            <Text style={styles.linkText}>還沒有帳號？<Text style={styles.linkBold}>立即註冊</Text></Text>
          </TouchableOpacity>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF5F7' },
  inner: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 28 },
  logo: { fontSize: 80, marginBottom: 8 },
  title: { fontSize: 38, fontWeight: '800', color: '#FF6B9D', marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#888', marginBottom: 44 },
  input: {
    width: '100%', backgroundColor: '#fff', borderRadius: 14,
    paddingHorizontal: 18, paddingVertical: 14, marginBottom: 12,
    fontSize: 16, color: '#2D2D2D',
    shadowColor: '#FF6B9D', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
  },
  pwWrap: {
    width: '100%', flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14, marginBottom: 12,
    shadowColor: '#FF6B9D', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
  },
  pwInput: {
    flex: 1, paddingHorizontal: 18, paddingVertical: 14,
    fontSize: 16, color: '#2D2D2D',
  },
  eyeBtn: { paddingHorizontal: 14 },
  eyeIcon: { fontSize: 18 },
  btn: {
    width: '100%', backgroundColor: '#FF6B9D', borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginTop: 8,
    shadowColor: '#FF6B9D', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  linkWrap: { marginTop: 24 },
  linkText: { color: '#888', fontSize: 15 },
  linkBold: { color: '#FF6B9D', fontWeight: '600' },
});
