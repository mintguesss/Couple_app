import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Link } from 'expo-router';
import { register } from '@/services/authService';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password || !confirm) {
      Alert.alert('提示', '請填寫所有欄位');
      return;
    }
    if (password.length < 6) {
      Alert.alert('提示', '密碼至少需要 6 個字元');
      return;
    }
    if (password !== confirm) {
      Alert.alert('提示', '兩次密碼不一致');
      return;
    }
    setLoading(true);
    try {
      await register(email.trim(), password, name.trim());
    } catch (e: any) {
      const msg = e.code === 'auth/email-already-in-use'
        ? '此信箱已被註冊'
        : '註冊失敗，請再試一次';
      Alert.alert('錯誤', msg);
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
        <Text style={styles.logo}>🌸</Text>
        <Text style={styles.title}>建立帳號</Text>
        <Text style={styles.subtitle}>開始你們的專屬空間</Text>

        <TextInput
          style={styles.input}
          placeholder="你的名字（顯示給對方看）"
          placeholderTextColor="#BBBBBB"
          value={name}
          onChangeText={setName}
          returnKeyType="next"
        />
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
            placeholder="密碼（至少 6 個字元）"
            placeholderTextColor="#BBBBBB"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPw}
            returnKeyType="next"
          />
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPw(v => !v)}>
            <Text style={styles.eyeIcon}>{showPw ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.pwWrap}>
          <TextInput
            style={styles.pwInput}
            placeholder="確認密碼"
            placeholderTextColor="#BBBBBB"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry={!showConfirm}
            returnKeyType="done"
            onSubmitEditing={handleRegister}
          />
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirm(v => !v)}>
            <Text style={styles.eyeIcon}>{showConfirm ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={loading}>
          <Text style={styles.btnText}>{loading ? '建立中...' : '建立帳號'}</Text>
        </TouchableOpacity>

        <Link href="/(auth)/login" asChild>
          <TouchableOpacity style={styles.linkWrap}>
            <Text style={styles.linkText}>已有帳號？<Text style={styles.linkBold}>登入</Text></Text>
          </TouchableOpacity>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF5F7' },
  inner: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 28 },
  logo: { fontSize: 72, marginBottom: 8 },
  title: { fontSize: 32, fontWeight: '800', color: '#FF6B9D', marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#888', marginBottom: 36 },
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
