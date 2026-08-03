import { FatLossInput, FatLossPrediction, MuscleGrowthPrediction, UserProfile, BodyRecompositionPrediction } from '../types';

export function calculateBMR(weight: number, height: number | undefined, age: number, gender: 'male' | 'female'): number {
  const h = height || (gender === 'male' ? 175 : 162);
  if (gender === 'male') {
    return 10 * weight + 6.25 * h - 5 * age + 5;
  }
  return 10 * weight + 6.25 * h - 5 * age - 161;
}

export function calculateActivityLevel(weeklyCardioMinutes: number, weeklyStrengthMinutes: number): number {
  const totalMinutes = weeklyCardioMinutes + weeklyStrengthMinutes;
  if (totalMinutes < 60) return 1.2;
  if (totalMinutes < 150) return 1.375;
  if (totalMinutes < 300) return 1.55;
  return 1.725;
}

export function predictFatLoss(params: FatLossInput): {
  monthlyFatLoss: number;
  weeklyFatLoss: number;
  weeklyDeficit: number;
  confidence: number;
  factors: {
    bmrFactor: number;
    activityFactor: number;
    dietFactor: number;
    proteinFactor: number;
    sleepFactor: number;
    genderFactor: number;
  };
} {
  const { userWeight, age, gender, height, weeklyCardioMinutes, weeklyCardioCalories, weeklyStrengthMinutes, dailyCalorieIntake, proteinIntake, sleepHours } = params;

  const bmr = calculateBMR(userWeight, height, age, gender);
  const activityLevel = calculateActivityLevel(weeklyCardioMinutes, weeklyStrengthMinutes);
  const tdee = bmr * activityLevel;

  const weeklyBurn = tdee * 7 + weeklyCardioCalories;
  const weeklyIntake = dailyCalorieIntake * 7;
  const weeklyDeficit = weeklyBurn - weeklyIntake;

  let baseFatLoss = weeklyDeficit / 7700;
  if (baseFatLoss < 0) baseFatLoss = 0;

  const bmrFactor = bmr / (gender === 'male' ? 1800 : 1400);

  let activityFactor: number;
  const totalMinutes = weeklyCardioMinutes + weeklyStrengthMinutes;
  if (totalMinutes < 60) activityFactor = 0.6;
  else if (totalMinutes < 150) activityFactor = 0.8;
  else if (totalMinutes < 300) activityFactor = 1.0;
  else activityFactor = 1.15;

  let dietFactor: number;
  const dailyDeficit = weeklyDeficit / 7;
  if (dailyDeficit < 0) dietFactor = 0.3;
  else if (dailyDeficit < 300) dietFactor = 0.6;
  else if (dailyDeficit < 500) dietFactor = 0.85;
  else if (dailyDeficit <= 750) dietFactor = 1.0;
  else if (dailyDeficit <= 1000) dietFactor = 0.9;
  else dietFactor = 0.7;

  let proteinFactor: number;
  if (proteinIntake >= 2.2) proteinFactor = 1.15;
  else if (proteinIntake >= 1.8) proteinFactor = 1.0;
  else if (proteinIntake >= 1.4) proteinFactor = 0.85;
  else proteinFactor = 0.65;

  let sleepFactor: number;
  if (sleepHours >= 8) sleepFactor = 1.0;
  else if (sleepHours >= 7) sleepFactor = 0.92;
  else if (sleepHours >= 6) sleepFactor = 0.78;
  else sleepFactor = 0.55;

  const genderFactor = gender === 'male' ? 1.05 : 1.0;

  const weeklyFatLoss = baseFatLoss * proteinFactor * sleepFactor * genderFactor;
  const monthlyFatLoss = weeklyFatLoss * 4.33;

  const confidence = Math.min(1.0,
    (dailyCalorieIntake > 0 ? 0.25 : 0) +
    (weeklyCardioCalories > 0 ? 0.2 : 0) +
    (sleepHours > 0 ? 0.15 : 0) +
    (proteinIntake > 0 ? 0.15 : 0) +
    (age > 0 ? 0.1 : 0) +
    (gender ? 0.1 : 0) +
    0.05
  );

  return {
    monthlyFatLoss: Math.round(monthlyFatLoss * 100) / 100,
    weeklyFatLoss: Math.round(weeklyFatLoss * 100) / 100,
    weeklyDeficit: Math.round(weeklyDeficit),
    confidence: Math.round(confidence * 100) / 100,
    factors: {
      bmrFactor: Math.round(bmrFactor * 100) / 100,
      activityFactor: Math.round(activityFactor * 100) / 100,
      dietFactor: Math.round(dietFactor * 100) / 100,
      proteinFactor: Math.round(proteinFactor * 100) / 100,
      sleepFactor: Math.round(sleepFactor * 100) / 100,
      genderFactor: Math.round(genderFactor * 100) / 100
    }
  };
}

