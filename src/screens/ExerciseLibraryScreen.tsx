import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Image, ScrollView, Pressable } from 'react-native';
import { Text, TextInput, Chip, Portal, Dialog, Avatar, IconButton, SegmentedButtons } from 'react-native-paper';
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

// 完整器械标签（补充 cardio_machine / none）
const equipmentFullLabels: Record<string, string> = {
  ...equipmentLabels,
  cardio_machine: '有氧器械',
  none: '无器械',
};
const equipmentKeys = Object.keys(equipmentFullLabels);

export default function ExerciseLibraryScreen() {
  const { exercises, addExercise, deleteExercise } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState('all'); // all | custom | builtin
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
    const matchesSource =
      sourceFilter === 'all' ? true
      : sourceFilter === 'custom' ? exercise.isCustom
      : !exercise.isCustom;
    return matchesSearch && matchesCategory && matchesSource;
  });

  // 统计
  const totalCount = exercises.length;
  const customCount = exercises.filter(e => e.isCustom).length;

  const handleAddExercise = () => {
    if (newExercise.name.trim()) {
      const exercise: Exercise = {
        id: Date.now().toString(),
        name: newExercise.name.trim(),
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

  const renderItem = ({ item }: { item: Exercise }) => {
    const color = categoryColors[item.category] || '#6366F1';
    return (
      <View style={styles.exerciseCard}>
        <View style={styles.exerciseRow}>
          {/* 左侧分类色条 */}
          <View style={[styles.catBar, { backgroundColor: color }]} />

          {/* 分类图标 */}
          <View style={[styles.iconWrap, { backgroundColor: color + '18' }]}>
            {categoryIcons[item.category] && (
              <Image source={categoryIcons[item.category]} style={styles.categoryIcon} resizeMode="contain" />
            )}
          </View>

          {/* 信息 */}
          <View style={styles.exerciseInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.exerciseName} numberOfLines={1}>{item.name}</Text>
              {item.isCustom && <View style={styles.customBadge}><Text style={styles.customBadgeText}>自建</Text></View>}
            </View>
            <View style={styles.tagRow}>
              <View style={[styles.tag, { backgroundColor: color + '18' }]}>
                <Text style={[styles.tagText, { color }]}>{categoryLabels[item.category]}</Text>
              </View>
              <View style={styles.tagDefault}>
                <Text style={styles.tagTextDefault}>{equipmentFullLabels[item.equipment] || item.equipment}</Text>
              </View>
            </View>
            {item.muscleGroup.length > 0 && (
              <View style={styles.muscleGroupRow}>
                <Avatar.Icon size={12} icon="target" style={{ backgroundColor: 'transparent' }} color="#94A3B8" />
                <Text style={styles.muscleGroup} numberOfLines={1}>{item.muscleGroup.join(' · ')}</Text>
              </View>
            )}
          </View>

          {/* 删除（仅自建动作） */}
          {item.isCustom && (
            <IconButton
              icon="trash-can-outline"
              size={20}
              iconColor="#EF4444"
              onPress={() => deleteExercise(item.id)}
              style={styles.deleteBtn}
            />
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIconWrap}>
          <Avatar.Icon size={28} icon="book-open-variant" color="#6366F1" style={styles.headerIcon} />
        </View>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>动作库</Text>
          <Text style={styles.headerSub}>共 {totalCount} 个动作{customCount > 0 ? ` · 自建 ${customCount}` : ''}</Text>
        </View>
      </View>

      {/* 来源切换 */}
      <SegmentedButtons
        value={sourceFilter}
        onValueChange={setSourceFilter}
        style={styles.sourceSwitch}
        density="small"
        buttons={[
          { value: 'all', label: '全部' },
          { value: 'builtin', label: '系统' },
          { value: 'custom', label: '自建' },
        ]}
      />

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
          {categories.map(cat => (
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

      <FlatList
        data={filteredExercises}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Avatar.Icon size={56} icon="magnify-close" color="#CBD5E1" style={styles.emptyIcon} />
            <Text style={styles.emptyText}>没有匹配的动作</Text>
            <Text style={styles.emptySub}>试试调整筛选条件或添加自定义动作</Text>
          </View>
        }
      />

      {/* 浮动添加按钮 */}
      <Pressable
        onPress={() => setVisible(true)}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      >
        <Avatar.Icon size={24} icon="plus" color="#fff" style={{ backgroundColor: 'transparent' }} />
        <Text style={styles.fabText}>添加动作</Text>
      </Pressable>

      {/* 添加动作弹窗 */}
      <Portal>
        <Dialog visible={visible} onDismiss={() => setVisible(false)} style={styles.dialog}>
          <View style={styles.dialogHeader}>
            <View style={styles.dialogHeaderLeft}>
              <View style={styles.dialogIconWrap}>
                <Avatar.Icon size={24} icon="plus-circle" color="#6366F1" style={{ backgroundColor: 'transparent' }} />
              </View>
              <Text style={styles.dialogTitle}>添加新动作</Text>
            </View>
            <IconButton icon="close" size={20} iconColor="#64748B" onPress={() => setVisible(false)} style={{ margin: 0 }} />
          </View>

          <Dialog.Content>
            <TextInput
              label="动作名称"
              value={newExercise.name}
              onChangeText={text => setNewExercise({ ...newExercise, name: text })}
              style={styles.input}
              mode="outlined"
              outlineColor="#E2E8F0"
              activeOutlineColor="#6366F1"
              placeholder="如：哑铃集中弯举"
            />

            <Text style={styles.label}>分类</Text>
            <View style={styles.dialogChipRow}>
              {categories.map(cat => {
                const active = newExercise.category === cat;
                const color = categoryColors[cat] || '#6366F1';
                return (
                  <Pressable
                    key={cat}
                    onPress={() => setNewExercise({ ...newExercise, category: cat })}
                    style={[styles.selectChip, active ? { backgroundColor: color + '22', borderColor: color } : { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}
                  >
                    <Text style={[styles.selectChipText, { color: active ? color : '#64748B' }]}>{categoryLabels[cat]}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>器械</Text>
            <View style={styles.dialogChipRow}>
              {equipmentKeys.map(eq => {
                const active = newExercise.equipment === eq;
                return (
                  <Pressable
                    key={eq}
                    onPress={() => setNewExercise({ ...newExercise, equipment: eq })}
                    style={[styles.selectChip, active ? { backgroundColor: '#EEF2FF', borderColor: '#6366F1' } : { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}
                  >
                    <Text style={[styles.selectChipText, { color: active ? '#6366F1' : '#64748B' }]}>{equipmentFullLabels[eq]}</Text>
                  </Pressable>
                );
              })}
            </View>

            <TextInput
              label="目标肌群（用逗号分隔）"
              value={newExercise.muscleGroup}
              onChangeText={text => setNewExercise({ ...newExercise, muscleGroup: text })}
              style={styles.input}
              mode="outlined"
              outlineColor="#E2E8F0"
              activeOutlineColor="#6366F1"
              placeholder="如：肱二头肌, 肱肌"
            />
          </Dialog.Content>

          <Dialog.Actions style={styles.dialogActions}>
            <Pressable onPress={() => setVisible(false)} style={styles.btnCancel}>
              <Text style={styles.btnCancelText}>取消</Text>
            </Pressable>
            <Pressable
              onPress={handleAddExercise}
              disabled={!newExercise.name.trim()}
              style={({ pressed }) => [
                styles.btnConfirm,
                !newExercise.name.trim() && styles.btnConfirmDisabled,
                pressed && styles.btnConfirmPressed,
              ]}
            >
              <Text style={styles.btnConfirmText}>添加</Text>
            </Pressable>
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
  // 顶部
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingTop: 6,
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
  headerIcon: { backgroundColor: 'transparent' },
  headerTextWrap: { flex: 1 },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  headerSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },

  // 来源切换
  sourceSwitch: {
    marginBottom: 10,
  },

  // 搜索
  searchInput: {
    backgroundColor: '#fff',
    marginBottom: 10,
    fontSize: 14,
  },

  // 分类筛选
  filterRow: {
    marginBottom: 10,
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
  chipText: { fontSize: 12 },

  // 列表
  list: {
    paddingBottom: 80,
  },
  exerciseCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catBar: {
    width: 3,
    height: 44,
    borderRadius: 2,
    marginRight: 8,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  categoryIcon: {
    width: 22,
    height: 22,
  },
  exerciseInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  customBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: '#FEF3C7',
    marginLeft: 6,
  },
  customBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#D97706',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
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
  muscleGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  muscleGroup: {
    marginLeft: 3,
    color: '#94A3B8',
    fontSize: 11,
    flex: 1,
  },
  deleteBtn: {
    margin: 0,
    marginLeft: 4,
  },

  // 空态
  emptyContainer: {
    paddingVertical: 56,
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
    textAlign: 'center',
  },

  // 浮动添加按钮
  fab: {
    position: 'absolute',
    bottom: 16,
    left: 20,
    right: 20,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366F1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  fabPressed: {
    backgroundColor: '#4F46E5',
  },
  fabText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
  },

  // 弹窗
  dialog: {
    borderRadius: 20,
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  dialogHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dialogIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  dialogTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  input: {
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 6,
    color: '#475569',
  },
  dialogChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  selectChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 6,
    marginBottom: 6,
  },
  selectChipText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // 弹窗按钮
  dialogActions: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 4,
  },
  btnCancel: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  btnCancelText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
  },
  btnConfirm: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#6366F1',
  },
  btnConfirmDisabled: {
    backgroundColor: '#CBD5E1',
  },
  btnConfirmPressed: {
    backgroundColor: '#4F46E5',
  },
  btnConfirmText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
