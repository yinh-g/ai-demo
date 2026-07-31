import React, { useState } from 'react';
import { View, StyleSheet, FlatList, ScrollView } from 'react-native';
import { Text, Card, Button, TextInput, Chip, Portal, Dialog, IconButton } from 'react-native-paper';
import { useAppStore } from '../store';
import { Exercise, PlanExercise } from '../types';
import { categoryLabels } from '../data/defaultExercises';

export default function CreatePlanScreen({ navigation }: any) {
  const { exercises, addWorkoutPlan } = useAppStore();
  const [planName, setPlanName] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<PlanExercise[]>([]);
  const [showExerciseDialog, setShowExerciseDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [editingExercise, setEditingExercise] = useState<PlanExercise | null>(null);

  const categories = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'];

  const filteredExercises = selectedCategory 
    ? exercises.filter(e => e.category === selectedCategory)
    : exercises;

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
    setEditingExercise(null);
  };

  const handleRemoveExercise = (exerciseId: string) => {
    setSelectedExercises(selectedExercises.filter(e => e.exerciseId !== exerciseId));
  };

  const handleSavePlan = () => {
    if (planName.trim() && selectedExercises.length > 0) {
      const plan = {
        id: Date.now().toString(),
        name: planName,
        exercises: selectedExercises,
        isTemplate: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      addWorkoutPlan(plan);
      navigation.goBack();
    }
  };

  const getExerciseName = (exerciseId: string) => {
    return exercises.find(e => e.id === exerciseId)?.name || '未知动作';
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        <TextInput
          label="计划名称"
          value={planName}
          onChangeText={setPlanName}
          style={styles.input}
        />

        <Text style={styles.sectionTitle}>已选择的动作 ({selectedExercises.length})</Text>
        
        {selectedExercises.map((exercise, index) => (
          <Card key={exercise.exerciseId} style={styles.exerciseCard}>
            <Card.Content>
              <View style={styles.exerciseHeader}>
                <Text style={styles.exerciseName}>
                  {index + 1}. {getExerciseName(exercise.exerciseId)}
                </Text>
                <IconButton
                  icon="delete"
                  size={20}
                  onPress={() => handleRemoveExercise(exercise.exerciseId)}
                />
              </View>
              <View style={styles.exerciseParams}>
                <TextInput
                  label="组数"
                  value={exercise.sets.toString()}
                  onChangeText={(text) => {
                    const updated = { ...exercise, sets: parseInt(text) || 0 };
                    handleUpdateExercise(updated);
                  }}
                  keyboardType="numeric"
                  style={styles.paramInput}
                />
                <TextInput
                  label="次数"
                  value={exercise.reps.toString()}
                  onChangeText={(text) => {
                    const updated = { ...exercise, reps: parseInt(text) || 0 };
                    handleUpdateExercise(updated);
                  }}
                  keyboardType="numeric"
                  style={styles.paramInput}
                />
                <TextInput
                  label="重量(kg)"
                  value={exercise.weight?.toString() || ''}
                  onChangeText={(text) => {
                    const updated = { ...exercise, weight: parseInt(text) || 0 };
                    handleUpdateExercise(updated);
                  }}
                  keyboardType="numeric"
                  style={styles.paramInput}
                />
                <TextInput
                  label="休息(秒)"
                  value={exercise.restTime.toString()}
                  onChangeText={(text) => {
                    const updated = { ...exercise, restTime: parseInt(text) || 0 };
                    handleUpdateExercise(updated);
                  }}
                  keyboardType="numeric"
                  style={styles.paramInput}
                />
              </View>
            </Card.Content>
          </Card>
        ))}

        <Button
          mode="outlined"
          onPress={() => setShowExerciseDialog(true)}
          style={styles.addButton}
        >
          添加动作
        </Button>

        <Button
          mode="contained"
          onPress={handleSavePlan}
          disabled={!planName.trim() || selectedExercises.length === 0}
          style={styles.saveButton}
        >
          保存计划
        </Button>
      </ScrollView>

      <Portal>
        <Dialog visible={showExerciseDialog} onDismiss={() => setShowExerciseDialog(false)} style={styles.dialog}>
          <Dialog.Title>选择动作</Dialog.Title>
          <Dialog.Content>
            <ScrollView horizontal style={styles.categoryFilter}>
              <Chip
                selected={selectedCategory === null}
                onPress={() => setSelectedCategory(null)}
                style={styles.filterChip}
              >
                全部
              </Chip>
              {categories.map(cat => (
                <Chip
                  key={cat}
                  selected={selectedCategory === cat}
                  onPress={() => setSelectedCategory(cat)}
                  style={styles.filterChip}
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
                    <Text style={styles.selectableExerciseName}>{item.name}</Text>
                    <Text style={styles.exerciseCategory}>{categoryLabels[item.category]}</Text>
                  </Card.Content>
                  <Card.Actions>
                    <Button onPress={() => handleAddExercise(item)}>添加</Button>
                  </Card.Actions>
                </Card>
              )}
              style={styles.exerciseList}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowExerciseDialog(false)}>关闭</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 10,
  },
  input: {
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  exerciseCard: {
    marginBottom: 10,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  exerciseParams: {
    flexDirection: 'row',
    marginTop: 10,
  },
  paramInput: {
    flex: 1,
    marginHorizontal: 2,
    backgroundColor: '#fff',
  },
  addButton: {
    marginVertical: 10,
  },
  saveButton: {
    marginVertical: 20,
  },
  dialog: {
    maxHeight: '80%',
  },
  categoryFilter: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  filterChip: {
    margin: 2,
  },
  exerciseList: {
    maxHeight: 400,
  },
  selectableExercise: {
    marginBottom: 5,
  },
  selectableExerciseName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  exerciseCategory: {
    fontSize: 12,
    color: '#666',
  },
});
