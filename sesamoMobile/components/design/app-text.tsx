import { useThemeColor } from "@/hooks/use-theme-color";
import { Platform, Text, type TextProps } from "react-native";

export type AppTextVariant =
  | "display"
  | "headline"
  | "title"
  | "body"
  | "bodyStrong"
  | "label"
  | "labelCaps"
  | "mono";

export type AppTextProps = TextProps & {
  variant?: AppTextVariant;
  colorName?: Parameters<typeof useThemeColor>[1];
};

export function AppText({
  variant = "body",
  colorName = "onSurface",
  style,
  ...rest
}: AppTextProps) {
  const color = useThemeColor({}, colorName);

  const fontFamily =
    variant === "display" || variant === "headline" || variant === "title"
      ? Platform.select({
          web: "'Space Grotesk', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          default: "System",
        })
      : variant === "label" || variant === "labelCaps"
        ? Platform.select({
            web: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
            default: "System",
          })
        : variant === "mono"
          ? Platform.select({
              web: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
              ios: "ui-monospace",
              default: "monospace",
            })
          : Platform.select({
              web: "'Manrope', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
              default: "System",
            });

  const baseStyle =
    variant === "display"
      ? {
          fontSize: 56,
          lineHeight: 60,
          fontWeight: "800" as const,
          letterSpacing: -1,
        }
      : variant === "headline"
        ? {
            fontSize: 28,
            lineHeight: 34,
            fontWeight: "700" as const,
            letterSpacing: -0.5,
          }
        : variant === "title"
          ? { fontSize: 20, lineHeight: 26, fontWeight: "700" as const }
          : variant === "bodyStrong"
            ? { fontSize: 16, lineHeight: 24, fontWeight: "600" as const }
            : variant === "label"
              ? { fontSize: 12, lineHeight: 16, fontWeight: "600" as const }
              : variant === "labelCaps"
                ? {
                    fontSize: 10,
                    lineHeight: 14,
                    fontWeight: "700" as const,
                    letterSpacing: 1,
                    textTransform: "uppercase" as const,
                  }
                : variant === "mono"
                  ? { fontSize: 12, lineHeight: 18, fontWeight: "500" as const }
                  : {
                      fontSize: 16,
                      lineHeight: 24,
                      fontWeight: "500" as const,
                    };

  return <Text style={[{ color, fontFamily }, baseStyle, style]} {...rest} />;
}
