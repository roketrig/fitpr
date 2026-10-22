import { Check } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, useColors } from '../theme';

interface Props {
  label: string;
  savedLabel: string;
  // What was just saved, shown in a chip that floats up from the button.
  toastText: string;
  // Goes up by one every time a set is saved; drives the success animation.
  burst: number;
  onPress: () => void;
}

const SAVED_MS = 1100;

// The main button of the app. Pressing it squishes; saving flashes it white
// with a check, sends a ring out from it and floats a "Set N · 80 kg × 8"
// chip upward, so a saved set is unmistakable.
export function SaveSetButton({ label, savedLabel, toastText, burst, onPress }: Props) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const press = useRef(new Animated.Value(1)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const toast = useRef(new Animated.Value(0)).current;
  const checkPop = useRef(new Animated.Value(1)).current;
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (burst === 0) return;
    setSaved(true);
    ring.setValue(0);
    toast.setValue(0);
    checkPop.setValue(0.3);
    Animated.timing(flash, { toValue: 1, duration: 120, useNativeDriver: false }).start();
    Animated.spring(checkPop, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }).start();
    Animated.timing(ring, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    Animated.timing(toast, { toValue: 1, duration: 1300, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      setSaved(false);
      Animated.timing(flash, { toValue: 0, duration: 280, useNativeDriver: false }).start();
    }, SAVED_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [burst]);

  return (
    <View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.toast,
          {
            opacity: toast.interpolate({ inputRange: [0, 0.12, 0.75, 1], outputRange: [0, 1, 1, 0] }),
            transform: [{ translateY: toast.interpolate({ inputRange: [0, 1], outputRange: [8, -34] }) }],
          },
        ]}
      >
        <Check size={13} color={colors.lime} strokeWidth={3} />
        <Text style={styles.toastText}>{toastText}</Text>
      </Animated.View>

      <Pressable
        onPress={onPress}
        onPressIn={() => Animated.spring(press, { toValue: 0.95, useNativeDriver: true, speed: 50 }).start()}
        onPressOut={() =>
          Animated.spring(press, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 10 }).start()
        }
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Animated.View style={{ transform: [{ scale: press }] }}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.ring,
              {
                opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
                transform: [
                  { scaleX: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] }) },
                  { scaleY: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] }) },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.button,
              { backgroundColor: flash.interpolate({ inputRange: [0, 1], outputRange: [colors.lime, colors.foreground] }) },
            ]}
          >
            <Animated.View style={{ transform: [{ scale: checkPop }] }}>
              <Check size={18} color={colors.background} strokeWidth={3} />
            </Animated.View>
            <Text style={styles.text}>{saved ? savedLabel : label}</Text>
          </Animated.View>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
  },
  text: { color: colors.background, fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  ring: {
    ...StyleSheet.absoluteFill,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: colors.lime,
  },
  toast: {
    position: 'absolute',
    top: -6,
    alignSelf: 'center',
    zIndex: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.lime,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  toastText: { color: colors.foreground, fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
});
