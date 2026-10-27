import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  View,
  useWindowDimensions,
} from "react-native";

import { AppButton } from "@/components/design/app-button";
import { AppCard } from "@/components/design/app-card";
import { AppScreen } from "@/components/design/app-screen";
import { AppText } from "@/components/design/app-text";
import { ProgressRing } from "@/components/design/progress-ring";
import { TopAppBar } from "@/components/design/top-app-bar";
import {
  ApiError,
  Category,
  api,
  getJwtUserId,
  getStoredAccessToken,
} from "@/constants/api";
import { useThemeColor } from "@/hooks/use-theme-color";

export default function DashboardScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const primary = useThemeColor({}, "primary");
  const surfaceHighest = useThemeColor({}, "surfaceContainerHighest");
  const surfaceLow = useThemeColor({}, "surfaceContainerLow");
  const errorContainer = useThemeColor({}, "errorContainer");
  const onErrorContainer = useThemeColor({}, "onErrorContainer");
  const error = useThemeColor({}, "error");

  const [avgScore, setAvgScore] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [weeklyMinutes, setWeeklyMinutes] = useState<number | null>(null);
  const [weeklyGoalMinutes, setWeeklyGoalMinutes] = useState<number | null>(
    null,
  );
  const [lastQuestionnaireId, setLastQuestionnaireId] = useState<number | null>(
    null,
  );
  const [lastQuestionnaireName, setLastQuestionnaireName] = useState<
    string | null
  >(null);
  const [lastModule, setLastModule] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [categoriesError, setCategoriesError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      setLoadError("");
      setCategoriesError("");

      try {
        const token = await getStoredAccessToken();
        const userId = token ? getJwtUserId(token) : null;
        if (!userId) {
          setLoadError("No se pudo determinar el usuario actual desde el JWT.");
        } else {
          let avgFromDashboard: number | null = null;
          try {
            const dash = await api.users.dashboard(userId);
            const wm =
              typeof dash.weekly_study_minutes === "number"
                ? dash.weekly_study_minutes
                : null;
            const wg =
              typeof dash.weekly_goal_minutes === "number"
                ? dash.weekly_goal_minutes
                : null;
            avgFromDashboard =
              typeof dash.average_score === "number"
                ? dash.average_score
                : null;
            const lqId =
              typeof dash.last_questionnaire_id === "number"
                ? dash.last_questionnaire_id
                : null;
            const lqName =
              typeof dash.last_questionnaire_name === "string"
                ? dash.last_questionnaire_name
                : null;
            const lm =
              typeof dash.last_module === "string" ? dash.last_module : null;
            if (!cancelled) {
              setWeeklyMinutes(wm);
              setWeeklyGoalMinutes(wg);
              if (avgFromDashboard !== null) setAvgScore(avgFromDashboard);
              setLastQuestionnaireId(lqId);
              setLastQuestionnaireName(lqName);
              setLastModule(lm);
            }
          } catch {
            if (!cancelled) {
              setWeeklyMinutes(null);
              setWeeklyGoalMinutes(null);
              setLastQuestionnaireId(null);
              setLastQuestionnaireName(null);
              setLastModule(null);
            }
          }

          if (avgFromDashboard === null) {
            const responses = await api.userResponses.list({
              skip: 0,
              limit: 2000,
            });
            const mine = responses.filter((r) => r.user_id === userId);
            if (mine.length === 0) {
              if (!cancelled) setAvgScore(null);
            } else {
              const overallAvg =
                mine.reduce(
                  (acc, it) => acc + (Number.isFinite(it.score) ? it.score : 0),
                  0,
                ) / Math.max(1, mine.length);
              if (!cancelled)
                setAvgScore(Number.isFinite(overallAvg) ? overallAvg : 0);
            }
          }
        }
      } catch (err) {
        console.log("[DASHBOARD DEBUG] Error fetching avg score:", err);
        if (cancelled) return;
        if (err instanceof ApiError && err.kind === "forbidden") {
          setLoadError("No se pudieron cargar tus métricas.");
        } else {
          setLoadError(
            err instanceof ApiError
              ? err.message
              : "No se pudo cargar tu resumen.",
          );
        }
      }

      try {
        const cats = await api.categories.list();
        console.log(
          "[DASHBOARD DEBUG] Categories fetched:",
          cats,
          "length:",
          cats.length,
        );
        if (!cancelled) setCategories(cats);
      } catch (err) {
        console.log("[DASHBOARD DEBUG] Error fetching categories:", err);
        if (cancelled) return;
        setCategoriesError(
          err instanceof ApiError
            ? err.message
            : "No se pudieron cargar las categorías.",
        );
      }

      if (!cancelled) setIsLoading(false);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const categoryIcons: Record<string, string> = {
    Lógica: "account-tree",
    Matemáticas: "functions",
    "Analisis Matematico": "calculate",
    Programacion: "code",
    Programación: "code",
    Ciencias: "science",
    Lenguaje: "menu-book",
    Ingles: "language",
    "Bases de datos": "database",
    "Habilidades blandas": "psychology",
  };

  const categoryStatuses: Record<string, string> = {
    Lógica: "En progreso",
    Matemáticas: "Disponible",
    "Analisis Matematico": "Disponible",
    Programacion: "Disponible",
    Programación: "Completado",
    Ciencias: "Disponible",
    Lenguaje: "Disponible",
    Ingles: "Disponible",
    "Bases de datos": "Bloqueado",
    "Habilidades blandas": "No iniciado",
  };

  const pillarItems = useMemo(() => {
    return categories.map((cat) => ({
      key: `cat-${cat.id}`,
      title: cat.name,
      icon: categoryIcons[cat.name] || "category",
      status: categoryStatuses[cat.name] || "Disponible",
    }));
  }, [categories]);

  const isWide = width >= 900;
  const weeklyProgress =
    weeklyMinutes !== null &&
    weeklyGoalMinutes !== null &&
    weeklyGoalMinutes > 0
      ? Math.max(0, Math.min(1, weeklyMinutes / weeklyGoalMinutes))
      : null;

  return (
    <AppScreen
      safeAreaEdges={["left", "right", "bottom"]}
      header={
        <TopAppBar
          floating={false}
          title="Inicio"
          left={<MaterialIcons name="dashboard" size={22} color={primary} />}
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
      <View style={{ gap: 6 }}>
        <AppText variant="headline" colorName="onSurface">
          Resumen
        </AppText>
        {isLoading ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <ActivityIndicator color={primary} />
            <AppText
              variant="body"
              colorName="secondary"
              style={{ opacity: 0.85 }}
            >
              Cargando métricas...
            </AppText>
          </View>
        ) : (
          <AppText
            variant="body"
            colorName="secondary"
            style={{ opacity: 0.85 }}
          >
            {loadError
              ? loadError
              : avgScore === null
                ? "Sin métricas disponibles."
                : `Promedio de puntaje: ${avgScore.toFixed(1)}/100`}
          </AppText>
        )}
      </View>

      <View style={{ flexDirection: isWide ? "row" : "column", gap: 16 }}>
        <AppCard
          tone="lowest"
          style={{
            flex: isWide ? 5 : undefined,
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
          }}
        >
          <ProgressRing
            value={
              avgScore === null ? 0 : Math.max(0, Math.min(1, avgScore / 100))
            }
            label="Promedio"
          />
          <View style={{ alignItems: "center", gap: 2 }}>
            <AppText variant="title" colorName="onSurface">
              {avgScore === null
                ? "Sin datos"
                : `${Math.round(avgScore)} / 100`}
            </AppText>
            <AppText
              variant="body"
              colorName="secondary"
              style={{ fontSize: 13, opacity: 0.9 }}
            >
              Resultados basados en tus envíos de cuestionarios.
            </AppText>
          </View>
        </AppCard>

        {lastQuestionnaireId && lastQuestionnaireName ? (
          <AppCard
            tone="lowest"
            style={{
              flex: isWide ? 7 : undefined,
              padding: 0,
              overflow: "hidden",
            }}
          >
            <View
              pointerEvents="none"
              style={{
                backgroundColor: primary,
                height: "100%",
                position: "absolute",
                inset: 0,
                opacity: 0.95,
              }}
            />
            <View style={{ padding: 22, gap: 14, zIndex: 1 }}>
              <AppText
                variant="labelCaps"
                colorName="inverseOnSurface"
                style={{ opacity: 0.8 }}
              >
                Sesión activa
              </AppText>
              <AppText
                variant="headline"
                colorName="inverseOnSurface"
                style={{ fontSize: 26, lineHeight: 32 }}
              >
                Continuar {lastQuestionnaireName}
              </AppText>

              {lastModule ? (
                <View
                  style={{
                    alignSelf: "flex-start",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 999,
                    backgroundColor: "rgba(255,255,255,0.12)",
                  }}
                >
                  <MaterialIcons name="layers" size={16} color="#ffffff" />
                  <AppText variant="label" style={{ color: "#ffffff" }}>
                    {lastModule}
                  </AppText>
                </View>
              ) : null}

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  marginTop: 10,
                }}
              >
                <AppButton
                  onPress={() =>
                    router.push(
                      `/quiz/questions?quizId=${lastQuestionnaireId}` as any,
                    )
                  }
                  variant="secondary"
                  rightIcon={
                    <MaterialIcons
                      name="arrow-forward"
                      size={18}
                      color={primary}
                    />
                  }
                >
                  Reanudar sesión
                </AppButton>
              </View>
            </View>
          </AppCard>
        ) : null}
      </View>

      <View style={{ gap: 10 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "space-between",
          }}
        >
          <AppText variant="title">Pilares de Conocimiento</AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ver todos los dominios"
            onPress={() => router.push("/(tabs)/explore")}
          >
            <AppText variant="labelCaps" colorName="primary">
              Ver todos
            </AppText>
          </Pressable>
        </View>

        {categoriesError ? (
          <AppCard tone="lowest">
            <AppText variant="body" colorName="error">
              {categoriesError}
            </AppText>
          </AppCard>
        ) : (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {pillarItems.map((p) => (
              <Pressable
                key={p.key}
                accessibilityRole="button"
                accessibilityLabel={`Abrir ${p.title}`}
                onPress={() => router.push("/(tabs)/explore")}
                style={({ pressed }) => [
                  {
                    width: width >= 900 ? "19%" : width >= 520 ? "31%" : "48%",
                    borderRadius: 18,
                    padding: 16,
                    backgroundColor: surfaceLow,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ]}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: `${primary}1a`,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MaterialIcons
                    name={p.icon as any}
                    size={22}
                    color={primary}
                  />
                </View>
                <View style={{ marginTop: 12, gap: 4 }}>
                  <AppText variant="bodyStrong" colorName="onSurface">
                    {p.title}
                  </AppText>
                  <AppText
                    variant="labelCaps"
                    colorName="secondary"
                    style={{ opacity: 0.8 }}
                  >
                    {p.status}
                  </AppText>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <AppCard tone="low" style={{ gap: 12 }}>
        <View style={{ gap: 4 }}>
          <AppText variant="title">Actividad semanal</AppText>
          <AppText
            variant="body"
            colorName="secondary"
            style={{ fontSize: 13, opacity: 0.9 }}
          >
            Seguimiento de minutos de estudio en todas las áreas.
          </AppText>
        </View>
        <View
          style={{
            height: 10,
            borderRadius: 999,
            backgroundColor: surfaceHighest,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: `${Math.round(((weeklyProgress ?? 0) as number) * 100)}%`,
              height: "100%",
              backgroundColor: primary,
            }}
          />
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <AppText
            variant="labelCaps"
            colorName="secondary"
            style={{ opacity: 0.7 }}
          >
            Esta semana: {weeklyMinutes === null ? "—" : `${weeklyMinutes} min`}
          </AppText>
          <AppText
            variant="labelCaps"
            colorName="secondary"
            style={{ opacity: 0.7 }}
          >
            Meta:{" "}
            {weeklyGoalMinutes === null ? "—" : `${weeklyGoalMinutes} min`}
          </AppText>
        </View>
      </AppCard>
    </AppScreen>
  );
}
