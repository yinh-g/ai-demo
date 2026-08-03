import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, ActivityIndicator, StyleSheet, Image, StatusBar } from 'react-native';

import { useAppStore } from './src/store';
import { defaultExercises } from './src/data/defaultExercises';
import ErrorBoundary from './src/components/ErrorBoundary';

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

// 导入图标
const icons = {
  Home: require('./assets/icons/home.png'),
  Plans: require('./assets/icons/calendar.png'),
  Training: require('./assets/icons/dumbell.png'),
  Stats: require('./assets/icons/chart.png'),
  Profile: require('./assets/icons/user.png'),
};

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, size }) => {
          const iconSource = icons[route.name as keyof typeof icons];
          return (
            <Image
              source={iconSource}
              style={{
                width: size,
                height: size,
                tintColor: focused ? '#1A5F7A' : '#999',
              }}
              resizeMode="contain"
            />
          );
        },
        tabBarActiveTintColor: '#1A5F7A',
        tabBarInactiveTintColor: '#999',
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: '首页' }} />
      <Tab.Screen name="Plans" component={PlanScreen} options={{ title: '计划' }} />
      <Tab.Screen name="Training" component={TrainingScreen} options={{ title: '训练' }} />
      <Tab.Screen name="Stats" component={StatsScreen} options={{ title: '统计' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: '我的' }} />
    </Tab.Navigator>
  );
}

function AppContent() {
  const { exercises, addExercise } = useAppStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // 初始化默认动作库
    const initData = async () => {
      try {
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
    };
    
    initData();
  }, []);

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1A5F7A" />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
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
