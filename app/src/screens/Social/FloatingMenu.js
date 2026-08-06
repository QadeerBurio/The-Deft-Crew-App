import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  withTiming,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Modern color palette - Black, White, Gold
const COLORS = {
  primary: '#F9C349',
  primaryLight: '#FAD775',
  primaryDark: '#E0A830',
  background: 'rgba(249, 195, 73, 0.15)',
  glass: 'rgba(255, 255, 255, 0.1)',
  glassBorder: 'rgba(255, 255, 255, 0.15)',
  shadow: 'rgba(249, 195, 73, 0.3)',
  text: '#FFFFFF',
  textLight: 'rgba(255, 255, 255, 0.8)',
  white: '#FFFFFF',
  black: '#000000',
  darkBg: 'rgba(0, 0, 0, 0.85)',
  labelBg: 'rgba(0, 0, 0, 0.8)',
  surface: 'rgba(255, 255, 255, 0.05)',
  surfaceLight: 'rgba(255, 255, 255, 0.1)',
};

const FloatingMenu = ({ navigation }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Position
  const translateX = useSharedValue(SCREEN_WIDTH - 80);
  const translateY = useSharedValue(SCREEN_HEIGHT - 160);
  const context = useSharedValue({ x: 0, y: 0 });

  // Animation progress
  const menuProgress = useSharedValue(0);

  // Drag gesture
  const gesture = Gesture.Pan()
    .onStart(() => {
      context.value = { x: translateX.value, y: translateY.value };
    })
    .onUpdate((event) => {
      translateX.value = event.translationX + context.value.x;
      translateY.value = event.translationY + context.value.y;
    })
    .onEnd(() => {
      // Magnetic snap with spring
      const snapX = translateX.value > SCREEN_WIDTH / 2
        ? SCREEN_WIDTH - 75
        : 15;
      translateX.value = withSpring(snapX, { damping: 20, stiffness: 200 });

      // Keep within screen bounds vertically
      const minY = 100;
      const maxY = SCREEN_HEIGHT - 150;
      if (translateY.value < minY) {
        translateY.value = withSpring(minY, { damping: 20, stiffness: 200 });
      } else if (translateY.value > maxY) {
        translateY.value = withSpring(maxY, { damping: 20, stiffness: 200 });
      }
    });

  const toggleMenu = () => {
    const toValue = isOpen ? 0 : 1;
    menuProgress.value = withSpring(toValue, {
      damping: 15,
      stiffness: 120,
    });
    setIsOpen(!isOpen);
  };

  // Animated styles for sub-buttons
  const makeSubBtnStyle = (xDist, yDist, delay = 0) => {
    return useAnimatedStyle(() => {
      const progress = menuProgress.value;
      // Stagger effect
      const delayedProgress = Math.max(0, Math.min(1, (progress - delay) / (1 - delay)));
      
      // Calculate values directly
      const tx = delayedProgress * xDist;
      const ty = delayedProgress * yDist;
      const scale = delayedProgress * 0.8 + 0.2;
      const opacity = delayedProgress;

      return {
        transform: [
          { translateX: tx },
          { translateY: ty },
          { scale: scale },
        ],
        opacity: opacity,
      };
    });
  };

  // Main button styles
  const mainBtnStyle = useAnimatedStyle(() => {
    const rotateValue = interpolate(menuProgress.value, [0, 1], [0, 135]);
    const scaleValue = menuProgress.value === 0 ? 1 : 0.95;
    const bgColor = menuProgress.value === 0 ? COLORS.primary : COLORS.primaryDark;

    return {
      transform: [
        { rotate: `${rotateValue}deg` },
        { scale: scaleValue },
      ],
      backgroundColor: bgColor,
    };
  });

  // Icon swap styles
  const iconCloseStyle = useAnimatedStyle(() => {
    const opacityValue = menuProgress.value;
    const rotateValue = interpolate(menuProgress.value, [0, 1], [0, 90]);
    return {
      opacity: opacityValue,
      transform: [{ rotate: `${rotateValue}deg` }],
      position: 'absolute',
    };
  });

  const iconMenuStyle = useAnimatedStyle(() => {
    const opacityValue = 1 - menuProgress.value;
    const rotateValue = interpolate(menuProgress.value, [0, 1], [0, -90]);
    return {
      opacity: opacityValue,
      transform: [{ rotate: `${rotateValue}deg` }],
    };
  });

  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  // Ripple effect
  const rippleStyle = useAnimatedStyle(() => {
    const scaleValue = menuProgress.value === 0 ? 0 : 1.8;
    const opacityValue = menuProgress.value === 0 ? 0 : 0.15;
    return {
      transform: [{ scale: scaleValue }],
      opacity: opacityValue,
    };
  });

  // Label animation style
  const labelStyle = useAnimatedStyle(() => {
    const opacityValue = menuProgress.value;
    const scaleValue = menuProgress.value;
    return {
      opacity: opacityValue,
      transform: [{ scale: scaleValue }],
    };
  });

  const renderMiniBtn = (IconComponent, iconName, label, target, x, y, delay = 0) => {
    const btnStyle = makeSubBtnStyle(x, y, delay);

    return (
      <Animated.View style={[styles.subBtnContainer, btnStyle]}>
        <TouchableOpacity
          style={styles.subBtn}
          onPress={() => {
            toggleMenu();
            if (target && navigation) {
              setTimeout(() => navigation.navigate(target), 300);
            }
          }}
          activeOpacity={0.7}
        >
          <View style={styles.subBtnGradient}>
            <IconComponent name={iconName} size={22} color={COLORS.black} />
          </View>
        </TouchableOpacity>
        <Animated.View style={[styles.labelContainer, labelStyle]}>
          <Text style={styles.subBtnLabel}>{label}</Text>
        </Animated.View>
      </Animated.View>
    );
  };

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.mainContainer, containerStyle]}>
        {/* Ripple Effect */}
        <Animated.View style={[styles.ripple, rippleStyle]} />

        {/* Sub Menu Items with stagger effect */}
        {/* TOP */}
        {renderMiniBtn(Ionicons, 'home', 'Home', 'Home', 0, -75, 0)}
        {/* BOTTOM */}
        {renderMiniBtn(Ionicons, 'airplane', 'Travel', 'Traveling', 0, 75, 0.15)}
        {/* LEFT */}
        {renderMiniBtn(FontAwesome5, 'book-reader', 'Learn', 'Campus', -75, 0, 0.3)}
        {/* RIGHT */}
        {renderMiniBtn(MaterialCommunityIcons, 'briefcase-variant', 'Career', 'CareerHub', 75, 0, 0.45)}

        {/* MAIN FAB */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={toggleMenu}
          style={styles.fabTouchable}
        >
          <Animated.View style={[styles.fab, mainBtnStyle]}>
            <Animated.View style={iconMenuStyle}>
              <Ionicons name="apps" size={28} color={COLORS.black} />
            </Animated.View>
            <Animated.View style={iconCloseStyle}>
              <Ionicons name="close" size={32} color={COLORS.black} />
            </Animated.View>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    position: 'absolute',
    width: 60,
    height: 60,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabTouchable: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    width: 50,
    height: 50,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    right:-10,
    marginTop:10
  },
  ripple: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    opacity: 0,
  },
  subBtnContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  subBtnGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  labelContainer: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: COLORS.labelBg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
  },
  subBtnLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});

export default FloatingMenu;