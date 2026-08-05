import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Linking,
} from 'react-native';
import { Text, TextInput, Button, Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { login } from '../services/sync';

interface Props {
  onLoginSuccess?: () => void;
}

export default function LoginScreen({ onLoginSuccess }: Props) {
  const [pat, setPat] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    if (!pat.trim()) {
      setError('请输入 GitHub Token');
      return;
    }
    setLoading(true);
    try {
      await login(pat);
      onLoginSuccess?.();
    } catch (e: any) {
      setError(e?.message || '登录失败，请检查 Token');
    } finally {
      setLoading(false);
    }
  };

  const openTokenPage = () => {
    Linking.openURL('https://github.com/settings/tokens/new?scopes=gist&description=fittrack-sync');
  };

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
            使用 GitHub Personal Access Token 启用跨设备同步
          </Text>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <TextInput
              label="GitHub Token"
              value={pat}
              onChangeText={setPat}
              placeholder="ghp_xxxxxxxxxxxx"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
              mode="outlined"
              disabled={loading}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button
              mode="contained"
              onPress={handleLogin}
              style={styles.button}
              loading={loading}
              disabled={loading}
            >
              {loading ? '登录中...' : '登录'}
            </Button>
          </Card.Content>
        </Card>

        <Card style={styles.helpCard}>
          <Card.Content>
            <Text style={styles.helpTitle}>如何获取 Token？</Text>
            <Text style={styles.helpStep}>1. 点击下方按钮打开 GitHub Token 页面</Text>
            <Text style={styles.helpStep}>2. Note 填写 fittrack-sync</Text>
            <Text style={styles.helpStep}>3. Expiration 建议选 90 天</Text>
            <Text style={styles.helpStep}>4. Scopes 只勾选 gist</Text>
            <Text style={styles.helpStep}>5. 生成后复制 Token 粘贴到上方</Text>
            <Button
              mode="text"
              onPress={openTokenPage}
              style={styles.helpButton}
              icon="open-in-new"
            >
              打开 GitHub Token 页面
            </Button>
            <Text style={styles.helpNote}>
              Token 仅存储在本机加密区（SecureStore），不会上传到任何第三方服务器。
            </Text>
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
  helpButton: {
    marginTop: 8,
    marginLeft: -8,
  },
  helpNote: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
