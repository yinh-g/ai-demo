export const theme = {
  colors: {
    primary: '#6366F1',
    primaryLight: '#EEF2FF',
    primaryDark: '#4338CA',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    text: '#1E293B',
    textSecondary: '#64748B',
    textTertiary: '#94A3B8',
    border: '#F1F5F9',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#3B82F6',
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },

  radius: {
    sm: 8,
    md: 12,
    lg: 14,
    xl: 16,
    pill: 999,
  },

  font: {
    xs: 11,
    sm: 12,
    md: 13,
    lg: 14,
    xl: 15,
    '2xl': 16,
    '3xl': 18,
    '4xl': 20,
    '5xl': 22,
    '6xl': 24,
  },
};

export const cardStyle = {
  borderRadius: 16,
  backgroundColor: '#FFFFFF',
  shadowColor: '#000',
  shadowOffset: { width: 0 as const, height: 1 as const },
  shadowOpacity: 0.06,
  shadowRadius: 6,
  elevation: 2,
};

export const cardSpacing = {
  paddingHorizontal: 16,
  paddingVertical: 12,
  marginBottom: 12,
};

export const pagePadding = {
  paddingHorizontal: 16,
  paddingBottom: 24,
};

export const sectionHeaderStyle = {
  flexDirection: 'row' as const,
  justifyContent: 'space-between' as const,
  alignItems: 'center' as const,
  marginBottom: 12,
};
