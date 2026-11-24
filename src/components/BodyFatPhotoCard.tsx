import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Card, Button, Chip, ActivityIndicator } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { useAppStore } from '../store';
import { theme, cardStyle } from '../theme';
import { estimateBodyFatFromPhoto, PhotoBodyFatEstimate } from '../services/bodyFatPhoto';

// 拍照估算体脂：所有来源里误差最大，融合时权重最低，仅作为趋势参考
export default function BodyFatPhotoCard() {
  const addBodyFatSample = useAppStore((s) => s.addBodyFatSample);
  const [loading, setLoading] = useState(false);
  const [estimate, setEstimate] = useState<PhotoBodyFatEstimate | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const runEstimate = async (uri: string) => {
    setPhotoUri(uri);
    setEstimate(null);
    setLoading(true);
    try {
      const result = await estimateBodyFatFromPhoto(uri);
      setEstimate(result);
    } catch (e) {
      Alert.alert('估算失败', e instanceof Error ? e.message : '请稍后重试');
      setPhotoUri(null);
    } finally {
      setLoading(false);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('需要权限', '请允许使用相机以拍摄身体照片');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled) return;
    const uri = result.assets[0]?.uri;
    if (uri) await runEstimate(uri);
  };

  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('需要权限', '请允许访问相册以选择照片');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled) return;
    const uri = result.assets[0]?.uri;
    if (uri) await runEstimate(uri);
  };

  const save = () => {
    if (!estimate) return;
    const date = new Date().toISOString().split('T')[0];
    addBodyFatSample({
      id: `bfs-${date}-photo`,
      date,
      value: estimate.bodyFat,
      source: 'photo',
      photoUri: photoUri ?? undefined,
      note: estimate.note,
      createdAt: Date.now(),
    });
    setEstimate(null);
    setPhotoUri(null);
    Alert.alert('已记录', `拍照估算 ${estimate.bodyFat}%，权重较低，仅作参考`);
  };

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.header}>
          <Text style={styles.title}>拍照估算（低权重）</Text>
          <Chip compact style={styles.chip} textStyle={styles.chipText}>仅供参考</Chip>
        </View>
        <Text style={styles.hint}>
          正面全身、自然站姿、光线充足时更准。照片估算误差较大，融合时只占很小的权重。
        </Text>

        <View style={styles.btnRow}>
          <Button
            mode="outlined"
            icon="camera"
            onPress={() => { void takePhoto(); }}
            style={styles.btn}
            disabled={loading}
            compact
          >
            拍照
          </Button>
          <Button
            mode="outlined"
            icon="image-multiple"
            onPress={() => { void pickFromLibrary(); }}
            style={styles.btn}
            disabled={loading}
            compact
          >
            相册
          </Button>
        </View>

        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.loadingText}>正在估算…</Text>
          </View>
        )}

        {estimate && !loading && (
          <View style={styles.result}>
            <View style={styles.resultMain}>
              <Text style={styles.resultValue}>{estimate.bodyFat.toFixed(1)}</Text>
              <Text style={styles.resultUnit}>%</Text>
              <Text style={styles.resultRange}>
                {estimate.low.toFixed(1)}–{estimate.high.toFixed(1)}%
              </Text>
            </View>
            <Text style={styles.resultMeta}>
              置信度 {Math.round(estimate.confidence * 100)}%
              {estimate.note ? ` · ${estimate.note}` : ''}
            </Text>
            <View style={styles.btnRow}>
              <Button mode="contained" onPress={save} style={styles.btn} compact>
                保存为拍照样本
              </Button>
              <Button
                mode="text"
                onPress={() => { setEstimate(null); setPhotoUri(null); }}
                style={styles.btn}
                compact
              >
                重拍
              </Button>
            </View>
          </View>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    ...cardStyle,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  chip: {
    backgroundColor: theme.colors.primaryLight,
    height: 24,
  },
  chipText: {
    fontSize: 11,
    color: theme.colors.primaryDark,
  },
  hint: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    lineHeight: 18,
    marginTop: 6,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  btn: {
    flex: 1,
    borderRadius: 10,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  loadingText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  result: {
    marginTop: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
  },
  resultMain: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  resultValue: {
    fontSize: 26,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  resultUnit: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginLeft: 3,
  },
  resultRange: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 10,
  },
  resultMeta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
    lineHeight: 17,
  },
});
