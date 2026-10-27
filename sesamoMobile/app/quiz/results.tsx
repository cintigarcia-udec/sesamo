import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View, useWindowDimensions } from "react-native";

import { AppButton } from "@/components/design/app-button";
import { AppCard } from "@/components/design/app-card";
import { AppScreen } from "@/components/design/app-screen";
import { AppText } from "@/components/design/app-text";
import { TopAppBar } from "@/components/design/top-app-bar";
import { getJwtPayload, getStoredAccessToken } from "@/constants/api";
import { useThemeColor } from "@/hooks/use-theme-color";

export default function QuizResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    score?: string | string[];
    correct?: string | string[];
    total?: string | string[];
    time?: string | string[];
    submitError?: string | string[];
  }>();
  const { width } = useWindowDimensions();

  const firstParam = (value?: string | string[]) =>
    Array.isArray(value) ? value[0] : value;

  const readNumber = (value?: string | string[]) => {
    const raw = firstParam(value);
    if (typeof raw !== "string" || !raw.trim()) return null;
    const num = Number(raw);
    return Number.isFinite(num) ? num : null;
  };

  const score = readNumber(params.score);
  const correctFromParams = readNumber(params.correct);
  const totalFromParams = readNumber(params.total);
  const time = firstParam(params.time) ?? "—";
  const submitError = String(firstParam(params.submitError) ?? "").trim();

  const safeTotal =
    typeof totalFromParams === "number" && totalFromParams >= 0
      ? totalFromParams
      : null;
  const scoreValue = typeof score === "number" ? score : null;
  const correctValue =
    typeof correctFromParams === "number"
      ? correctFromParams
      : scoreValue !== null && safeTotal !== null && safeTotal > 0
        ? Math.round((scoreValue / 100) * safeTotal)
        : null;

  const primary = useThemeColor({}, "primary");
  const primaryContainer = useThemeColor({}, "primaryContainer");
  const onSecondaryContainer = useThemeColor({}, "onSecondaryContainer");
  const surfaceHighest = useThemeColor({}, "surfaceContainerHighest");
  const surfaceLowest = useThemeColor({}, "surfaceContainerLowest");
  const error = useThemeColor({}, "error");

  const isWide = width >= 900;
  const [initials, setInitials] = useState("U");

  useEffect(() => {
    let cancelled = false;

    const getInitialsFromPayload = (p: unknown) => {
      const record = p as { name?: unknown; last_name?: unknown } | null;
      const first = typeof record?.name === "string" ? record.name.trim() : "";
      const last =
        typeof record?.last_name === "string" ? record.last_name.trim() : "";
      const a = first ? first[0]!.toUpperCase() : "";
      const b = last ? last[0]!.toUpperCase() : "";
      return (a + b).trim();
    };

    const run = async () => {
      const globalPayload = (globalThis as any).__SESAMO_JWT_PAYLOAD__;
      const fromGlobal = getInitialsFromPayload(globalPayload);
      if (fromGlobal) {
        if (!cancelled) setInitials(fromGlobal);
        return;
      }

      const token = await getStoredAccessToken();
      if (!token) return;
      const decoded = getJwtPayload(token);
      const fromToken = getInitialsFromPayload(decoded);
      if (!fromToken) return;
      if (!cancelled) setInitials(fromToken);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppScreen
      safeAreaEdges={["left", "right", "bottom"]}
      header={
        <TopAppBar
          floating={false}
          title="Academia"
          left={
            <View
              accessibilityLabel="Avatar de usuario"
              style={{
                width: 40,
                height: 40,
                borderRadius: 999,
                backgroundColor: surfaceHighest,
                borderWidth: 2,
                borderColor: primaryContainer,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AppText variant="labelCaps" colorName="primary">
                {initials}
              </AppText>
            </View>
          }
        />
      }
      contentContainerStyle={{
        paddingTop: 18,
        paddingHorizontal: 20,
        maxWidth: 920,
        width: "100%",
        alignSelf: "center",
        gap: 18,
      }}
    >
      <View
        style={{
          borderRadius: 28,
          padding: 22,
          overflow: "hidden",
          backgroundColor: primary,
        }}
      >
        <View
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: primaryContainer,
            opacity: 0.22,
          }}
        />
        <View style={{ gap: 14 }}>
          <View
            style={{
              alignSelf: "flex-start",
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.10)",
            }}
          >
            <MaterialIcons name="verified" size={16} color="#ffffff" />
            <AppText variant="labelCaps" style={{ color: "#ffffff" }}>
              Evaluación completada
            </AppText>
          </View>
          <AppText
            variant="display"
            style={{
              color: "#ffffff",
              fontSize: isWide ? 78 : 60,
              lineHeight: isWide ? 82 : 64,
            }}
          >
            {scoreValue === null ? "—" : scoreValue}
            <AppText
              variant="display"
              style={{
                color: "rgba(255,255,255,0.40)",
                fontSize: isWide ? 48 : 34,
                lineHeight: isWide ? 52 : 40,
              }}
            >
              /100
            </AppText>
          </AppText>
          <AppText
            variant="headline"
            style={{ color: "#ffffff", opacity: 0.9, fontSize: 24 }}
          >
            Estado:{" "}
            {scoreValue !== null && scoreValue >= 85
              ? "Dominado"
              : scoreValue !== null && scoreValue >= 70
                ? "Aprobado"
                : scoreValue === null
                  ? "—"
                  : "Requiere repaso"}
          </AppText>
          {submitError ? (
            <AppText
              variant="label"
              style={{ color: "#ffffff", opacity: 0.85 }}
            >
              Envío al servidor: {submitError}
            </AppText>
          ) : null}

          <View
            style={{
              flexDirection: isWide ? "row" : "column",
              gap: 10,
              marginTop: 10,
            }}
          >
            <AppButton
              onPress={() => router.replace("/(tabs)" as any)}
              variant="secondary"
              leftIcon={
                <MaterialIcons
                  name="school"
                  size={18}
                  color={onSecondaryContainer}
                />
              }
            >
              Volver a la academia
            </AppButton>
          </View>
        </View>
      </View>

      <View style={{ flexDirection: isWide ? "row" : "column", gap: 14 }}>
        <AppCard tone="low" style={{ flex: isWide ? 2 : undefined, gap: 12 }}>
          <AppText variant="title" colorName="primary">
            Métricas de rendimiento
          </AppText>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View
              style={{
                flex: 1,
                borderRadius: 18,
                backgroundColor: surfaceLowest,
                padding: 14,
              }}
            >
              <AppText
                variant="labelCaps"
                colorName="secondary"
                style={{ opacity: 0.8 }}
              >
                Respuestas correctas
              </AppText>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "baseline",
                  gap: 6,
                  marginTop: 6,
                }}
              >
                <AppText
                  variant="headline"
                  colorName="primary"
                  style={{ fontSize: 30 }}
                >
                  {correctValue === null ? "—" : correctValue}
                </AppText>
                <AppText
                  variant="body"
                  colorName="secondary"
                  style={{ opacity: 0.5 }}
                >
                  / {safeTotal === null ? "—" : safeTotal}
                </AppText>
              </View>
            </View>
            <View
              style={{
                flex: 1,
                borderRadius: 18,
                backgroundColor: surfaceLowest,
                padding: 14,
              }}
            >
              <AppText
                variant="labelCaps"
                colorName="secondary"
                style={{ opacity: 0.8 }}
              >
                Tiempo
              </AppText>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "baseline",
                  gap: 6,
                  marginTop: 6,
                }}
              >
                <AppText
                  variant="headline"
                  colorName="primary"
                  style={{ fontSize: 30 }}
                >
                  {time}
                </AppText>
                <AppText
                  variant="body"
                  colorName="secondary"
                  style={{ opacity: 0.5 }}
                >
                  min
                </AppText>
              </View>
            </View>
          </View>

          <View
            style={{
              height: 10,
              borderRadius: 999,
              backgroundColor: surfaceHighest,
              overflow: "hidden",
              flexDirection: "row",
            }}
          >
            <View
              style={{
                width: `${Math.max(0, Math.min(100, scoreValue ?? 0))}%`,
                backgroundColor: primary,
              }}
            />
            <View style={{ flex: 1, backgroundColor: `${error}33` }} />
          </View>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <AppText
              variant="labelCaps"
              colorName="secondary"
              style={{ opacity: 0.7 }}
            >
              Precisión: {scoreValue === null ? "—" : `${scoreValue}%`}
            </AppText>
            <AppText
              variant="labelCaps"
              colorName="secondary"
              style={{ opacity: 0.7 }}
            >
              Meta: 80%
            </AppText>
          </View>
        </AppCard>
      </View>
    </AppScreen>
  );
}
