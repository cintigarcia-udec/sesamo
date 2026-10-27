import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEffect, useState } from "react";
import { ActivityIndicator, View, useWindowDimensions } from "react-native";
import Svg, { Circle, G, Polygon } from "react-native-svg";

import { AppCard } from "@/components/design/app-card";
import { AppScreen } from "@/components/design/app-screen";
import { AppText } from "@/components/design/app-text";
import { TopAppBar } from "@/components/design/top-app-bar";
import {
  ApiError,
  api,
  getJwtUserId,
  getStoredAccessToken,
  type CategoryProgress,
} from "@/constants/api";
import { useThemeColor } from "@/hooks/use-theme-color";

type RadarPoint = { label: string; value: number };

function RadarChart({ points, size }: { points: RadarPoint[]; size: number }) {
  const primary = useThemeColor({}, "primary");
  const outlineVariant = useThemeColor({}, "outlineVariant");

  const radius = size / 2;
  const center = radius;

  const vertices = points.map((p, index) => {
    const angle = (Math.PI * 2 * index) / points.length - Math.PI / 2;
    const r = radius * 0.78 * Math.max(0, Math.min(1, p.value));
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
  });

  const polygon = vertices.map((v) => `${v.x},${v.y}`).join(" ");

  return (
    <Svg
      width={size}
      height={size}
      accessibilityLabel="Mapa radar de habilidades"
    >
      <G>
        {[1, 0.75, 0.5, 0.25].map((s) => (
          <Circle
            key={s}
            cx={center}
            cy={center}
            r={radius * 0.78 * s}
            stroke={`${outlineVariant}4d`}
            strokeWidth={1}
            fill="transparent"
          />
        ))}
        <Polygon
          points={polygon}
          fill={`${primary}33`}
          stroke={primary}
          strokeWidth={1.5}
        />
        {vertices.map((v, i) => (
          <Circle
            key={points[i]?.label ?? i}
            cx={v.x}
            cy={v.y}
            r={3}
            fill={primary}
          />
        ))}
      </G>
    </Svg>
  );
}

export default function ProgressScreen() {
  const { width } = useWindowDimensions();
  const primary = useThemeColor({}, "primary");

  const [data, setData] = useState<RadarPoint[]>([]);
  const [attemptCount, setAttemptCount] = useState(0);
  const [avgScore, setAvgScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      setError("");
      try {
        const token = await getStoredAccessToken();
        const userId = token ? getJwtUserId(token) : null;
        if (!userId) {
          setError("No se pudo determinar el usuario actual desde el JWT.");
          return;
        }

        const [dash, categoriesProgress] = await Promise.all([
          api.users.dashboard(userId),
          api.users.categoriesProgress(userId),
        ]);

        const usable = (categoriesProgress ?? []).filter(
          (c: CategoryProgress) => (c.total_questionnaires ?? 0) > 0,
        );

        const points = usable
          .slice()
          .sort((a, b) => b.total_questionnaires - a.total_questionnaires)
          .slice(0, 5)
          .map((c) => ({
            label: c.category_name,
            value: Math.max(0, Math.min(1, (c.average_score ?? 0) / 100)),
          }));

        if (cancelled) return;
        setAttemptCount(
          typeof dash.total_responses === "number" ? dash.total_responses : 0,
        );
        setAvgScore(
          Math.round(
            typeof dash.average_score === "number" ? dash.average_score : 0,
          ),
        );
        setData(points.length ? points : [{ label: "Sin datos", value: 0 }]);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.kind === "forbidden") {
          setError("No se pudo cargar tu progreso.");
        } else {
          setError(
            err instanceof ApiError ? err.message : "No se pudo cargar tu progreso.",
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const isWide = width >= 900;
  const radarSize = Math.min(isWide ? 340 : width - 100, 340);

  return (
    <AppScreen
      safeAreaEdges={["left", "right", "bottom"]}
      header={
        <TopAppBar
          floating={false}
          title="Mi Progreso"
          left={<MaterialIcons name="insights" size={22} color={primary} />}
        />
      }
      contentContainerStyle={{
        paddingTop: 18,
        paddingHorizontal: 20,
        maxWidth: 1100,
        width: "100%",
        alignSelf: "center",
        gap: 18,
      }}
    >
      <View style={{ gap: 10, marginLeft: isWide ? 24 : 0 }}>
        <AppText
          variant="display"
          colorName="primary"
          style={{ fontSize: isWide ? 72 : 52, lineHeight: isWide ? 76 : 58 }}
        >
          Mi Progreso
        </AppText>
        <AppText
          variant="body"
          colorName="secondary"
          style={{ maxWidth: 720, opacity: 0.9 }}
        >
          Análisis estructural de tus competencias en ingeniería y lógica
          computacional.
        </AppText>
      </View>

      <View style={{ flexDirection: isWide ? "row" : "column", gap: 16 }}>
        <AppCard
          tone="lowest"
          style={{
            flex: isWide ? 8 : undefined,
            minHeight: 420,
            justifyContent: "space-between",
          }}
        >
          <View style={{ gap: 6 }}>
            <AppText
              variant="labelCaps"
              colorName="secondary"
              style={{ opacity: 0.8 }}
            >
              Perfil de Competencias
            </AppText>
            <AppText variant="title">Mapa Radar de Habilidades</AppText>
            {isLoading ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  marginTop: 6,
                }}
              >
                <ActivityIndicator color={primary} />
                <AppText variant="body" colorName="secondary">
                  Cargando progreso...
                </AppText>
              </View>
            ) : error ? (
              <AppText
                variant="body"
                colorName="secondary"
                style={{ marginTop: 6 }}
              >
                {error}
              </AppText>
            ) : null}
          </View>

          <View
            style={{
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 18,
            }}
          >
            <RadarChart points={data} size={radarSize} />
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {data.map((d) => (
              <View
                key={d.label}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: `${primary}14`,
                }}
              >
                <AppText variant="labelCaps" colorName="primary">
                  {d.label} {Math.round(d.value * 100)}%
                </AppText>
              </View>
            ))}
          </View>
        </AppCard>

        <View style={{ flex: isWide ? 4 : undefined, gap: 16 }}>
          <AppCard tone="low" style={{ gap: 10 }}>
            <AppText
              variant="labelCaps"
              colorName="secondary"
              style={{ opacity: 0.8 }}
            >
              Resumen
            </AppText>
            <AppText
              variant="headline"
              colorName="onSurface"
              style={{ fontSize: 26 }}
            >
              {attemptCount} intentos
            </AppText>
            <AppText
              variant="body"
              colorName="secondary"
              style={{ fontSize: 13, opacity: 0.9 }}
            >
              Total de evaluaciones registradas en tu historial.
            </AppText>
          </AppCard>

          <AppCard tone="highest" style={{ gap: 10 }}>
            <AppText
              variant="labelCaps"
              colorName="secondary"
              style={{ opacity: 0.8 }}
            >
              Promedio
            </AppText>
            <AppText
              variant="headline"
              colorName="primary"
              style={{ fontSize: 26 }}
            >
              {avgScore}/100
            </AppText>
            <AppText
              variant="body"
              colorName="secondary"
              style={{ fontSize: 13, opacity: 0.9 }}
            >
              Promedio de puntaje en tus intentos.
            </AppText>
          </AppCard>
        </View>
      </View>
    </AppScreen>
  );
}
