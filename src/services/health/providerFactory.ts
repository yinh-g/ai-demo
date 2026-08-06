import { Platform } from 'react-native';
import { HealthProvider, HealthProviderType } from './types';

/**
 * 根据当前设备环境选择最合适的健康数据 Provider。
 * 目前所有实现均为占位，返回 availability.available = false 并给出原因。
 * 接入具体厂商 SDK 时，在此处根据 Platform.OS / DeviceInfo.getBrand() 分发：
 *   - iOS → AppleHealthKitProvider
 *   - Android + brand=OPPO → OppoHealthKitProvider
 *   - Android + brand=HUAWEI → HuaweiHealthKitProvider
 *   - Android + brand=Xiaomi/Redmi → XiaomiHealthProvider
 *   - Android 其他（且 GMS 可用）→ HealthConnectProvider
 *   - Android 兜底 → AndroidStepCounterProvider（仅读步数）
 */
export function detectProviderType(): HealthProviderType {
  if (Platform.OS === 'ios') return 'apple-healthkit';
  if (Platform.OS === 'android') return 'android-step-counter';
  return 'none';
}

/**
 * 按类型拿到 Provider 实例。
 * 接入具体厂商 SDK 时，为每个类型实例化对应 Provider。
 */
export function createHealthProvider(type: HealthProviderType): HealthProvider {
  switch (type) {
    case 'oppo-healthkit':
    case 'huawei-healthkit':
    case 'xiaomi-health':
    case 'apple-healthkit':
    case 'health-connect':
    case 'android-step-counter':
    case 'none':
    default:
      return createPlaceholderProvider(type);
  }
}

function createPlaceholderProvider(type: HealthProviderType): HealthProvider {
  const reason = `Provider "${type}" 尚未实现，接入对应厂商 SDK 后补齐`;
  return {
    name: type,
    async checkAvailability() {
      return { available: false, reason };
    },
    async requestAuthorization() {
      return { granted: false };
    },
    async getDailyActivity() {
      return null;
    },
    async getDailyActivities() {
      return [];
    },
    subscribeHeartRate() {
      return () => {};
    },
  };
}
