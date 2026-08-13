import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAppStore } from './src/store';
import { defaultExercises } from './src/data/defaultExercises';
import ErrorBoundary from './src/components/ErrorBoundary';
import { startSync } from './src/services/sync';
import { initSupabase, isSupabaseConfigured } from './src/services/supabase';
import { onUserChanged, getCurrentUser } from './src/services/auth';

import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import PlanScreen from './src/screens/PlanScreen';
import TrainingScreen from './src/screens/TrainingScreen';
import StatsScreen from './src/screens/StatsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ExerciseLibraryScreen from './src/screens/ExerciseLibraryScreen';
import CreatePlanScreen from './src/screens/CreatePlanScreen';
import WorkoutSessionScreen from './src/screens/WorkoutSessionScreen';
import CardioSessionScreen from './src/screens/CardioSessionScreen';
import PredictionScreen from './src/screens/PredictionScreen';
import BodyDataScreen from './src/screens/BodyDataScreen';
import WorkoutRecordDetailScreen from './src/screens/WorkoutRecordDetailScreen';

const tabIcons: Record<string, { active: string; inactive: string }> = {
  Home: { active: 'home', inactive: 'home-outline' },
  Plans: { active: 'calendar-check', inactive: 'calendar-check-outline' },
  Training: { active: 'dumbbell', inactive: 'dumbbell' },
  Stats: { active: 'chart-bar', inactive: 'chart-bar' },
  Profile: { active: 'account', inactive: 'account-outline' },
};

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, size, color }) => {
          const icons = tabIcons[route.name];
          if (!icons) return null;
          const iconName = focused ? icons.active : icons.inactive;
          return (
            <MaterialCommunityIcons
              name={iconName as any}
              size={size}
              color={color}
            />
          );
        },
        tabBarActiveTintColor: '#6366F1',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          height: 56,
          paddingBottom: 6,
          paddingTop: 4,
          borderTopWidth: 1,
          borderTopColor: '#F1F5F9',
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: -2,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ headerShown: false, tabBarLabel: '首页' }} />
      <Tab.Screen name="Plans" component={PlanScreen} options={{ headerShown: false, tabBarLabel: '计划' }} />
      <Tab.Screen name="Training" component={TrainingScreen} options={{ headerShown: false, tabBarLabel: '训练' }} />
      <Tab.Screen name="Stats" component={StatsScreen} options={{ headerShown: false, tabBarLabel: '统计' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false, tabBarLabel: '我的' }} />
    </Tab.Navigator>
  );
}

function AppContent() {
  const { exercises, addExercise, authUser, setAuthUser, isGuest } = useAppStore();
  const [isReady, setIsReady] = useState(false);
  const [firebaseInit, setFirebaseInit] = useState<{ ok: boolean; error?: string }>({ ok: false });

  useEffect(() => {
    let authUnsub: (() => void) | null = null;
    (async () => {
      try {
        // 1. 初始化 Supabase（未配置时也继续往下走，LoginScreen 会显示配置提示）
        if (isSupabaseConfigured()) {
          initSupabase();
          setFirebaseInit({ ok: true });
        } else {
          setFirebaseInit({ ok: false, error: '未配置' });
        }

        // 2. 主动从 AsyncStorage 恢复登录态
        // 不依赖 onAuthStateChange 的初始触发（冷启动时可能延迟或不触发）
        if (isSupabaseConfigured()) {
          const existingUser = await getCurrentUser();
          if (existingUser) {
            setAuthUser(existingUser.email || existingUser.id);
            try {
              await startSync();
            } catch (e) {
              console.warn('startSync on auth restore failed:', e);
            }
          }
        }

        // 3. 监听后续 Auth 状态变化（登录 / 登出 / token 刷新）
        if (isSupabaseConfigured()) {
          authUnsub = onUserChanged(async (user) => {
            if (user) {
              setAuthUser(user.email || user.id);
            } else {
              setAuthUser(null);
            }
          });
        }

        // 4. 初始化默认动作库
        if (exercises.length === 0) {
          defaultExercises.forEach((exercise) => {
            addExercise(exercise);
          });
        }
      } catch (error) {
        console.error('Init error:', error);
      } finally {
        setIsReady(true);
      }
    })();
    return () => { if (authUnsub) authUnsub(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1A5F7A" />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  // 未登录且非游客：显示登录页
  if (!authUser && !isGuest) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
          <PaperProvider>
            <LoginScreen />
          </PaperProvider>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        <PaperProvider>
          <NavigationContainer>
            <Stack.Navigator
              screenOptions={{
                headerStyle: { backgroundColor: '#F8FAFC' },
                headerTintColor: '#1E293B',
              }}
            >
              <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
              <Stack.Screen name="ExerciseLibrary" component={ExerciseLibraryScreen} options={{ title: '动作库' }} />
              <Stack.Screen name="CreatePlan" component={CreatePlanScreen} options={{ title: '创建计划' }} />
              <Stack.Screen name="WorkoutSession" component={WorkoutSessionScreen} options={{ title: '力量训练' }} />
              <Stack.Screen name="CardioSession" component={CardioSessionScreen} options={{ title: '有氧训练' }} />
              <Stack.Screen name="Prediction" component={PredictionScreen} options={{ title: '身体预测' }} />
              <Stack.Screen name="BodyData" component={BodyDataScreen} options={{ title: '身体数据' }} />
              <Stack.Screen name="WorkoutRecordDetail" component={WorkoutRecordDetailScreen} options={{ title: '训练详情' }} />
            </Stack.Navigator>
          </NavigationContainer>
        </PaperProvider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});
