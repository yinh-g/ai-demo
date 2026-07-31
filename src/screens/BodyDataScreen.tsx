import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, TextInput, Chip } from 'react-native-paper';
import { useAppStore } from '../store';
import { UserProfile } from '../types';

export default function BodyDataScreen({ navigation }: any) {
  const { userProfile, setUserProfile } = useAppStore();
  
  const [formData, setFormData] = useState({
    weight: '',
    height: '',
    bodyFat: '',
    age: '',
    gender: 'male' as 'male' | 'female',
    trainingYears: '',
    proteinIntake: '',
    sleepHours: '',
    muscleGainGoal: '',
  });

  useEffect(() => {
    if (userProfile) {
      setFormData({
        weight: userProfile.weight.toString(),
        height: userProfile.height?.toString() || '',
        bodyFat: userProfile.bodyFat?.toString() || '',
        age: userProfile.age.toString(),
        gender: userProfile.gender,
        trainingYears: userProfile.trainingYears.toString(),
        proteinIntake: userProfile.proteinIntake.toString(),
        sleepHours: userProfile.sleepHours.toString(),
        muscleGainGoal: userProfile.muscleGainGoal?.toString() || '',
      });
    }
  }, [userProfile]);

  const handleSave = () => {
    const profile: UserProfile = {
      id: userProfile?.id || Date.now().toString(),
      weight: parseFloat(formData.weight) || 70,
      height: formData.height ? parseFloat(formData.height) : undefined,
      bodyFat: formData.bodyFat ? parseFloat(formData.bodyFat) : undefined,
      age: parseInt(formData.age) || 25,
      gender: formData.gender,
      trainingYears: parseFloat(formData.trainingYears) || 0,
      proteinIntake: parseFloat(formData.proteinIntake) || 1.6,
      sleepHours: parseFloat(formData.sleepHours) || 7,
      muscleGainGoal: formData.muscleGainGoal ? parseFloat(formData.muscleGainGoal) : undefined,
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
    <ScrollView style={styles.container}>
      <Text style={styles.title}>📏 身体数据</Text>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>基础信息</Text>
          <TextInput
            label="体重 (kg) *"
            value={formData.weight}
            onChangeText={text => setFormData({ ...formData, weight: text })}
            keyboardType="numeric"
            style={styles.input}
          />
          <TextInput
            label="身高 (cm)"
            value={formData.height}
            onChangeText={text => setFormData({ ...formData, height: text })}
            keyboardType="numeric"
            style={styles.input}
          />
          <TextInput
            label="体脂率 (%)"
            value={formData.bodyFat}
            onChangeText={text => setFormData({ ...formData, bodyFat: text })}
            keyboardType="numeric"
            style={styles.input}
          />
          <TextInput
            label="年龄 (岁) *"
            value={formData.age}
            onChangeText={text => setFormData({ ...formData, age: text })}
            keyboardType="numeric"
            style={styles.input}
          />
          
          <Text style={styles.label}>性别 *</Text>
          <View style={styles.genderContainer}>
            <Chip
              selected={formData.gender === 'male'}
              onPress={() => setFormData({ ...formData, gender: 'male' })}
              style={styles.genderChip}
            >
              👨 男性
            </Chip>
            <Chip
              selected={formData.gender === 'female'}
              onPress={() => setFormData({ ...formData, gender: 'female' })}
              style={styles.genderChip}
            >
              👩 女性
            </Chip>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>训练信息</Text>
          <TextInput
            label="训练年限 (年) *"
            value={formData.trainingYears}
            onChangeText={text => setFormData({ ...formData, trainingYears: text })}
            keyboardType="numeric"
            style={styles.input}
          />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>营养与恢复</Text>
          <TextInput
            label="蛋白质摄入 (g/kg/天) *"
            value={formData.proteinIntake}
            onChangeText={text => setFormData({ ...formData, proteinIntake: text })}
            keyboardType="numeric"
            style={styles.input}
          />
          <TextInput
            label="平均睡眠时长 (小时) *"
            value={formData.sleepHours}
            onChangeText={text => setFormData({ ...formData, sleepHours: text })}
            keyboardType="numeric"
            style={styles.input}
          />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>增肌目标</Text>
          <TextInput
            label="目标增肌量 (kg)"
            value={formData.muscleGainGoal}
            onChangeText={text => setFormData({ ...formData, muscleGainGoal: text })}
            keyboardType="numeric"
            style={styles.input}
          />
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        onPress={handleSave}
        disabled={!isValid()}
        style={styles.saveButton}
      >
        保存
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 15,
    marginLeft: 5,
  },
  card: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  input: {
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  genderContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  genderChip: {
    marginRight: 10,
    flex: 1,
  },
  saveButton: {
    marginVertical: 20,
  },
});
