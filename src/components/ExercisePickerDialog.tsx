import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Modal, ScrollView, TouchableWithoutFeedback, Image, Pressable } from 'react-native';
import { Text, TextInput, Chip, Avatar, IconButton } from 'react-native-paper';
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
  cardio: '#06B6D4',
};

// 完整器械标签（补充 equipmentLabels 缺失的 cardio_machine / none）
const equipmentFullLabels: Record<string, string> = {
  ...equipmentLabels,
  cardio_machine: '有氧器械',
  none: '无器械',
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
              {/* 顶部：固定高度，IconButton 与左侧图标等高对齐 */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <View style={styles.headerIconWrap}>
                    <Avatar.Icon size={28} icon="dumbbell" color="#6366F1" style={styles.headerIcon} />
                  </View>
                  <View style={styles.headerTextWrap}>
                    <Text style={styles.headerTitle}>{title}</Text>
                    <Text style={styles.headerSub}>共 {filteredExercises.length} 个动作可选</Text>
                  </View>
                </View>
                <IconButton
                  icon="close"
                  size={22}
                  iconColor="#64748B"
                  onPress={handleClose}
                  style={styles.closeBtn}
                />
              </View>

              {/* 搜索框 */}
              <TextInput
                placeholder="搜索动作名称..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={styles.searchInput}
                mode="outlined"
                outlineColor="#E2E8F0"
                activeOutlineColor="#6366F1"
                left={<TextInput.Icon icon="magnify" color="#94A3B8" />}
                right={searchQuery ? (
                  <TextInput.Icon icon="close-circle" color="#94A3B8" onPress={() => setSearchQuery('')} />
                ) : undefined}
              />

              {/* 分类筛选：横向滚动，单行不换行 */}
              <View style={styles.filterRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                  <Chip
                    selected={selectedCategory === null}
                    onPress={() => setSelectedCategory(null)}
                    style={[styles.filterChip, selectedCategory === null && styles.filterChipActive]}
                    selectedColor="#6366F1"
                    textStyle={styles.chipText}
                  >
                    全部
                  </Chip>
                  {categories.map((cat) => (
                    <Chip
                      key={cat}
                      selected={selectedCategory === cat}
                      onPress={() => setSelectedCategory(cat)}
                      style={[styles.filterChip, selectedCategory === cat && { backgroundColor: (categoryColors[cat] || '#6366F1') + '22' }]}
                      selectedColor={categoryColors[cat] || '#6366F1'}
                      textStyle={styles.chipText}
                    >
                      {categoryLabels[cat]}
                    </Chip>
                  ))}
                </ScrollView>
              </View>

              {/* 动作列表 */}
              <ScrollView style={styles.list} contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
                {filteredExercises.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Avatar.Icon size={48} icon="magnify-close" color="#CBD5E1" style={styles.emptyIcon} />
                    <Text style={styles.emptyText}>没有匹配的动作</Text>
                    <Text style={styles.emptySub}>试试换个关键词或分类</Text>
                  </View>
                ) : (
                  filteredExercises.map((item) => {
                    const color = categoryColors[item.category] || '#6366F1';
                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => handlePick(item)}
                        style={({ pressed }) => [styles.exerciseItem, pressed && styles.exerciseItemPressed]}
                      >
                        {/* 左侧分类色条 */}
                        <View style={[styles.catBar, { backgroundColor: color }]} />

                        {/* 分类图标 */}
                        {categoryIcons[item.category] && (
                          <View style={[styles.iconWrap, { backgroundColor: color + '18' }]}>
                            <Image source={categoryIcons[item.category]} style={styles.categoryIcon} resizeMode="contain" />
                          </View>
                        )}

                        <View style={styles.exerciseInfo}>
                          <Text style={styles.exerciseName} numberOfLines={1}>{item.name}</Text>
                          <View style={styles.tagRow}>
                            <View style={[styles.tag, { backgroundColor: color + '18' }]}>
                              <Text style={[styles.tagText, { color }]}>{categoryLabels[item.category]}</Text>
                            </View>
                            <View style={styles.tagDefault}>
                              <Text style={styles.tagTextDefault}>{equipmentFullLabels[item.equipment] || item.equipment}</Text>
                            </View>
                          </View>
                        </View>

                        <View style={[styles.addBtn, { backgroundColor: color }]}>
                          <Avatar.Icon size={22} icon="plus" color="#fff" style={{ backgroundColor: 'transparent' }} />
                        </View>
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>
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
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    width: '100%',
    maxHeight: '88%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 14,
    overflow: 'hidden',
  },
  // 顶部
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    minHeight: 44,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerIcon: {
    backgroundColor: 'transparent',
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  headerSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  closeBtn: {
    margin: 0,
  },

  // 搜索
  searchInput: {
    backgroundColor: '#fff',
    marginBottom: 10,
    fontSize: 14,
  },

  // 分类筛选
  filterRow: {
    marginBottom: 8,
  },
  filterScroll: {
    paddingVertical: 2,
  paddingRight: 4,
  },
  filterChip: {
    marginRight: 6,
    backgroundColor: '#F1F5F9',
    height: 30,
  },
  filterChipActive: {
    backgroundColor: '#EEF2FF',
  },
  chipText: {
    fontSize: 12,
  },

  // 列表
  list: {
    maxHeight: '100%',
  },
  listContent: {
    paddingBottom: 8,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingRight: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  exerciseItemPressed: {
    backgroundColor: '#F8FAFC',
  },
  catBar: {
    width: 3,
    height: 36,
    borderRadius: 2,
    marginRight: 8,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  categoryIcon: {
    width: 20,
    height: 20,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginRight: 5,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  tagDefault: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
  },
  tagTextDefault: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  addBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },

  // 空态
  emptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyIcon: {
    backgroundColor: 'transparent',
    marginBottom: 12,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
  },
  emptySub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
  },
});
