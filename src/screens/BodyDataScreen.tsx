import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, Alert } from 'react-native';
import { Text, Card, Button, TextInput, Chip, Avatar } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { useAppStore } from '../store';
import { UserProfile } from '../types';

export default function BodyDataScreen({ navigation }: any) {
  const { userProfile, setUserProfile } = useAppStore();

  const avatarColors = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#3B82F6', '#14B8A6'];

  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nickname: '',
    avatarColor: '#6366F1',
    weight: '',
    height: '',
    bodyFat: '',
    age: '',
    gender: 'male' as 'male' | 'female',
    trainingYears: '',
    proteinIntake: '',
    sleepHours: '',
    muscleGainGoal: '',
    dailyCalorieIntake: '',
    fatLossGoal: '',
    targetBodyFat: '',
  });

  useEffect(() => {
    if (userProfile) {
      setAvatarUri(userProfile.avatarUri || null);
      setFormData({
        nickname: userProfile.nickname || '',
        avatarColor: userProfile.avatarColor || '#6366F1',
        weight: userProfile.weight.toString(),
        height: userProfile.height?.toString() || '',
        bodyFat: userProfile.bodyFat?.toString() || '',
        age: userProfile.age.toString(),
        gender: userProfile.gender,
        trainingYears: userProfile.trainingYears.toString(),
        proteinIntake: userProfile.proteinIntake.toString(),
        sleepHours: userProfile.sleepHours.toString(),
        muscleGainGoal: userProfile.muscleGainGoal?.toString() || '',
        dailyCalorieIntake: userProfile.dailyCalorieIntake?.toString() || '',
        fatLossGoal: userProfile.fatLossGoal?.toString() || '',
        targetBodyFat: userProfile.targetBodyFat?.toString() || '',
      });
    }
  }, [userProfile]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('需要权限', '请允许访问相册以选择头像');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleSave = () => {
    const profile: UserProfile = {
      id: userProfile?.id || Date.now().toString(),
      nickname: formData.nickname.trim() || undefined,
      avatarColor: formData.avatarColor,
      avatarUri: avatarUri || undefined,
      weight: parseFloat(formData.weight) || 70,
      height: formData.height ? parseFloat(formData.height) : undefined,
      bodyFat: formData.bodyFat ? parseFloat(formData.bodyFat) : undefined,
      age: parseInt(formData.age) || 25,
      gender: formData.gender,
      trainingYears: parseFloat(formData.trainingYears) || 0,
      proteinIntake: parseFloat(formData.proteinIntake) || 1.6,
      sleepHours: parseFloat(formData.sleepHours) || 7,
      muscleGainGoal: formData.muscleGainGoal ? parseFloat(formData.muscleGainGoal) : undefined,
      dailyCalorieIntake: formData.dailyCalorieIntake ? parseFloat(formData.dailyCalorieIntake) : undefined,
      fatLossGoal: formData.fatLossGoal ? parseFloat(formData.fatLossGoal) : undefined,
      targetBodyFat: formData.targetBodyFat ? parseFloat(formData.targetBodyFat) : undefined,
      createdAt: userProfile?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
    setUserProfile(profile);
    navigation.goBack();
  };

  const isValid = () => {
    return formData.weight && formData.age && formData.trainingYears && formData.proteinIntake && formData.sleepHours;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Avatar.Icon size={36} icon="account-details" style={styles.headerIcon} color="#6366F1" />
        <Text style={styles.title}>身体数据</Text>
      </View>

      {/* 头像和昵称 */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Avatar.Icon size={18} icon="account-circle" style={styles.sectionIcon} color="#6366F1" />
            <Text style={styles.sectionTitle}>个人资料</Text>
          </View>

          <View style={styles.avatarPreviewRow}>
            <View style={styles.avatarWrapper} onTouchEnd={pickImage}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarPreview, { backgroundColor: formData.avatarColor }]}>
                  <Text style={styles.avatarLetter}>
                    {(formData.nickname || '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.avatarEditBadge}>
                <Avatar.Icon size={16} icon="camera" style={{ backgroundColor: 'transparent' }} color="#fff" />
              </View>
            </View>
            <TextInput
              label="昵称"
              value={formData.nickname}
              onChangeText={text => setFormData({ ...formData, nickname: text })}
              style={[styles.input, styles.nicknameInput]}
              mode="outlined"
              outlineColor="#E2E8F0"
              activeOutlineColor="#6366F1"
              placeholder="输入你的昵称"
              left={<TextInput.Icon icon="rename-box" color="#94A3B8" />}
            />
          </View>

          <Text style={styles.colorLabel}>头像颜色</Text>
          <View style={styles.colorPicker}>
            {avatarColors.map(color => (
              <View
                key={color}
                style={[
                  styles.colorOption,
                  { backgroundColor: color },
                  formData.avatarColor === color && styles.colorOptionActive
                ]}
                onTouchEnd={() => setFormData({ ...formData, avatarColor: color })}
              >
                {formData.avatarColor === color && (
                  <Avatar.Icon size={16} icon="check" style={{ backgroundColor: 'transparent' }} color="#fff" />
                )}
              </View>
            ))}
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Avatar.Icon size={18} icon="account" style={styles.sectionIcon} color="#6366F1" />
            <Text style={styles.sectionTitle}>基础信息</Text>
          </View>
          <TextInput
            label="体重 (kg) *"
            value={formData.weight}
            onChangeText={text => setFormData({ ...formData, weight: text })}
            keyboardType="numeric"
            style={styles.input}
            mode="outlined"
            outlineColor="#E2E8F0"
            activeOutlineColor="#6366F1"
            left={<TextInput.Icon icon="weight-kilogram" color="#94A3B8" />}
          />
          <TextInput
            label="身高 (cm)"
            value={formData.height}
            onChangeText={text => setFormData({ ...formData, height: text })}
            keyboardType="numeric"
            style={styles.input}
            mode="outlined"
            outlineColor="#E2E8F0"
            activeOutlineColor="#6366F1"
            left={<TextInput.Icon icon="human-male-height" color="#94A3B8" />}
          />
          <TextInput
            label="体脂率 (%)"
            value={formData.bodyFat}
            onChangeText={text => setFormData({ ...formData, bodyFat: text })}
            keyboardType="numeric"
            style={styles.input}
            mode="outlined"
            outlineColor="#E2E8F0"
            activeOutlineColor="#6366F1"
            left={<TextInput.Icon icon="percent" color="#94A3B8" />}
          />
          <TextInput
            label="年龄 (岁) *"
            value={formData.age}
            onChangeText={text => setFormData({ ...formData, age: text })}
            keyboardType="numeric"
            style={styles.input}
            mode="outlined"
            outlineColor="#E2E8F0"
            activeOutlineColor="#6366F1"
            left={<TextInput.Icon icon="calendar" color="#94A3B8" />}
          />

          <Text style={styles.label}>性别 *</Text>
          <View style={styles.genderContainer}>
            <Chip
              selected={formData.gender === 'male'}
              onPress={() => setFormData({ ...formData, gender: 'male' })}
              style={[styles.genderChip, formData.gender === 'male' && styles.genderChipActive]}
              selectedColor="#6366F1"
              avatar={<Avatar.Icon size={20} icon="face-man" style={{ backgroundColor: 'transparent' }} color="#6366F1" />}
            >
              男性
            </Chip>
            <Chip
              selected={formData.gender === 'female'}
              onPress={() => setFormData({ ...formData, gender: 'female' })}
              style={[styles.genderChip, formData.gender === 'female' && styles.genderChipActive]}
              selectedColor="#EC4899"
              avatar={<Avatar.Icon size={20} icon="face-woman" style={{ backgroundColor: 'transparent' }} color="#EC4899" />}
            >
              女性
            </Chip>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Avatar.Icon size={18} icon="dumbbell" style={styles.sectionIcon} color="#10B981" />
            <Text style={styles.sectionTitle}>训练信息</Text>
          </View>
          <TextInput
            label="训练年限 (年) *"
            value={formData.trainingYears}
            onChangeText={text => setFormData({ ...formData, trainingYears: text })}
            keyboardType="numeric"
            style={styles.input}
            mode="outlined"
            outlineColor="#E2E8F0"
            activeOutlineColor="#6366F1"
            left={<TextInput.Icon icon="calendar-clock" color="#94A3B8" />}
          />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Avatar.Icon size={18} icon="food-apple" style={styles.sectionIcon} color="#F59E0B" />
            <Text style={styles.sectionTitle}>营养与恢复</Text>
          </View>
          <TextInput
            label="蛋白质摄入 (g/kg/天) *"
            value={formData.proteinIntake}
            onChangeText={text => setFormData({ ...formData, proteinIntake: text })}
            keyboardType="numeric"
            style={styles.input}
            mode="outlined"
            outlineColor="#E2E8F0"
            activeOutlineColor="#6366F1"
            left={<TextInput.Icon icon="food-steak" color="#94A3B8" />}
          />
          <TextInput
            label="平均睡眠时长 (小时) *"
            value={formData.sleepHours}
            onChangeText={text => setFormData({ ...formData, sleepHours: text })}
            keyboardType="numeric"
            style={styles.input}
            mode="outlined"
            outlineColor="#E2E8F0"
            activeOutlineColor="#6366F1"
            left={<TextInput.Icon icon="sleep" color="#94A3B8" />}
          />
          <TextInput
            label="日均摄入卡路里 (kcal)"
            value={formData.dailyCalorieIntake}
            onChangeText={text => setFormData({ ...formData, dailyCalorieIntake: text })}
            keyboardType="numeric"
            style={styles.input}
            mode="outlined"
            outlineColor="#E2E8F0"
            activeOutlineColor="#6366F1"
            left={<TextInput.Icon icon="food" color="#94A3B8" />}
          />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Avatar.Icon size={18} icon="target" style={styles.sectionIcon} color="#EF4444" />
            <Text style={styles.sectionTitle}>目标设定</Text>
          </View>
          <TextInput
            label="目标增肌量 (kg)"
            value={formData.muscleGainGoal}
            onChangeText={text => setFormData({ ...formData, muscleGainGoal: text })}
            keyboardType="numeric"
            style={styles.input}
            mode="outlined"
            outlineColor="#E2E8F0"
            activeOutlineColor="#6366F1"
            left={<TextInput.Icon icon="trending-up" color="#94A3B8" />}
          />
          <TextInput
            label="目标减脂量 (kg)"
            value={formData.fatLossGoal}
            onChangeText={text => setFormData({ ...formData, fatLossGoal: text })}
            keyboardType="numeric"
            style={styles.input}
            mode="outlined"
            outlineColor="#E2E8F0"
            activeOutlineColor="#6366F1"
            left={<TextInput.Icon icon="fire" color="#94A3B8" />}
          />
          <TextInput
            label="目标体脂率 (%)"
            value={formData.targetBodyFat}
            onChangeText={text => setFormData({ ...formData, targetBodyFat: text })}
            keyboardType="numeric"
            style={styles.input}
            mode="outlined"
            outlineColor="#E2E8F0"
            activeOutlineColor="#6366F1"
            left={<TextInput.Icon icon="percent" color="#94A3B8" />}
          />
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        onPress={handleSave}
        disabled={!isValid()}
        style={styles.saveButton}
        labelStyle={styles.saveButtonLabel}
        icon="content-save"
      >
        保存
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingTop: 4,
  },
  headerIcon: {
    backgroundColor: '#EEF2FF',
    marginRight: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  card: {
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionIcon: {
    backgroundColor: 'transparent',
    marginRight: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  input: {
    backgroundColor: '#fff',
    marginBottom: 10,
    fontSize: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 6,
    marginBottom: 8,
    color: '#1E293B',
  },
  genderContainer: {
    flexDirection: 'row',
    marginBottom: 6,
    gap: 10,
  },
  genderChip: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  genderChipActive: {
    backgroundColor: '#EEF2FF',
  },
  saveButton: {
    marginVertical: 20,
    borderRadius: 12,
    backgroundColor: '#6366F1',
    paddingVertical: 4,
  },
  saveButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  avatarPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  avatarWrapper: {
    position: 'relative',
    width: 56,
    height: 56,
  },
  avatarPreview: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarLetter: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  nicknameInput: {
    flex: 1,
    backgroundColor: '#fff',
    marginBottom: 0,
  },
  colorLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
    marginBottom: 10,
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorOptionActive: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});
