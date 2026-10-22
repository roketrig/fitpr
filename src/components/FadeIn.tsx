import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, ViewStyle } from 'react-native';

interface Props {
  children: React.ReactNode;
  delay?: number;
  // 'pop' scales up with a little spring instead of sliding up.
  pop?: boolean;
  style?: StyleProp<ViewStyle>;
}

// Content eases in when it first appears — a small fade and rise (or pop)
// that makes lists and banners feel alive instead of snapping into place.
export function FadeIn({ children, delay = 0, pop = false, style }: Props) {
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = pop
      ? Animated.spring(v, { toValue: 1, delay, friction: 6, tension: 120, useNativeDriver: true })
      : Animated.timing(v, {
          toValue: 1,
          duration: 320,
          delay,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        });
    anim.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: v.interpolate({ inputRange: [0, 0.6], outputRange: [0, 1], extrapolate: 'clamp' }),
          transform: pop
            ? [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) }]
            : [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
