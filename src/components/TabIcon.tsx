import type { LucideIcon } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

interface Props {
  Icon: LucideIcon;
  color: string;
  size: number;
  focused: boolean;
}

// The tab you land on gives its icon a small bounce.
export function TabIcon({ Icon, color, size, focused }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const wasFocused = useRef(focused);

  useEffect(() => {
    if (focused && !wasFocused.current) {
      scale.setValue(0.8);
      Animated.spring(scale, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }).start();
    }
    wasFocused.current = focused;
  }, [focused, scale]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Icon color={color} size={size} />
    </Animated.View>
  );
}
