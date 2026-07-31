import { MuscleGrowthInput, MuscleGrowthPrediction, UserProfile } from '../types';

export function predictMuscleGrowth(params: MuscleGrowthInput): {
  monthlyGain: number;
  yearlyGain: number;
  confidence: number;
  factors: {
    baseGrowthRate: number;
    ageFactor: number;
    genderFactor: number;
    volumeFactor: number;
    nutritionFactor: number;
    recoveryFactor: number;
  };
} {
  const { userWeight, age, gender, trainingYears, weeklyVolume, proteinIntake, sleepHours } = params;
  
  // 1. 基础增长系数 (% of body weight per month)
  let baseGrowthRate: number;
  if (trainingYears < 1) {
    baseGrowthRate = 0.0125;
  } else if (trainingYears < 3) {
    baseGrowthRate = 0.005;
  } else {
    baseGrowthRate = 0.0015;
  }
  
  // 2. 年龄系数
  let ageFactor: number;
  if (age < 26) {
    ageFactor = 1.1;
  } else if (age < 36) {
    ageFactor = 1.0;
  } else if (age < 46) {
    ageFactor = 0.85;
  } else if (age < 56) {
    ageFactor = 0.7;
  } else if (age < 66) {
    ageFactor = 0.55;
  } else {
    ageFactor = 0.4;
  }
  
  // 3. 性别系数
  const genderFactor = gender === 'male' ? 1.0 : 0.85;
  
  // 4. 容量系数
  const optimalVolumeMin = userWeight * 100;
  const optimalVolumeMax = userWeight * 200;
  
  let volumeFactor: number;
  if (weeklyVolume < optimalVolumeMin * 0.5) {
    volumeFactor = 0.4;
  } else if (weeklyVolume < optimalVolumeMin) {
    volumeFactor = 0.7;
  } else if (weeklyVolume <= optimalVolumeMax) {
    volumeFactor = 1.0;
  } else if (weeklyVolume <= optimalVolumeMax * 1.5) {
    volumeFactor = 0.85;
  } else {
    volumeFactor = 0.6;
  }
  
  // 5. 营养系数
  let nutritionFactor: number;
  let proteinThreshold = 1.6;
  if (age >= 50) proteinThreshold = 2.0;
  if (gender === 'female') proteinThreshold = 1.8;
  
  if (proteinIntake >= proteinThreshold) {
    nutritionFactor = 1.0;
  } else if (proteinIntake >= proteinThreshold * 0.75) {
    nutritionFactor = 0.8;
  } else if (proteinIntake >= proteinThreshold * 0.5) {
    nutritionFactor = 0.5;
  } else {
    nutritionFactor = 0.3;
  }
  
  // 6. 恢复系数
  let recoveryFactor: number;
  if (sleepHours >= 8) {
    recoveryFactor = 1.0;
  } else if (sleepHours >= 7) {
    recoveryFactor = 0.95;
  } else if (sleepHours >= 6) {
    recoveryFactor = 0.8;
  } else {
    recoveryFactor = 0.6;
  }
  
  // 7. 计算预测值
  const monthlyGain = userWeight * baseGrowthRate * ageFactor * genderFactor * volumeFactor * nutritionFactor * recoveryFactor;
  const yearlyGain = monthlyGain * 12;
  
  // 8. 置信度计算
  const confidence = Math.min(
    1.0,
    (proteinIntake > 0 ? 0.2 : 0) +
    (sleepHours > 0 ? 0.15 : 0) +
    (weeklyVolume > 0 ? 0.25 : 0) +
    (age > 0 ? 0.15 : 0) +
    (gender ? 0.1 : 0) +
    0.15
  );
  
  return {
    monthlyGain: Math.round(monthlyGain * 100) / 100,
    yearlyGain: Math.round(yearlyGain * 100) / 100,
    confidence: Math.round(confidence * 100) / 100,
    factors: {
      baseGrowthRate,
      ageFactor,
      genderFactor,
      volumeFactor,
      nutritionFactor,
      recoveryFactor
    }
  };
}

export function generateOptimizationSuggestions(
  prediction: MuscleGrowthPrediction,
  userProfile: UserProfile
): string[] {
  const suggestions: string[] = [];
  const { age, gender, weight } = userProfile;
  
  // 容量建议
  const optimalVolume = weight * 150;
  if (prediction.factors.volumeFactor < 0.8) {
    suggestions.push(`建议增加训练容量至 ${Math.round(optimalVolume)} kg·reps/周`);
  } else if (prediction.factors.volumeFactor < 1.0) {
    suggestions.push(`可适当增加训练容量至 ${Math.round(optimalVolume)} kg·reps/周`);
  }
  
  // 营养建议
  if (gender === 'female') {
    if (prediction.factors.nutritionFactor < 1.0) {
      suggestions.push(`女性建议蛋白质摄入增加至 1.8-2.0g/kg/天`);
    }
    suggestions.push(`女性增肌过程中体重变化可能不明显，建议关注身体成分和力量进步`);
  } else if (age >= 50) {
    if (prediction.factors.nutritionFactor < 1.0) {
      suggestions.push(`50岁以上男性建议蛋白质摄入增加至 2.0-2.4g/kg/天`);
    }
  } else {
    if (prediction.factors.nutritionFactor < 1.0) {
      suggestions.push(`建议蛋白质摄入增加至 1.6-2.0g/kg/天`);
    }
  }
  
  // 睡眠建议
  if (prediction.factors.recoveryFactor < 0.9) {
    suggestions.push(`建议保证 7-8 小时睡眠以优化恢复`);
  }
  
  // 性别特定建议
  if (gender === 'female') {
    suggestions.push(`女性雌激素有助于肌肉恢复，充分利用这一优势`);
    suggestions.push(`上肢训练可适当增加容量，下肢训练与男性相近`);
    if (age < 40) {
      suggestions.push(`经期前后可适当调整训练强度，黄体期力量表现可能更好`);
    }
  }
  
  // 年龄特定建议
  if (age >= 50) {
    suggestions.push(`50岁以上建议增加组间休息时间至 2-3 分钟`);
    suggestions.push(`建议优先进行复合动作（深蹲、硬拉、卧推）`);
  }
  if (age >= 40 && gender === 'male') {
    suggestions.push(`建议定期检测睾酮水平，必要时咨询医生`);
  }
  
  return suggestions;
}
