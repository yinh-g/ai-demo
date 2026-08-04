import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import {
  initialize,
  requestPermission,
  readRecords,
  getSdkStatus,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';
import { useAppStore } from '../store';

const PERMISSIONS = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'TotalCaloriesBurned' },
  { accessType: 'read', recordType: 'Distance' },
];

export function useHealthConnect() {
  const { setDailyActivity, dailyActivities } = useAppStore();
  const [isAvailable, setIsAvailable] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);

  const checkAvailability = useCallback(async () => {
    if (Platform.OS !== 'android') return false;
    try {
      const status = await getSdkStatus();
      const available = status === SdkAvailabilityStatus.SDK_AVAILABLE;
      setIsAvailable(available);
      return available;
    } catch {
      setIsAvailable(false);
      return false;
    }
  }, []);

  const requestPermissions = useCallback(async () => {
    if (!isAvailable) return false;
    try {
      const response = await requestPermission(PERMISSIONS);
      const granted = response.length > 0;
      setIsAuthorized(granted);
      return granted;
    } catch {
      setIsAuthorized(false);
      return false;
    }
  }, [isAvailable]);

  const syncTodayData = useCallback(async () => {
    if (!isAvailable || !isAuthorized) return null;

    setIsLoading(true);
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const timeRangeFilter = {
        operator: 'between',
        startTime: startOfDay.toISOString(),
        endTime: now.toISOString(),
      };

      // 读取步数
      const stepsResult = await readRecords('Steps', { timeRangeFilter });
      const totalSteps = stepsResult.records.reduce((sum, r) => sum + (r.count || 0), 0);

      // 读取消耗
      const caloriesResult = await readRecords('TotalCaloriesBurned', { timeRangeFilter });
      const totalCalories = caloriesResult.records.reduce((sum, r) => sum + (r.energy?.inKilocalories || 0), 0);

      // 读取距离
      const distanceResult = await readRecords('Distance', { timeRangeFilter });
      const totalDistance = distanceResult.records.reduce((sum, r) => sum + (r.distance?.inKilometers || 0), 0);

      const today = now.toISOString().split('T')[0];

      if (totalSteps > 0 || totalCalories > 0) {
        setDailyActivity({
          date: today,
          steps: Math.round(totalSteps),
          activeCalories: Math.round(totalCalories),
          distanceKm: parseFloat(totalDistance.toFixed(1)),
          source: 'health_connect',
          updatedAt: Date.now(),
        });
        setLastSync(Date.now());
      }

      return {
        steps: Math.round(totalSteps),
        calories: Math.round(totalCalories),
        distance: parseFloat(totalDistance.toFixed(1)),
      };
    } catch (error) {
      console.error('Health Connect sync error:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable, isAuthorized, setDailyActivity]);

  // 初始化
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const init = async () => {
      try {
        await initialize();
        const available = await checkAvailability();
        if (available) {
          const granted = await requestPermissions();
          if (granted) {
            await syncTodayData();
          }
        }
      } catch (error) {
        console.error('Health Connect init error:', error);
      }
    };

    init();
  }, []);

  // 定时同步（每5分钟）
  useEffect(() => {
    if (!isAvailable || !isAuthorized) return;

    const interval = setInterval(() => {
      syncTodayData();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isAvailable, isAuthorized, syncTodayData]);

  return {
    isAvailable,
    isAuthorized,
    isLoading,
    lastSync,
    syncTodayData,
    requestPermissions,
    checkAvailability,
  };
}