export function predictBodyRecomposition(
  muscleInput: import('../types').MuscleGrowthInput,
  fatLossInput: FatLossInput,
  userProfile: UserProfile,
  musclePrediction: MuscleGrowthPrediction
): BodyRecompositionPrediction {
  const fat = predictFatLoss(fatLossInput);

  let adjustedMonthlyGain = musclePrediction.predictedMonthlyGain;
  const dailyDeficit = fat.weeklyDeficit / 7;
  if (dailyDeficit > 750) {
    const deficitImpact = Math.max(0.3, 1 - (dailyDeficit - 500) / 1000);
    adjustedMonthlyGain *= deficitImpact;
  }

  const adjustedMuscle: MuscleGrowthPrediction = {
    ...musclePrediction,
    predictedMonthlyGain: Math.round(adjustedMonthlyGain * 100) / 100,
    predictedYearlyGain: Math.round(adjustedMonthlyGain * 12 * 100) / 100
  };

  const fatPrediction: FatLossPrediction = {
    id: Date.now().toString(),
    userId: userProfile.id,
    date: new Date().toISOString().split('T')[0],
    weeklyCardioCalories: fatLossInput.weeklyCardioCalories,
    predictedMonthlyFatLoss: fat.monthlyFatLoss,
    predictedWeeklyFatLoss: fat.weeklyFatLoss,
    predictedWeeklyCalorieDeficit: fat.weeklyDeficit,
    confidence: fat.confidence,
    factors: fat.factors
  };

  if (userProfile.fatLossGoal && userProfile.fatLossGoal > 0 && fat.weeklyFatLoss > 0) {
    fatPrediction.timeToGoal = Math.ceil(userProfile.fatLossGoal / fat.weeklyFatLoss);
  }

  const netWeightChange = adjustedMonthlyGain - fat.monthlyFatLoss;

  const compositionScore = Math.min(100, Math.max(0,
    (adjustedMonthlyGain * 20) +
    (fat.monthlyFatLoss * 15) +
    (fat.confidence * 20) +
    (adjustedMuscle.confidence * 20) +
    25
  ));

  return {
    muscleGain: adjustedMuscle,
    fatLoss: fatPrediction,
    netWeightChange: Math.round(netWeightChange * 100) / 100,
    bodyCompositionScore: Math.round(compositionScore),
    recommendations: generateRecompositionSuggestions(adjustedMuscle, fatPrediction, fatLossInput, userProfile)
  };
}

export function generateRecompositionSuggestions(
  muscle: MuscleGrowthPrediction,
  fat: FatLossPrediction,
  fatInput: FatLossInput,
  profile: UserProfile
): string[] {
  const suggestions: string[] = [];
  const dailyDeficit = fat.predictedWeeklyCalorieDeficit / 7;

  if (dailyDeficit > 750) {
    suggestions.push('热量赤字过大，可能抑制肌肉增长，建议控制在500kcal/天以内');
  } else if (dailyDeficit < 300) {
    suggestions.push('热量赤字偏小，减脂速度较慢，可适当增加有氧或轻微减少摄入');
  } else if (dailyDeficit >= 300 && dailyDeficit <= 500) {
    suggestions.push('热量赤字适中，是增肌减脂的理想区间');
  }

  const proteinNeed = Math.max(
    muscle.factors.nutritionFactor < 1 ? 1.8 : 1.6,
    fat.factors.proteinFactor < 1 ? 2.2 : 2.0
  );
  suggestions.push(`建议蛋白质摄入 ${proteinNeed}g/kg/天，同时满足增肌和保肌需求`);

  if (fatInput.weeklyCardioMinutes < 75) {
    suggestions.push('建议每周至少75分钟中等强度有氧，提升减脂效率');
  }
  if (muscle.factors.volumeFactor < 0.8) {
    suggestions.push('力量训练容量不足，建议优先保证力量训练再增加有氧');
  }

  if (muscle.factors.recoveryFactor < 0.9 || fat.factors.sleepFactor < 0.9) {
    suggestions.push('睡眠不足同时影响肌肉恢复和脂肪代谢，建议保证7-8小时睡眠');
  }

  if (profile.bodyFat && profile.targetBodyFat) {
    if (profile.bodyFat > profile.targetBodyFat) {
      const weeks = Math.ceil((profile.bodyFat - profile.targetBodyFat) * profile.weight / 100 / fat.predictedWeeklyFatLoss);
      if (weeks > 0 && weeks < 100) {
        suggestions.push(`预计约 ${weeks} 周可达到目标体脂率 ${profile.targetBodyFat}%`);
      }
    }
  }

  if (fatInput.proteinIntake >= 2.0) {
    suggestions.push('高蛋白摄入有助于减脂期保留肌肉，继续保持');
  }

  return suggestions;
}
