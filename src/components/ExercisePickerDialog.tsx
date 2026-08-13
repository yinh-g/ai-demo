import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Modal, FlatList, TouchableWithoutFeedback, Image } from 'react-native';
import { Text, TextInput, Chip, Avatar, Button } from 'react-native-paper';
import { Exercise } from '../types';
import { categoryLabels } from '../data/defaultExercises';

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
  cardio: '#06B6D4',
};

interface Props {
  visible: boolean;
  exercises: Exercise[];
  excludeIds?: string[];
  title?: string;
  onPick: (exercise: Exercise) => void;
  onClose: () => void;
}

// 动作选择器：训练中添加/替换动作、训练历史添加动作时复用
export default function ExercisePickerDialog({
  visible,
  exercises,
  excludeIds = [],
  title = '选择动作',
  onPick,
  onClose,
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'cardio'];

  const filteredExercises = useMemo(() => {
    const excludeSet = new Set(excludeIds);
    return exercises.filter((exercise) => {
      if (excludeSet.has(exercise.id)) return false;
      const matchesSearch = exercise.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory ? exercise.category === selectedCategory : true;
      return matchesSearch && matchesCategory;
    });
  }, [exercises, excludeIds, searchQuery, selectedCategory]);

  const handlePick = (exercise: Exercise) => {
    onPick(exercise);
    setSearchQuery('');
    setSelectedCategory(null);
  };

  const handleClose = () => {
    setSearchQuery('');
    setSelectedCategory(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.container}>
              <View style={styles.header}>
                <Avatar.Icon size={32} icon="dumbbell" style={styles.headerIcon} color="#6366F1" />
                <Text style={styles.headerTitle}>{title}</Text>
                <Button onPress={handleClose} textColor="#64748B" labelStyle={{ fontSize: 13 }}>关闭</Button>
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

              <View style={styles.filterRow}>
                <Chip
                  selected={selectedCategory === null}
                  onPress={() => setSelectedCategory(null)}
                  style={[styles.filterChip, selectedCategory === null && styles.filterChipActive]}
                  selectedColor="#6366F1"
                >
                  全部
                </Chip>
                {categories.map((cat) => (
                  <Chip
                    key={cat}
                    selected={selectedCategory === cat}
                    onPress={() => setSelectedCategory(cat)}
                    style={[styles.filterChip, selectedCategory === cat && styles.filterChipActive]}
                    selectedColor={categoryColors[cat] || '#6366F1'}
                  >
                    {categoryLabels[cat]}
                  </Chip>
                ))}
              </View>

              <FlatList
                data={filteredExercises}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => (
                  <TouchableWithoutFeedback onPress={() => handlePick(item)}>
                    <View style={styles.exerciseItem}>
                      {categoryIcons[item.category] && (
                        <Image source={categoryIcons[item.category]} style={styles.categoryIcon} resizeMode="contain" />
                      )}
                      <View style={styles.exerciseInfo}>
                        <Text style={styles.exerciseName}>{item.name}</Text>
                        <Text style={styles.exerciseCategory}>{categoryLabels[item.category]}</Text>
                      </View>
                      <Avatar.Icon size={24} icon="plus" style={styles.addIcon} color="#6366F1" />
                    </View>
                  </TouchableWithoutFeedback>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>没有匹配的动作</Text>
                  </View>
                }
              />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerIcon: {
    backgroundColor: '#EEF2FF',
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    flex: 1,
  },
  searchInput: {
    backgroundColor: '#fff',
    marginBottom: 10,
    fontSize: 14,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  filterChip: {
    margin: 3,
    backgroundColor: '#F1F5F9',
  },
  filterChipActive: {
    backgroundColor: '#EEF2FF',
  },
  list: {
    paddingBottom: 8,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  categoryIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  exerciseCategory: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  addIcon: {
    backgroundColor: '#EEF2FF',
  },
  emptyContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 14,
  },
});
