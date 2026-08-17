import React, { useState } from 'react';
import { View, StyleSheet, FlatList, ScrollView, TextInput as NativeTextInput } from 'react-native';
import { Text, Card, Button, TextInput, Chip, Portal, Dialog, IconButton, Avatar } from 'react-native-paper';
import { useAppStore } from '../store';
import { Exercise, PlanExercise } from '../types';
import { categoryLabels } from '../data/defaultExercises';

export default function CreatePlanScreen({ navigation, route }: any) {
  const { exercises, addWorkoutPlan, updateWorkoutPlan, workoutPlans } = useAppStore();
  const editPlanId = route.params?.editPlanId;
  const existingPlan = editPlanId ? workoutPlans.find(p => p.id === editPlanId) : null;

  const [planName, setPlanName] = useState(existingPlan?.name || '');
  const [selectedExercises, setSelectedExercises] = useState<PlanExercise[]>(existingPlan?.exercises || []);
  const [showExerciseDialog, setShowExerciseDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const categories = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'cardio'];

  // 去重：按名字去重，保留第一个
  const seen = new Set<string>();
  const uniqueExercises = exercises.filter(e => {
    if (seen.has(e.name)) return false;
    seen.add(e.name);
    return true;
  });

  let filteredExercises = uniqueExercises;
  if (selectedCategory) {
    filteredExercises = filteredExercises.filter(e => e.category === selectedCategory);
  }
  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    filteredExercises = filteredExercises.filter(e => e.name.toLowerCase().includes(q));
  }

  const handleAddExercise = (exercise: Exercise) => {
    const planExercise: PlanExercise = {
      exerciseId: exercise.id,
      sets: 3,
      reps: 10,
      weight: 0,
      restTime: 90,
      order: selectedExercises.length,
    };
    setSelectedExercises([...selectedExercises, planExercise]);
    setShowExerciseDialog(false);
  };

  const handleUpdateExercise = (updated: PlanExercise) => {
    setSelectedExercises(selectedExercises.map(e =>
      e.exerciseId === updated.exerciseId ? updated : e
    ));
  };

  const handleRemoveExercise = (exerciseId: string) => {
    setSelectedExercises(selectedExercises.filter(e => e.exerciseId !== exerciseId));
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const newExercises = [...selectedExercises];
    [newExercises[index - 1], newExercises[index]] = [newExercises[index], newExercises[index - 1]];
    setSelectedExercises(newExercises);
  };

  const handleMoveDown = (index: number) => {
    if (index >= selectedExercises.length - 1) return;
    const newExercises = [...selectedExercises];
    [newExercises[index], newExercises[index + 1]] = [newExercises[index + 1], newExercises[index]];
    setSelectedExercises(newExercises);
  };

  const handleSavePlan = () => {
    if (planName.trim() && selectedExercises.length > 0) {
      if (existingPlan) {
        updateWorkoutPlan(existingPlan.id, {
          name: planName,
          exercises: selectedExercises,
          updatedAt: Date.now(),
        });
      } else {
        const plan = {
          id: Date.now().toString(),
          name: planName,
          exercises: selectedExercises,
          isTemplate: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        addWorkoutPlan(plan);
      }
      navigation.goBack();
    }
  };

  const getExerciseName = (exerciseId: string) => {
    return exercises.find(e => e.id === exerciseId)?.name || '未知动作';
  };

  const getExerciseCategory = (exerciseId: string) => {
    return exercises.find(e => e.id === exerciseId)?.category || '';
  };

  const categoryColors: Record<string, string> = {
    chest: '#EF4444',
    back: '#3B82F6',
    legs: '#8B5CF6',
    shoulders: '#F59E0B',
    arms: '#10B981',
    core: '#EC4899',
    cardio: '#06B6D4'
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Avatar.Icon size={36} icon="playlist-plus" style={styles.headerIcon} color="#6366F1" />
          <Text style={styles.headerTitle}>{existingPlan ? '编辑计划' : '创建计划'}</Text>
        </View>

        <TextInput
          label="计划名称"
          value={planName}
          onChangeText={setPlanName}
          style={styles.input}
          mode="outlined"
          outlineColor="#E2E8F0"
          activeOutlineColor="#6366F1"
          left={<TextInput.Icon icon="rename-box" color="#94A3B8" />}
        />

        <View style={styles.sectionHeader}>
          <Avatar.Icon size={20} icon="dumbbell" style={styles.sectionIcon} color="#6366F1" />
          <Text style={styles.sectionTitle}>已选择的动作 ({selectedExercises.length})</Text>
        </View>

        {selectedExercises.map((exercise, index) => {
          const cat = getExerciseCategory(exercise.exerciseId);
          const color = categoryColors[cat] || '#6366F1';
          return (
            <Card key={exercise.exerciseId} style={styles.exerciseCard}>
              <Card.Content>
                <View style={styles.exerciseHeader}>
                  <View style={styles.exerciseTitleRow}>
                    <View style={[styles.exerciseNumberBg, { backgroundColor: color + '20' }]}>
                      <Text style={[styles.exerciseNumber, { color }]}>{index + 1}</Text>
                    </View>
                    <Text style={styles.exerciseName}>{getExerciseName(exercise.exerciseId)}</Text>
                  </View>
                  <View style={styles.exerciseActions}>
                    <IconButton
                      icon="arrow-up"
                      size={18}
                      iconColor={index === 0 ? '#CBD5E1' : '#6366F1'}
                      onPress={() => handleMoveUp(index)}
                      disabled={index === 0}
                      style={styles.actionIcon}
                    />
                    <IconButton
                      icon="arrow-down"
                      size={18}
                      iconColor={index === selectedExercises.length - 1 ? '#CBD5E1' : '#6366F1'}
                      onPress={() => handleMoveDown(index)}
                      disabled={index === selectedExercises.length - 1}
                      style={styles.actionIcon}
                    />
                    <IconButton
                      icon="close-circle"
                      size={20}
                      iconColor="#EF4444"
                      onPress={() => handleRemoveExercise(exercise.exerciseId)}
                      style={styles.actionIcon}
                    />
                  </View>
                </View>
                <View style={styles.exerciseParams}>
                  <View style={styles.paramItem}>
                    <Text style={styles.paramLabel}>组数</Text>
                    <TextInput
                      value={exercise.sets.toString()}
                      onChangeText={(text) => {
                        const updated = { ...exercise, sets: parseInt(text) || 0 };
                        handleUpdateExercise(updated);
                      }}
                      keyboardType="numeric"
                      style={styles.paramInput}
                      mode="outlined"
                      dense
                      outlineColor="#E2E8F0"
                      activeOutlineColor="#6366F1"
                    />
                  </View>
                  <View style={styles.paramItem}>
                    <Text style={styles.paramLabel}>次数</Text>
                    <TextInput
                      value={exercise.reps.toString()}
                      onChangeText={(text) => {
                        const updated = { ...exercise, reps: parseInt(text) || 0 };
                        handleUpdateExercise(updated);
                      }}
                      keyboardType="numeric"
                      style={styles.paramInput}
                      mode="outlined"
                      dense
                      outlineColor="#E2E8F0"
                      activeOutlineColor="#6366F1"
                    />
                  </View>
                  <View style={styles.paramItem}>
                    <Text style={styles.paramLabel}>重量</Text>
                    <TextInput
                      value={exercise.weight?.toString() || ''}
                      onChangeText={(text) => {
                        const updated = { ...exercise, weight: parseInt(text) || 0 };
                        handleUpdateExercise(updated);
                      }}
                      keyboardType="numeric"
                      style={styles.paramInput}
                      mode="outlined"
                      dense
                      outlineColor="#E2E8F0"
                      activeOutlineColor="#6366F1"
                    />
                  </View>
                  <View style={styles.paramItem}>
                    <Text style={styles.paramLabel}>休息</Text>
                    <TextInput
                      value={exercise.restTime.toString()}
                      onChangeText={(text) => {
                        const updated = { ...exercise, restTime: parseInt(text) || 0 };
                        handleUpdateExercise(updated);
                      }}
                      keyboardType="numeric"
                      style={styles.paramInput}
                      mode="outlined"
                      dense
                      outlineColor="#E2E8F0"
                      activeOutlineColor="#6366F1"
                    />
                  </View>
                </View>
              </Card.Content>
            </Card>
          );
        })}

        <Button
          mode="outlined"
          onPress={() => setShowExerciseDialog(true)}
          style={styles.addButton}
          labelStyle={styles.addButtonLabel}
          icon="plus"
          textColor="#6366F1"
        >
          添加动作
        </Button>

        <Button
          mode="contained"
          onPress={handleSavePlan}
          disabled={!planName.trim() || selectedExercises.length === 0}
          style={styles.saveButton}
          labelStyle={styles.saveButtonLabel}
          icon="content-save"
        >
          {existingPlan ? '更新计划' : '保存计划'}
        </Button>
      </ScrollView>

      <Portal>
        <Dialog visible={showExerciseDialog} onDismiss={() => setShowExerciseDialog(false)} style={styles.dialog}>
          <View style={styles.dialogHeader}>
            <Dialog.Title style={styles.dialogTitle}>选择动作</Dialog.Title>
            <IconButton
              icon="close"
              size={22}
              onPress={() => setShowExerciseDialog(false)}
              iconColor="#64748B"
              style={styles.dialogCloseBtn}
            />
          </View>
          <Dialog.Content>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryFilter}>
              <Chip
                selected={selectedCategory === null}
                onPress={() => setSelectedCategory(null)}
                style={[styles.filterChip, selectedCategory === null && styles.filterChipActive]}
                selectedColor="#6366F1"
              >
                全部
              </Chip>
              {categories.map(cat => (
                <Chip
                  key={cat}
                  selected={selectedCategory === cat}
                  onPress={() => setSelectedCategory(cat)}
                  style={[styles.filterChip, selectedCategory === cat && styles.filterChipActive]}
                  selectedColor="#6366F1"
                >
                  {categoryLabels[cat]}
                </Chip>
              ))}
            </ScrollView>
            <FlatList
              data={filteredExercises}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <Card style={styles.selectableExercise}>
                  <Card.Content>
                    <View style={styles.selectableExerciseRow}>
                      <View style={[styles.categoryDot, { backgroundColor: categoryColors[item.category] || '#6366F1' }]} />
                      <View style={styles.selectableExerciseInfo}>
                        <Text style={styles.selectableExerciseName}>{item.name}</Text>
                        <Text style={styles.exerciseCategory}>{categoryLabels[item.category]}</Text>
                      </View>
                    </View>
                  </Card.Content>
                  <Card.Actions>
                    <Button onPress={() => handleAddExercise(item)} mode="contained" style={styles.dialogAddButton} labelStyle={{ fontSize: 12 }}>
                      添加
                    </Button>
                  </Card.Actions>
                </Card>
              )}
              style={styles.exerciseList}
              showsVerticalScrollIndicator={false}
            />
          </Dialog.Content>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  headerIcon: {
    backgroundColor: '#EEF2FF',
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  input: {
    backgroundColor: '#fff',
    marginBottom: 16,
    fontSize: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
  exerciseCard: {
    marginBottom: 10,
    borderRadius: 14,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  exerciseActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    margin: 0,
    marginHorizontal: -4,
  },
  exerciseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  exerciseNumberBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  exerciseNumber: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
    flex: 1,
  },
  exerciseParams: {
    flexDirection: 'row',
    marginTop: 4,
  },
  paramItem: {
    flex: 1,
    marginHorizontal: 3,
  },
  paramLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 4,
    textAlign: 'center',
  },
  paramInput: {
    backgroundColor: '#fff',
    textAlign: 'center',
    fontSize: 14,
  },
  addButton: {
    marginVertical: 12,
    borderRadius: 12,
    borderColor: '#6366F1',
    borderWidth: 1.5,
    paddingVertical: 4,
  },
  addButtonLabel: {
    fontSize: 15,
    fontWeight: '600',
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
  dialog: {
    maxHeight: '80%',
    borderRadius: 20,
  },
  dialogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 8,
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  dialogCloseBtn: {
    margin: 0,
    backgroundColor: '#F1F5F9',
  },
  categoryFilter: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  filterChip: {
    margin: 3,
    backgroundColor: '#F1F5F9',
  },
  filterChipActive: {
    backgroundColor: '#EEF2FF',
  },
  exerciseList: {
    maxHeight: 400,
  },
  selectableExercise: {
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  selectableExerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  selectableExerciseInfo: {
    flex: 1,
  },
  selectableExerciseName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  exerciseCategory: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  dialogAddButton: {
    borderRadius: 8,
    backgroundColor: '#6366F1',
  },
});
