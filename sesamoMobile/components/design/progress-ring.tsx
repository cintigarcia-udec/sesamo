import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { useThemeColor } from '@/hooks/use-theme-color';
import { AppText } from '@/components/design/app-text';

export function ProgressRing({
  value,
  label,
  size = 180,
  strokeWidth = 12,
}: {
  value: number;
  label: string;
  size?: number;
  strokeWidth?: number;
}) {
  const primary = useThemeColor({}, 'primary');
  const primaryContainer = useThemeColor({}, 'primaryContainer');
  const track = useThemeColor({}, 'surfaceContainerLow');

  const clamped = Math.max(0, Math.min(1, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={track}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <Defs>
          <LinearGradient id="ringGradient" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={primary} />
            <Stop offset="1" stopColor={primaryContainer} />
          </LinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#ringGradient)"
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          fill="transparent"
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <AppText variant="headline" colorName="primary">
          {Math.round(clamped * 100)}%
        </AppText>
        <AppText variant="labelCaps" colorName="secondary">
          {label}
        </AppText>
      </View>
    </View>
  );
}
