import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Modal, Text, Button, TextInput, IconButton } from 'react-native-paper';
import { theme } from '../theme';
import { normalizeBarcode } from '../services/food/barcodeLookup';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onDetected: (code: string) => void;
}

// 扫码对话框：相机扫码为主，手动输码兜底（无相机权限 / 条码磨损时使用）
export default function BarcodeScanDialog({ visible, onDismiss, onDetected }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [paused, setPaused] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [hint, setHint] = useState('把条形码放进框内，识别后自动查询');

  useEffect(() => {
    if (visible) {
      setPaused(false);
      setManualCode('');
      setHint('把条形码放进框内，识别后自动查询');
    }
  }, [visible]);

  const submit = (raw: string) => {
    const code = normalizeBarcode(raw);
    if (!code) {
      setHint('条码需为 8-14 位数字，请重新对准或手动输入');
      setPaused(false);
      return;
    }
    setPaused(true);
    onDetected(code);
  };

  const handleScanned = (result: { data: string }) => {
    if (paused) return;
    submit(result.data);
  };

  return (
    <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modal}>
      <View style={styles.header}>
        <Text style={styles.title}>扫食品条形码</Text>
        <IconButton icon="close" size={20} iconColor={theme.colors.textSecondary} onPress={onDismiss} style={{ margin: 0 }} />
      </View>

      <View style={styles.cameraWrap}>
        {permission?.granted && visible ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{
              // ean13 已覆盖 UPC-A（以 0 开头），iOS 不支持 upc_a 类型
              barcodeTypes: ['ean13', 'ean8', 'upc_e', 'code128', 'itf14'],
            }}
            onBarcodeScanned={paused ? undefined : handleScanned}
          />
        ) : (
          <View style={styles.permissionBox}>
            <IconButton icon="barcode-off" size={36} iconColor="#fff" />
            <Text style={styles.permissionText}>
              {permission && !permission.canAskAgain
                ? '相机权限已被拒绝，请到系统设置中开启'
                : '需要相机权限才能扫码'}
            </Text>
            {permission?.canAskAgain !== false && (
              <Button mode="contained" compact onPress={() => { void requestPermission(); }} style={styles.permissionBtn}>
                允许使用相机
              </Button>
            )}
          </View>
        )}

        <View pointerEvents="none" style={styles.frameLayer}>
          <View style={styles.scanFrame} />
        </View>
      </View>

      <Text style={styles.hint}>{hint}</Text>

      <Text style={styles.manualLabel}>或者手动输入条码</Text>
      <View style={styles.manualRow}>
        <TextInput
          value={manualCode}
          onChangeText={setManualCode}
          mode="outlined"
          keyboardType="numeric"
          placeholder="例如 6901234567892"
          style={styles.manualInput}
          dense
          outlineColor={theme.colors.border}
          activeOutlineColor={theme.colors.primary}
        />
        <Button mode="contained" compact onPress={() => submit(manualCode)} style={styles.manualBtn}>
          查询
        </Button>
      </View>

      <Text style={styles.footnote}>
        只支持包装食品的条码（EAN/UPC）。国内商品收录率有限，查不到时可以改用拍照识别或文字描述
      </Text>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  cameraWrap: {
    height: 280,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    marginTop: 8,
  },
  permissionBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  permissionText: {
    color: '#fff',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  permissionBtn: {
    marginTop: 12,
    borderRadius: 10,
  },
  frameLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 240,
    height: 140,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    borderRadius: 12,
  },
  hint: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 10,
  },
  manualLabel: {
    fontSize: 13,
    color: theme.colors.text,
    marginTop: 14,
    marginBottom: 8,
  },
  manualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  manualInput: {
    flex: 1,
    backgroundColor: '#fff',
  },
  manualBtn: {
    borderRadius: 10,
  },
  footnote: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    marginTop: 10,
    lineHeight: 16,
  },
});
