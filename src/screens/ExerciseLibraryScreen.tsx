import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Image } from 'react-native';
import { Text, Card, Button, TextInput, Chip, Portal, Dialog } from 'react-native-paper';
import { useAppStore } from '../store';
import { Exercise } from '../types';
import { categoryLabels, equipmentLabels } from '../data/defaultExercises';

// 分类图标映射
const categoryIcons: Record<string, any> = {
  chest: require('../../assets/icons/chest.png'),
  back: require('../../assets/icons/back.png'),
  legs: require('../../assets/icons/leg.png'),
  shoulders: require('../../assets/icons/shoulder.png'),
  arms: require('../../assets/icons/arm.png'),
  core: require('../../assets/icons/core.png'),
};

export default function ExerciseLibraryScreen() {
  const { exercises, addExercise, deleteExercise } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [newExercise, setNewExercise] = useState({
    name: '',
    category: 'chest',
    equipment: 'barbell',
    muscleGroup: ''
  });

  const categories = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'];

  const filteredExercises = exercises.filter(exercise => {
    const matchesSearch = exercise.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory ? exercise.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  const handleAddExercise = () => {
    if (newExercise.name.trim()) {
      const exercise: Exercise = {
        id: Date.now().toString(),
        name: newExercise.name,
        category: newExercise.category as any,
        equipment: newExercise.equipment as any,
        muscleGroup: newExercise.muscleGroup.split(',').map(s => s.trim()).filter(Boolean),
        isCustom: true,
        createdAt: Date.now()
      };
      addExercise(exercise);
      setVisible(false);
      setNewExercise({ name: '', category: 'chest', equipment: 'barbell', muscleGroup: '' });
    }
  };

  const renderExercise = ({ item }: { item: Exercise }) => (
    <Card style={styles.exerciseCard}>
      <Card.Content>
        <View style={styles.exerciseHeader}>
          <View style={styles.exerciseTitle}>
            {categoryIcons[item.category] && (
              <Image 
                source={categoryIcons[item.category]} 
                style={styles.categoryIcon}
                resizeMode="contain"
              />
            )}
            <Text style={styles.exerciseName}>{item.name}</Text>
          </View>
          {item.isCustom && (
            <Button 
              compact 
              textColor="#ff6b35"
              onPress={() => deleteExercise(item.id)}
            >
              删除
            </Button>
          )}
        </View>
        <View style={styles.chipContainer}>
          <Chip style={styles.chip}>{categoryLabels[item.category]}</Chip>
          <Chip style={styles.chip}>{equipmentLabels[item.equipment]}</Chip>
        </View>
        {item.muscleGroup.length > 0 && (
          <Text style={styles.muscleGroup}>
            目标肌群: {item.muscleGroup.join(', ')}
          </Text>
        )}
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="搜索动作..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={styles.searchInput}
      />

      <View style={styles.filterContainer}>
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
      </View>

      <FlatList
        data={filteredExercises}
        renderItem={renderExercise}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
      />

      <Button
        mode="contained"
        onPress={() => setVisible(true)}
        style={styles.addButton}
      >
        添加自定义动作
      </Button>

      <Portal>
        <Dialog visible={visible} onDismiss={() => setVisible(false)}>
          <Dialog.Title>添加新动作</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="动作名称"
              value={newExercise.name}
              onChangeText={text => setNewExercise({ ...newExercise, name: text })}
              style={styles.input}
            />
            <Text style={styles.label}>分类</Text>
            <View style={styles.chipContainer}>
              {categories.map(cat => (
                <Chip
                  key={cat}
                  selected={newExercise.category === cat}
                  onPress={() => setNewExercise({ ...newExercise, category: cat })}
                  style={styles.chip}
                >
                  {categoryLabels[cat]}
                </Chip>
              ))}
            </View>
            <Text style={styles.label}>器械</Text>
            <View style={styles.chipContainer}>
              {Object.keys(equipmentLabels).map(eq => (
                <Chip
                  key={eq}
                  selected={newExercise.equipment === eq}
                  onPress={() => setNewExercise({ ...newExercise, equipment: eq })}
                  style={styles.chip}
                >
                  {equipmentLabels[eq]}
                </Chip>
              ))}
            </View>
            <TextInput
              label="目标肌群（用逗号分隔）"
              value={newExercise.muscleGroup}
              onChangeText={text => setNewExercise({ ...newExercise, muscleGroup: text })}
              style={styles.input}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setVisible(false)}>取消</Button>
            <Button onPress={handleAddExercise}>添加</Button>
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
  searchInput: {
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  filterChip: {
    margin: 2,
  },
  list: {
    paddingBottom: 80,
  },
  exerciseCard: {
    marginBottom: 8,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  exerciseTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  chip: {
    margin: 2,
  },
  muscleGroup: {
    marginTop: 8,
    color: '#666',
    fontSize: 14,
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  input: {
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
});
