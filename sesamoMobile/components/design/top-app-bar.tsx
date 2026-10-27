import { BlurView } from "expo-blur";
import { ReactNode } from "react";
import { Platform, StyleProp, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/design/app-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useThemeColor } from "@/hooks/use-theme-color";

export function TopAppBar({
  title,
  left,
  right,
  style,
  floating = true,
}: {
  title?: string;
  left?: ReactNode;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
  floating?: boolean;
}) {
  const background = useThemeColor({}, "surface");
  const border = useThemeColor({}, "outlineVariant");
  const colorScheme = useColorScheme() === "dark" ? "dark" : "light";
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        floating
          ? { position: "absolute", top: 0, left: 0, right: 0, zIndex: 50 }
          : null,
        style,
      ]}
    >
      {Platform.OS === "web" ? (
        <View
          style={{
            backgroundColor: `${background}cc`,
            paddingHorizontal: 20,
            paddingTop: 12 + insets.top,
            paddingBottom: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottomWidth: 1,
            borderBottomColor: `${border}26`,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              flex: 1,
            }}
          >
            {left}
            {title ? (
              <AppText
                variant="title"
                colorName="primary"
                numberOfLines={1}
                style={{ flexShrink: 1 }}
              >
                {title}
              </AppText>
            ) : null}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            {right}
          </View>
        </View>
      ) : (
        <BlurView
          intensity={colorScheme === "dark" ? 35 : 25}
          tint={colorScheme === "dark" ? "dark" : "light"}
          style={{
            backgroundColor: `${background}e6`,
            paddingHorizontal: 20,
            paddingTop: 12 + insets.top,
            paddingBottom: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottomWidth: 1,
            borderBottomColor: `${border}26`,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              flex: 1,
            }}
          >
            {left}
            {title ? (
              <AppText
                variant="title"
                colorName="primary"
                numberOfLines={1}
                style={{ flexShrink: 1 }}
              >
                {title}
              </AppText>
            ) : null}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            {right}
          </View>
        </BlurView>
      )}
    </View>
  );
}
