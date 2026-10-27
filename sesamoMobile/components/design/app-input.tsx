import { ReactNode } from "react";
import {
  TextInput,
  type TextInputProps,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { useThemeColor } from "@/hooks/use-theme-color";

export type AppInputProps = TextInputProps & {
  left?: ReactNode;
  right?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
};

export function AppInput({
  left,
  right,
  containerStyle,
  inputStyle,
  style,
  ...props
}: AppInputProps) {
  const background = useThemeColor({}, "surfaceContainerHighest");
  const onSurface = useThemeColor({}, "onSurface");
  const placeholder = useThemeColor({}, "onSurfaceVariant");
  const primary = useThemeColor({}, "primary");

  return (
    <View
      style={[
        {
          backgroundColor: background,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 10,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        },
        containerStyle,
      ]}
    >
      {left ? <View style={{ justifyContent: "center" }}>{left}</View> : null}
      <TextInput
        {...props}
        placeholderTextColor={`${placeholder}99`}
        style={[
          {
            color: onSurface,
            fontSize: 14,
            padding: 0,
            flex: 1,
          },
          style,
          inputStyle,
        ]}
        selectionColor={primary}
      />
      {right ? <View style={{ justifyContent: "center" }}>{right}</View> : null}
    </View>
  );
}
