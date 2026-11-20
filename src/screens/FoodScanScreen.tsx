import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Image, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Text, Card, Button, Chip, TextInput, IconButton, Divider } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { useAppStore } from '../store';
import { theme, cardStyle, pagePadding } from '../theme';
import { analyzeFoodPhoto, sumNutrition } from '../services/food/analyzeFood';
import { FoodItem, FoodLog, MealType } from '../types';

const MEAL_OPTIONS: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: '早餐' },
  { value: 'lunch', label: '午餐' },
  { value: 'dinner', label: '晚餐' },
  { value: 'snack', label: '加餐' },
];

// 按当前时间推断默认餐次
function inferMealType(): MealType {
  const h = new Date().getHours();
  if (h < 10) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 21) return 'dinner';
  return 'snack';
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export default function FoodScanScreen({ navigation }: any) {
  const addFoodLog = useAppStore((s) => s.addFoodLog);

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [items, setItems] = useState<FoodItem[]>([]);
  const [amountTexts, setAmountTexts] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [mealType, setMealType] = useState<MealType>(inferMealType());
  const [error, setError] = useState<string | null>(null);

  const runAnalyze = async (uri: string) => {
    setAnalyzing(true);
    setError(null);
    setItems([]);
    setNote('');
    try {
      const result = await analyzeFoodPhoto(uri);
      setItems(result.items);
      setAmountTexts(result.items.map((i) => String(i.amount)));
      setNote(result.note || '');
    } catch (e) {
      setError(e instanceof Error ? e.message : '识别失败，请重试');
    } finally {
      setAnalyzing(false);
    }
  };

  const handlePicked = (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled) return;
    const uri = result.assets[0]?.uri;
    if (!uri) return;
    setPhotoUri(uri);
    runAnalyze(uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('需要权限', '请允许使用相机以拍摄食物照片');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    handlePicked(result);
  };

  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('需要权限', '请允许访问相册以选择食物照片');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    handlePicked(result);
  };

  // 提交份量修改：按新旧份量比例缩放该条目的营养值
  const commitAmount = (index: number, text: string) => {
    const newAmount = parseFloat(text);
    if (!Number.isFinite(newAmount) || newAmount <= 0) {
      // 非法输入：恢复原值
      setAmountTexts((prev) => prev.map((t, i) => (i === index ? String(items[index].amount) : t)));
      return;
    }
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const ratio = item.amount > 0 ? newAmount / item.amount : 1;
        return {
          ...item,
          amount: newAmount,
          calories: Math.round(item.calories * ratio),
          protein: item.protein !== undefined ? round1(item.protein * ratio) : undefined,
          carbs: item.carbs !== undefined ? round1(item.carbs * ratio) : undefined,
          fat: item.fat !== undefined ? round1(item.fat * ratio) : undefined,
        };
      })
    );
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    setAmountTexts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (items.length === 0) {
      Alert.alert('提示', '没有可保存的食物');
      return;
    }
    const total = sumNutrition(items);
    const now = Date.now();
    const log: FoodLog = {
      id: now.toString(),
      date: new Date().toISOString().split('T')[0],
      mealType,
      items,
      total: {
        calories: Math.round(total.calories),
        protein: round1(total.protein),
        carbs: round1(total.carbs),
        fat: round1(total.fat),
      },
      source: 'ai',
      createdAt: now,
      updatedAt: now,
    };
    addFoodLog(log);
    navigation.goBack();
  };

  const total = sumNutrition(items);
  const hasResult = items.length > 0;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[pagePadding, { paddingTop: 12 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 照片区域 */}
        <Card style={styles.card}>
          <Card.Content>
            {photoUri ? (
              <TouchableOpacity activeOpacity={0.8} onPress={takePhoto}>
                <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
                <View style={styles.repickBadge}>
                  <IconButton icon="camera-retake" size={18} iconColor="#fff" style={{ margin: 0 }} />
                  <Text style={styles.repickText}>重新拍摄</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.placeholder}>
                <IconButton icon="food-apple-outline" size={48} iconColor={theme.colors.primary} />
                <Text style={styles.placeholderTitle}>拍照识别食物热量</Text>
                <Text style={styles.placeholderHint}>尽量让食物占满画面、光线充足</Text>
              </View>
            )}

            <View style={styles.actionRow}>
              <Button
                mode="contained"
                icon="camera"
                onPress={takePhoto}
                style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
                labelStyle={styles.actionLabel}
              >
                拍照
              </Button>
              <Button
                mode="outlined"
                icon="image-multiple"
                onPress={pickFromLibrary}
                style={styles.actionButton}
                textColor={theme.colors.primary}
                labelStyle={styles.actionLabel}
              >
                相册选择
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* 识别中 */}
        {analyzing && (
          <Card style={styles.card}>
            <Card.Content style={styles.centerBox}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.analyzingText}>正在识别食物…</Text>
              <Text style={styles.analyzingHint}>通常需要 3-8 秒</Text>
            </Card.Content>
          </Card>
        )}

        {/* 识别失败 */}
        {!!error && !analyzing && (
          <Card style={styles.card}>
            <Card.Content style={styles.centerBox}>
              <IconButton icon="alert-circle-outline" size={40} iconColor={theme.colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
              {photoUri && (
                <Button mode="text" onPress={() => runAnalyze(photoUri)} textColor={theme.colors.primary}>
                  重试
                </Button>
              )}
            </Card.Content>
          </Card>
        )}

        {/* 识别结果 */}
        {hasResult && !analyzing && (
          <>
            <Card style={styles.card}>
              <Card.Content>
                <Text style={styles.sectionTitle}>选择餐次</Text>
                <View style={styles.chipRow}>
                  {MEAL_OPTIONS.map((opt) => (
                    <Chip
                      key={opt.value}
                      selected={mealType === opt.value}
                      onPress={() => setMealType(opt.value)}
                      style={[styles.chip, mealType === opt.value && styles.chipActive]}
                      selectedColor="#fff"
                      textStyle={{ color: mealType === opt.value ? '#fff' : theme.colors.textSecondary }}
                    >
                      {opt.label}
                    </Chip>
                  ))}
                </View>
              </Card.Content>
            </Card>

            <Card style={styles.card}>
              <Card.Content>
                <View style={styles.resultHeader}>
                  <Text style={styles.sectionTitle}>识别结果</Text>
                  <Text style={styles.resultHint}>份量可修改</Text>
                </View>

                {items.map((item, index) => (
                  <View key={`${item.name}-${index}`}>
                    {index > 0 && <Divider style={styles.divider} />}
                    <View style={styles.itemRow}>
                      <View style={styles.itemInfo}>
                        <View style={styles.itemNameRow}>
                          <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                          {item.confidence < 0.6 && (
                            <Chip compact style={styles.lowConfChip} textStyle={styles.lowConfText}>
                              待确认
                            </Chip>
                          )}
                        </View>
                        <Text style={styles.itemMeta}>
                          {item.calories} kcal
                          {item.protein !== undefined && ` · 蛋白 ${item.protein}g`}
                        </Text>
                      </View>

                      <View style={styles.itemAmount}>
                        <TextInput
                          value={amountTexts[index] ?? String(item.amount)}
                          onChangeText={(t) =>
                            setAmountTexts((prev) => prev.map((v, i) => (i === index ? t : v)))
                          }
                          onEndEditing={() => commitAmount(index, amountTexts[index] ?? String(item.amount))}
                          keyboardType="numeric"
                          mode="outlined"
                          dense
                          style={styles.amountInput}
                          outlineColor={theme.colors.border}
                          activeOutlineColor={theme.colors.primary}
                        />
                        <Text style={styles.unitText}>{item.unit}</Text>
                        <IconButton
                          icon="close-circle-outline"
                          size={20}
                          iconColor={theme.colors.textTertiary}
                          onPress={() => removeItem(index)}
                          style={{ margin: 0 }}
                        />
                      </View>
                    </View>
                  </View>
                ))}

                {!!note && <Text style={styles.note}>{note}</Text>}
              </Card.Content>
            </Card>

            {/* 营养汇总 */}
            <Card style={[styles.card, styles.summaryCard]}>
              <Card.Content>
                <View style={styles.summaryTop}>
                  <Text style={styles.summaryLabel}>本餐合计</Text>
                  <Text style={styles.summaryCalories}>{Math.round(total.calories)} kcal</Text>
                </View>
                <View style={styles.macroRow}>
                  <Text style={styles.macroText}>蛋白 {round1(total.protein)}g</Text>
                  <Text style={styles.macroText}>碳水 {round1(total.carbs)}g</Text>
                  <Text style={styles.macroText}>脂肪 {round1(total.fat)}g</Text>
                </View>
              </Card.Content>
            </Card>

            <Button
              mode="contained"
              icon="check"
              onPress={handleSave}
              style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
              labelStyle={styles.saveLabel}
            >
              保存记录
            </Button>
          </>
        )}

        <Text style={styles.disclaimer}>
          热量与份量为 AI 估算值，仅供参考，实际请以称重或包装标签为准。
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: {
    flex: 1,
  },
  card: {
    ...cardStyle,
    marginBottom: 12,
  },
  preview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: theme.colors.border,
  },
  repickBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 16,
    paddingRight: 10,
  },
  repickText: {
    color: '#fff',
    fontSize: 12,
  },
  placeholder: {
    height: 200,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: theme.colors.border,
    backgroundColor: '#FBFCFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 4,
  },
  placeholderHint: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  actionButton: {
    flex: 1,
    borderRadius: 10,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  centerBox: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  analyzingText: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  analyzingHint: {
    marginTop: 4,
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  errorText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: theme.colors.primaryLight,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultHint: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  divider: {
    backgroundColor: theme.colors.border,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  itemInfo: {
    flex: 1,
    marginRight: 8,
  },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    flexShrink: 1,
  },
  lowConfChip: {
    backgroundColor: '#FEF3C7',
    height: 20,
  },
  lowConfText: {
    fontSize: 10,
    color: '#B45309',
    marginVertical: 0,
  },
  itemMeta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 3,
  },
  itemAmount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountInput: {
    width: 68,
    height: 38,
    backgroundColor: '#fff',
  },
  unitText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginHorizontal: 4,
  },
  note: {
    marginTop: 10,
    fontSize: 12,
    color: theme.colors.textTertiary,
    fontStyle: 'italic',
  },
  summaryCard: {
    backgroundColor: theme.colors.primaryLight,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  summaryCalories: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  macroRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  macroText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  saveButton: {
    borderRadius: 12,
    paddingVertical: 4,
  },
  saveLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  disclaimer: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 8,
    lineHeight: 16,
  },
});
