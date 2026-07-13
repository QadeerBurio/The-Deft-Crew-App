import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Dimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  interpolate,
  useDerivedValue
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const FloatingMenu = ({ navigation }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Initial Position (Bottom Right)
  const translateX = useSharedValue(SCREEN_WIDTH - 80);
  const translateY = useSharedValue(SCREEN_HEIGHT - 160);
  const context = useSharedValue({ x: 0, y: 0 });

  const menuProgress = useSharedValue(0);

  // Drag Logic
  const gesture = Gesture.Pan()
    .onStart(() => {
      context.value = { x: translateX.value, y: translateY.value };
    })
    .onUpdate((event) => {
      translateX.value = event.translationX + context.value.x;
      translateY.value = event.translationY + context.value.y;
    })
    .onEnd(() => {
      // Magnetic Snap to closest side
      if (translateX.value > SCREEN_WIDTH / 2) {
        translateX.value = withSpring(SCREEN_WIDTH - 70);
      } else {
        translateX.value = withSpring(20);
      }
    });

  const toggleMenu = () => {
    menuProgress.value = isOpen ? withSpring(0) : withSpring(1);
    setIsOpen(!isOpen);
  };

  // Animation for Sub-buttons
  const makeSubBtnStyle = (xDist, yDist) => useAnimatedStyle(() => ({
    transform: [
      { translateX: withSpring(menuProgress.value * xDist) },
      { translateY: withSpring(menuProgress.value * yDist) },
      { scale: withSpring(menuProgress.value) },
    ],
    opacity: menuProgress.value,
  }));

  // Main Button Rotates and Changes Color Slightly
  const mainBtnStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(menuProgress.value, [0, 1], [0, 90])}deg` }],
    backgroundColor: isOpen ? '#a6a6ad9d' : '#a6a6ad9d', 
  }));

  // Icon Swap Animation
  const iconCloseStyle = useAnimatedStyle(() => ({
    opacity: menuProgress.value,
    position: 'absolute',
  }));

  const iconMenuStyle = useAnimatedStyle(() => ({
    opacity: 1 - menuProgress.value,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }));

  const renderMiniBtn = (IconComponent, iconName, label, target, x, y) => (
    <Animated.View style={[styles.subBtnContainer, makeSubBtnStyle(x, y)]}>
      <TouchableOpacity 
        style={styles.subBtn} 
        onPress={() => { 
            toggleMenu(); 
            if(target) navigation.navigate(target); 
        }}
      >
        <IconComponent name={iconName} size={20} color="white" />
      </TouchableOpacity>
      <Text style={styles.subBtnLabel}>{label}</Text>
    </Animated.View>
  );

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.mainContainer, containerStyle]}>
        
        {/* TOP: Home */}
        {renderMiniBtn(Ionicons, "home", "Home", "Home", 0, -60)}

        {/* BOTTOM: Travelling */}
        {renderMiniBtn(Ionicons, "airplane", "Travel", "Traveling", 0, 60)}

        {/* LEFT: Learning */}
        {renderMiniBtn(FontAwesome5, "book-reader", "Learning", "Campus", -60, 0)}

        {/* RIGHT: Career */}
        {renderMiniBtn(MaterialCommunityIcons, "briefcase-variant", "Career", "CareerHub", 60, 0)}

        {/* MAIN FAB */}
        <TouchableOpacity activeOpacity={0.9} onPress={toggleMenu}>
          <Animated.View style={[styles.fab, mainBtnStyle]}>
            {/* The "Menu" Icon */}
            <Animated.View style={iconMenuStyle}>
              <Ionicons name="apps" size={26} color="white" />
            </Animated.View>
            
            {/* The "Close" Icon (Visible only when open) */}
            <Animated.View style={iconCloseStyle}>
              <Ionicons name="close" size={30} color="white" />
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
  fab: {
    width: 42,
    height: 42,
    borderRadius: 27.5,
    backgroundColor: '#a6a6ad9d',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    marginRight:60
  },
  subBtnContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 70,
    
  },
  subBtn: {
    width: 40,
    height: 40,
    borderRadius: 25,
    backgroundColor: '#a6a6ad9d', // Darker background for sub-buttons for contrast
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    marginRight:70
  },
  subBtnLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4f4f55e9',
    marginTop: 6,
    textAlign: 'center',
    width: 80,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginRight:60
  }
});

export default FloatingMenu;