import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Image, ScrollView } from 'react-native';
import { Text, Card, Button, TextInput, Chip, Portal, Dialog, Avatar } from 'react-native-paper';
import { useAppStore } from '../store';
import { Exercise } from '../types';
import { categoryLabels, equipmentLabels } from '../data/defaultExercises';

const categoryIcons: Record<string, any> = {
  chest: require('../../assets/icons/chest.png'),
  back: require('../../assets/icons/back.png'),
  legs: require('../../assets/icons/leg.png'),
  shoulders: require('../../assets/icons/shoulder.png'),
  arms: require('../../assets/icons/arm.png'),
  core: require('../../assets/icons/core.png'),
  cardio: require('../../assets/icons/chest.png'),
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

  const categories = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'cardio'];

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
              textColor="#EF4444"
              onPress={() => deleteExercise(item.id)}
              icon="delete"
              labelStyle={{ fontSize: 12 }}
            >
              删除
            </Button>
          )}
        </View>
        <View style={styles.chipContainer}>
          <Chip style={[styles.chip, { backgroundColor: (categoryColors[item.category] || '#6366F1') + '15' }]} textStyle={{ color: categoryColors[item.category] || '#6366F1', fontSize: 12 }}>
            {categoryLabels[item.category]}
          </Chip>
          <Chip style={[styles.chip, { backgroundColor: '#F1F5F9' }]} textStyle={{ color: '#64748B', fontSize: 12 }}>
            {equipmentLabels[item.equipment]}
          </Chip>
        </View>
        {item.muscleGroup.length > 0 && (
          <View style={styles.muscleGroupRow}>
            <Avatar.Icon size={14} icon="target" style={{ backgroundColor: 'transparent' }} color="#94A3B8" />
            <Text style={styles.muscleGroup}>目标肌群: {item.muscleGroup.join(', ')}</Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Avatar.Icon size={36} icon="book-open-variant" style={styles.headerIcon} color="#6366F1" />
        <Text style={styles.headerTitle}>动作库</Text>
      </View>

      <TextInput
        placeholder="搜索动作..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={styles.searchInput}
        mode="outlined"
        outlineColor="#E2E8F0"
        activeOutlineColor="#6366F1"
        left={<TextInput.Icon icon="magnify" color="#94A3B8" />}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
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
        renderItem={renderExercise}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      <Button
        mode="contained"
        onPress={() => setVisible(true)}
        style={styles.addButton}
        labelStyle={styles.addButtonLabel}
        icon="plus"
      >
        添加自定义动作
      </Button>

      <Portal>
        <Dialog visible={visible} onDismiss={() => setVisible(false)} style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>添加新动作</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="动作名称"
              value={newExercise.name}
              onChangeText={text => setNewExercise({ ...newExercise, name: text })}
              style={styles.input}
              mode="outlined"
              outlineColor="#E2E8F0"
              activeOutlineColor="#6366F1"
            />
            <Text style={styles.label}>分类</Text>
            <View style={styles.chipContainer}>
              {categories.map(cat => (
                <Chip
                  key={cat}
                  selected={newExercise.category === cat}
                  onPress={() => setNewExercise({ ...newExercise, category: cat })}
                  style={[styles.chip, newExercise.category === cat && { backgroundColor: (categoryColors[cat] || '#6366F1') + '20' }]}
                  selectedColor={categoryColors[cat] || '#6366F1'}
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
                  selectedColor="#6366F1"
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
              mode="outlined"
              outlineColor="#E2E8F0"
              activeOutlineColor="#6366F1"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setVisible(false)} textColor="#64748B">取消</Button>
            <Button onPress={handleAddExercise} mode="contained" style={{ borderRadius: 8, backgroundColor: '#6366F1' }}>添加</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
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
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  searchInput: {
    backgroundColor: '#fff',
    marginBottom: 12,
    fontSize: 15,
  },
  filterScroll: {
    marginBottom: 12,
  },
  filterChip: {
    margin: 3,
    backgroundColor: '#F1F5F9',
  },
  filterChipActive: {
    backgroundColor: '#EEF2FF',
  },
  list: {
    paddingBottom: 80,
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
    marginRight: 10,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  chip: {
    margin: 2,
  },
  muscleGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  muscleGroup: {
    marginLeft: 4,
    color: '#64748B',
    fontSize: 13,
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    borderRadius: 12,
    backgroundColor: '#6366F1',
    paddingVertical: 4,
  },
  addButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  dialog: {
    borderRadius: 20,
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
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
    color: '#1E293B',
  },
});
