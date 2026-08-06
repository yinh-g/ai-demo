import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Text, TextInput, Button, Card, SegmentedButtons } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { login, register } from '../services/sync';
import { getSavedEmail } from '../services/auth';
import { isFirebaseConfigured } from '../services/firebase';

type Mode = 'login' | 'register';

interface Props {
  onLoginSuccess?: () => void;
}

function translateFirebaseError(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use': return '该邮箱已被注册';
    case 'auth/invalid-email': return '邮箱格式不正确';
    case 'auth/user-not-found': return '账号不存在';
    case 'auth/wrong-password': return '密码错误';
    case 'auth/too-many-requests': return '请求过于频繁，请稍后重试';
    case 'auth/operation-not-allowed': return '此登录方式未启用（请在 Firebase 控制台开启 Email/密码）';
    case 'auth/weak-password': return '密码过于简单（至少 6 位）';
    case 'auth/network-request-failed': return '网络异常，请检查连接';
    default: return code.replace('auth/', '');
  }
}

export default function LoginScreen({ onLoginSuccess }: Props) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    setConfigured(isFirebaseConfigured());
    // 恢复上次使用的邮箱
    getSavedEmail().then((e) => { if (e) setEmail(e); });
  }, []);

  const handleSubmit = async () => {
    setError('');
    if (!email.trim()) { setError('请输入邮箱'); return; }
    if (!password) { setError('请输入密码'); return; }
    if (mode === 'register') {
      if (password.length < 6) { setError('密码至少 6 位'); return; }
      if (password !== confirmPassword) { setError('两次密码不一致'); return; }
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password);
      }
      onLoginSuccess?.();
    } catch (e: any) {
      const code = e?.code || '';
      setError(translateFirebaseError(code) || e?.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  if (!configured) {
    return (
      <View style={styles.container}>
        <View style={styles.configNotice}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#F59E0B" />
          <Text style={styles.configTitle}>尚未配置 Firebase</Text>
          <Text style={styles.configText}>
            请在 app.json 的 expo.extra.firebase 中填入 Firebase 项目配置，{'\n'}
            然后重启 App。{'\n\n'}
            获取步骤：{'\n'}
            1. 打开 firebase.google.com 并登录账号{'\n'}
            2. 创建项目 → 添加 Web App{'\n'}
            3. 在"SDK 设置和配置 → npm"里复制 firebaseConfig{'\n'}
            4. 粘贴到 app.json 的 extra.firebase 对应字段{'\n'}
            5. Firebase 控制台 → Authentication → Sign-in method → 启用 Email/Password{'\n'}
            6. Firebase 控制台 → Firestore Database → 创建数据库 → 应用 firestore.rules
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <MaterialCommunityIcons name="cloud-sync-outline" size={64} color="#6366F1" />
          <Text style={styles.title}>云同步登录</Text>
          <Text style={styles.subtitle}>
            使用邮箱注册或登录，自动跨设备同步训练数据
          </Text>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <SegmentedButtons
              value={mode}
              onValueChange={(v) => { setMode(v as Mode); setError(''); }}
              buttons={[
                { value: 'login', label: '登录', disabled: loading },
                { value: 'register', label: '注册', disabled: loading },
              ]}
              style={styles.segment}
            />

            <TextInput
              label="邮箱"
              value={email}
              onChangeText={(t) => setEmail(t.trim())}
              placeholder="you@example.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={styles.input}
              mode="outlined"
              disabled={loading}
            />
            <TextInput
              label="密码"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
              mode="outlined"
              disabled={loading}
              placeholder={mode === 'register' ? '至少 6 位' : ''}
            />
            {mode === 'register' ? (
              <TextInput
                label="确认密码"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                style={styles.input}
                mode="outlined"
                disabled={loading}
              />
            ) : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button
              mode="contained"
              onPress={handleSubmit}
              style={styles.button}
              loading={loading}
              disabled={loading}
            >
              {loading
                ? (mode === 'login' ? '登录中...' : '注册中...')
                : (mode === 'login' ? '登录' : '创建账号')}
            </Button>

            {mode === 'login' ? (
              <Text style={styles.tip}>
                忘记密码？可使用 Firebase 控制台重置密码，App 端重置密码功能后续更新。
              </Text>
            ) : null}
          </Card.Content>
        </Card>

        <Card style={styles.helpCard}>
          <Card.Content>
            <Text style={styles.helpTitle}>数据说明</Text>
            <Text style={styles.helpStep}>• 邮箱仅用于登录，不会发送推广邮件</Text>
            <Text style={styles.helpStep}>• 注册后，本地训练数据会自动同步到云端</Text>
            <Text style={styles.helpStep}>• 在其他设备用同一邮箱登录即可恢复数据</Text>
            <Text style={styles.helpStep}>• 密码采用 Firebase 行业标准加密存储</Text>
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 6,
    textAlign: 'center',
  },
  card: {
    borderRadius: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  segment: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  error: {
    color: '#EF4444',
    fontSize: 13,
    marginBottom: 8,
  },
  button: {
    marginTop: 8,
    borderRadius: 8,
    paddingVertical: 4,
  },
  tip: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 10,
    fontStyle: 'italic',
  },
  helpCard: {
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    elevation: 0,
  },
  helpTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  helpStep: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 4,
  },
  configNotice: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  configTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  configText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
    textAlign: 'left',
  },
});
