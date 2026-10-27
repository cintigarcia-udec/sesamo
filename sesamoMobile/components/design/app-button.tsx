import { LinearGradient } from "expo-linear-gradient";
import { ReactNode } from "react";
import { Pressable, StyleProp, TextStyle, View, ViewStyle } from "react-native";

import { AppText } from "@/components/design/app-text";
import { useThemeColor } from "@/hooks/use-theme-color";

export type AppButtonVariant = "primary" | "secondary" | "tertiary";

export function AppButton({
  children,
  onPress,
  variant = "primary",
  leftIcon,
  rightIcon,
  style,
  textStyle,
  accessibilityLabel,
  disabled,
}: {
  children: string;
  onPress?: () => void;
  variant?: AppButtonVariant;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  disabled?: boolean;
}) {
  const primary = useThemeColor({}, "primary");
  const primaryContainer = useThemeColor({}, "primaryContainer");
  const secondaryContainer = useThemeColor({}, "secondaryContainer");

  const content = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
      }}
    >
      {leftIcon}
      <AppText
        variant="bodyStrong"
        colorName={
          variant === "secondary"
            ? "onSecondaryContainer"
            : variant === "tertiary"
              ? "primary"
              : "onPrimary"
        }
        style={textStyle}
      >
        {children}
      </AppText>
      {rightIcon}
    </View>
  );

  const baseStyle: ViewStyle = {
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    minHeight: 48,
    justifyContent: "center",
    opacity: disabled ? 0.5 : 1,
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? children}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        baseStyle,
        { transform: [{ scale: pressed ? 0.98 : 1 }] },
        style as any,
      ]}
    >
      {variant === "primary" ? (
        <LinearGradient
          colors={[primary, primaryContainer]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 12,
            paddingHorizontal: 18,
            paddingVertical: 12,
            minHeight: 48,
            justifyContent: "center",
          }}
        >
          {content}
        </LinearGradient>
      ) : variant === "secondary" ? (
        <View
          style={{
            backgroundColor: secondaryContainer,
            borderRadius: 12,
            paddingHorizontal: 18,
            paddingVertical: 12,
            minHeight: 48,
            justifyContent: "center",
          }}
        >
          {content}
        </View>
      ) : (
        content
      )}
    </Pressable>
  );
}
