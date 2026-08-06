export interface HealthDailyActivity {
  steps: number;
  distanceMeters?: number;
  calories?: number;
  heartRateAvg?: number;
  heartRateMin?: number;
  heartRateMax?: number;
  sleepMinutes?: number;
}

export interface HealthProviderAvailability {
  available: boolean;
  reason?: string;
}

export interface HealthAuthorizationStatus {
  granted: boolean;
  deniedPermissions?: string[];
}

/**
 * 统一健康数据抽象接口。
 * 未来 OPPO HealthKit / 华为 Health Kit / 小米健康 / Apple HealthKit
 * 都实现此接口，UI 层只调用 HealthProviderFactory 暴露的方法。
 */
export interface HealthProvider {
  /** Provider 名称（如 "OPPO HealthKit"、"Health Connect"、"Apple HealthKit"） */
  readonly name: string;

  /** 当前设备环境是否支持此 provider */
  checkAvailability(): Promise<HealthProviderAvailability>;

  /** 请求用户授权（弹出厂商授权页或系统授权页） */
  requestAuthorization(): Promise<HealthAuthorizationStatus>;

  /** 查询某天的步数/活动数据 */
  getDailyActivity(date: string): Promise<HealthDailyActivity | null>;

  /** 查询时间范围的每日活动数据（startDate ≤ date ≤ endDate，YYYY-MM-DD） */
  getDailyActivities(startDate: string, endDate: string): Promise<Array<{ date: string; activity: HealthDailyActivity }>>;

  /** 实时心率监听（可选，不支持则返回 unsubscribe 空实现） */
  subscribeHeartRate(onHeartRate: (bpm: number, timestamp: number) => void): () => void;
}

/** 已注册 Provider 类型标识，运行时根据平台/品牌选择 */
export type HealthProviderType =
  | 'oppo-healthkit'
  | 'huawei-healthkit'
  | 'xiaomi-health'
  | 'apple-healthkit'
  | 'health-connect'
  | 'android-step-counter'
  | 'none';
