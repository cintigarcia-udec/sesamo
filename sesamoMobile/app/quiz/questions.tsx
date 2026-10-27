import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from "react-native";

import { AppButton } from "@/components/design/app-button";
import { AppCard } from "@/components/design/app-card";
import { AppScreen } from "@/components/design/app-screen";
import { AppText } from "@/components/design/app-text";
import { CodeBlock } from "@/components/design/code-block";
import { TopAppBar } from "@/components/design/top-app-bar";
import {
  ApiError,
  api,
  getJwtPayload,
  getJwtUserId,
  getStoredAccessToken,
  type AnswerOption,
  type Question as ApiQuestion,
} from "@/constants/api";
import { useThemeColor } from "@/hooks/use-theme-color";

type QuizQuestion = {
  id: number;
  title: string;
  contextLabel: string;
  code: string;
  options: {
    key: string;
    title: string;
    subtitle: string;
    correct?: boolean;
  }[];
};

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function QuizQuestionsScreen() {
  const router = useRouter();
  const { quizId } = useLocalSearchParams<{ quizId?: string }>();
  const { width } = useWindowDimensions();

  const primary = useThemeColor({}, "primary");
  const primaryContainer = useThemeColor({}, "primaryContainer");
  const secondary = useThemeColor({}, "secondary");
  const surfaceHighest = useThemeColor({}, "surfaceContainerHighest");
  const surfaceLowest = useThemeColor({}, "surfaceContainerLowest");
  const outlineVariant = useThemeColor({}, "outlineVariant");

  const questionnaireId = useMemo(() => {
    const num = typeof quizId === "string" ? Number(quizId) : NaN;
    return Number.isFinite(num) ? num : null;
  }, [quizId]);

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const total = questions.length;
  const [index, setIndex] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(15 * 60);
  const [loadError, setLoadError] = useState("");
  const [answersByQuestionId, setAnswersByQuestionId] = useState<
    Record<number, string>
  >({});
  const [initials, setInitials] = useState("U");

  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);

  const isAppActiveRef = useRef(AppState.currentState === "active");
  const activeStartMsRef = useRef<number | null>(
    isAppActiveRef.current ? Date.now() : null,
  );
  const activeAccumulatedMsRef = useRef(0);
  const didSubmitOnTimeoutRef = useRef(false);

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

  const getDurationSeconds = () => {
    const now = Date.now();
    let activeMs = activeAccumulatedMsRef.current;
    if (activeStartMsRef.current !== null) {
      activeMs += now - activeStartMsRef.current;
    }
    return Math.max(0, Math.round(activeMs / 1000));
  };

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      const now = Date.now();
      const nextIsActive = nextState === "active";
      const prevIsActive = isAppActiveRef.current;
      isAppActiveRef.current = nextIsActive;

      if (prevIsActive && !nextIsActive) {
        if (activeStartMsRef.current !== null) {
          activeAccumulatedMsRef.current += now - activeStartMsRef.current;
          activeStartMsRef.current = null;
        }
      }

      if (!prevIsActive && nextIsActive) {
        if (activeStartMsRef.current === null) {
          activeStartMsRef.current = now;
        }
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchAll = async <T,>(
      fetchPage: (args: { skip: number; limit: number }) => Promise<T[]>,
      limit: number,
      max: number,
    ) => {
      const out: T[] = [];
      for (let skip = 0; skip < max; skip += limit) {
        const page = await fetchPage({ skip, limit });
        out.push(...page);
        if (page.length < limit) break;
      }
      return out;
    };

    const buildQuizQuestions = (qs: ApiQuestion[], options: AnswerOption[]) => {
      const optionsByQuestionId = new Map<number, AnswerOption[]>();
      for (const opt of options) {
        const prev = optionsByQuestionId.get(opt.question_id) ?? [];
        prev.push(opt);
        optionsByQuestionId.set(opt.question_id, prev);
      }

      return qs.map<QuizQuestion>((q) => {
        const opts = (optionsByQuestionId.get(q.id) ?? [])
          .slice()
          .sort((a, b) => a.option_key.localeCompare(b.option_key));
        return {
          id: q.id,
          title: q.question_text,
          contextLabel: "Pregunta",
          code: "",
          options: opts.map((o) => ({
            key: o.option_key,
            title: o.answer,
            subtitle: "",
            correct: o.is_correct ?? undefined,
          })),
        };
      });
    };

    const run = async () => {
      setIsLoadingQuestions(true);
      setIsLoadingOptions(true);
      setLoadError("");
      setIndex(0);
      setSelectedKey(null);
      setCorrectCount(0);
      setAnswersByQuestionId({});
      setSecondsLeft(15 * 60);
      activeAccumulatedMsRef.current = 0;
      activeStartMsRef.current = isAppActiveRef.current ? Date.now() : null;

      if (!questionnaireId) {
        setLoadError("Id de cuestionario inválido.");
        setIsLoadingQuestions(false);
        setIsLoadingOptions(false);
        return;
      }

      try {
        const [allQuestions, allOptions] = await Promise.all([
          fetchAll((args) => api.questions.list(args), 250, 2000),
          fetchAll((args) => api.answerOptions.list(args), 500, 5000),
        ]);

        const filteredQuestions = allQuestions.filter(
          (q) => q.questionnaire_id === questionnaireId,
        );
        const questionIds = new Set(filteredQuestions.map((q) => q.id));
        const filteredOptions = allOptions.filter((o) =>
          questionIds.has(o.question_id),
        );

        const built = buildQuizQuestions(filteredQuestions, filteredOptions);

        if (cancelled) return;
        setQuestions(built);
        if (built.length === 0) {
          setLoadError(
            "No hay preguntas disponibles para este cuestionario. (Actualmente la API no expone filtros por questionnaire_id para /questions/).",
          );
        }
      } catch (err) {
        if (cancelled) return;
        setLoadError(
          err instanceof ApiError
            ? err.message
            : "No se pudieron cargar las preguntas. Intenta nuevamente.",
        );
      } finally {
        if (!cancelled) {
          setIsLoadingQuestions(false);
          setIsLoadingOptions(false);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [questionnaireId]);

  const q = questions[index] ?? questions[0];
  const progress = total > 0 ? (index + 1) / total : 0;

  useEffect(() => {
    const id = setInterval(() => {
      if (!isAppActiveRef.current) return;
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (secondsLeft === 0) {
      if (didSubmitOnTimeoutRef.current) return;
      didSubmitOnTimeoutRef.current = true;

      const run = async () => {
        const durationSeconds = getDurationSeconds();
        const timeSpent = formatTime(durationSeconds);

        const localScore =
          total > 0 ? Math.round((correctCount / total) * 100) : 0;

        let scoreForResults: number = localScore;
        let correctForResults: number = correctCount;
        const hasAnyCorrectOption = questions.some((qq) =>
          qq.options.some((o) => o.correct === true),
        );

        let submitError = "";
        try {
          const token = await getStoredAccessToken();
          const userId = token ? getJwtUserId(token) : null;
          if (!userId) {
            submitError =
              "No se pudo determinar el usuario actual desde el JWT (falta user_id/sub).";
          } else if (!questionnaireId) {
            submitError = "Id de cuestionario inválido.";
          } else {
            const created = await api.userResponses.create({
              user_id: userId,
              questionnaire_id: questionnaireId,
              answers: answersByQuestionId,
              duration_seconds: durationSeconds,
            });

            if (
              typeof created.score === "number" &&
              Number.isFinite(created.score)
            ) {
              scoreForResults = created.score;
              if (!hasAnyCorrectOption && total > 0) {
                correctForResults = Math.round((created.score / 100) * total);
              }
            }
          }
        } catch (err) {
          submitError =
            err instanceof ApiError
              ? err.message
              : "No se pudo enviar el resultado.";
        }

        router.replace({
          pathname: "/quiz/results" as any,
          params: {
            score: String(scoreForResults),
            correct: String(correctForResults),
            total: String(total),
            time: timeSpent,
            submitError,
          },
        });
      };

      run();
    }
  }, [
    secondsLeft,
    correctCount,
    total,
    router,
    answersByQuestionId,
    questionnaireId,
    questions,
  ]);

  const isWide = width >= 900;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    if (
      !selectedKey ||
      isSubmitting ||
      isLoadingQuestions ||
      isLoadingOptions ||
      !q
    ) {
      return;
    }
    setIsSubmitting(true);

    const isCorrect =
      q.options.find((o) => o.key === selectedKey)?.correct === true;
    const nextCorrectCount = correctCount + (isCorrect ? 1 : 0);
    const isLast = index + 1 >= total;

    setAnswersByQuestionId((prev) => ({ ...prev, [q.id]: selectedKey }));
    setCorrectCount(nextCorrectCount);
    setSelectedKey(null);

    if (isLast) {
      const score =
        total > 0 ? Math.round((nextCorrectCount / total) * 100) : 0;
      const durationSeconds = getDurationSeconds();
      const timeSpent = formatTime(durationSeconds);

      const hasAnyCorrectOption = questions.some((qq) =>
        qq.options.some((o) => o.correct === true),
      );

      let scoreForResults: number = score;
      let correctForResults: number = nextCorrectCount;

      let submitError = "";
      try {
        const token = await getStoredAccessToken();
        const userId = token ? getJwtUserId(token) : null;
        if (!userId) {
          submitError =
            "No se pudo determinar el usuario actual desde el JWT (falta user_id/sub).";
        } else if (!questionnaireId) {
          submitError = "Id de cuestionario inválido.";
        } else {
          const answers = { ...answersByQuestionId, [q.id]: selectedKey };
          const payload = {
            user_id: userId,
            questionnaire_id: questionnaireId,
            answers,
            duration_seconds: durationSeconds,
          };
          const created = await api.userResponses.create(payload);
          if (
            typeof created.score === "number" &&
            Number.isFinite(created.score)
          ) {
            scoreForResults = created.score;
            if (!hasAnyCorrectOption && total > 0) {
              correctForResults = Math.round((created.score / 100) * total);
            }
          }
        }
      } catch (err) {
        submitError =
          err instanceof ApiError
            ? err.message
            : "No se pudo enviar el resultado.";
      }

      router.replace({
        pathname: "/quiz/results" as any,
        params: {
          score: String(scoreForResults),
          correct: String(correctForResults),
          total: String(total),
          time: timeSpent,
          submitError,
        },
      });
      setIsSubmitting(false);
      return;
    }

    setIndex((i) => i + 1);
    setIsSubmitting(false);
  };

  const isLastQuestion = index + 1 >= total;
  const canInteract = !isLoadingQuestions && !isLoadingOptions && !isSubmitting;

  return (
    <AppScreen
      scroll={false}
      safeAreaEdges={["left", "right", "bottom"]}
      header={
        <TopAppBar
          floating={false}
          title={undefined}
          left={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar evaluación"
              onPress={() => router.back()}
              style={({ pressed }) => [
                {
                  padding: 8,
                  borderRadius: 999,
                  backgroundColor: pressed
                    ? `${surfaceHighest}cc`
                    : "transparent",
                },
              ]}
            >
              <MaterialIcons name="close" size={22} color={secondary} />
            </Pressable>
          }
          right={
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  backgroundColor: surfaceHighest,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 12,
                }}
              >
                <MaterialIcons name="timer" size={18} color={primary} />
                <AppText
                  variant="bodyStrong"
                  colorName="onSurface"
                  style={{ fontVariant: ["tabular-nums"] }}
                >
                  {formatTime(secondsLeft)}
                </AppText>
              </View>
              <View
                accessibilityLabel="Perfil"
                style={{
                  width: 38,
                  height: 38,
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
            </View>
          }
        />
      }
    >
      <View style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 130,
            maxWidth: 980,
            width: "100%",
            alignSelf: "center",
          }}
        >
          <View style={{ marginBottom: 14, gap: 12 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-end",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <View style={{ gap: 4 }}>
                <AppText
                  variant="labelCaps"
                  colorName="secondary"
                  style={{ opacity: 0.8 }}
                >
                  Progreso de evaluación
                </AppText>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "baseline",
                    gap: 10,
                  }}
                >
                  <AppText
                    variant="headline"
                    colorName="primary"
                    style={{ fontSize: 52, lineHeight: 56 }}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </AppText>
                  <AppText
                    variant="headline"
                    colorName="outlineVariant"
                    style={{ fontSize: 22 }}
                  >
                    / {total}
                  </AppText>
                </View>
              </View>
              <View
                style={{
                  flex: 1,
                  maxWidth: 360,
                  height: 6,
                  borderRadius: 999,
                  backgroundColor: surfaceHighest,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    width: `${Math.round(progress * 100)}%`,
                    height: "100%",
                    borderRadius: 999,
                    backgroundColor: primary,
                  }}
                />
                <View
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundColor: primaryContainer,
                    opacity: 0.25,
                  }}
                />
              </View>
            </View>
          </View>

          {isLoadingQuestions ? (
            <AppCard tone="low" style={{ padding: 22, gap: 12 }}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <ActivityIndicator color={primary} />
                <View style={{ flex: 1, gap: 4 }}>
                  <AppText variant="bodyStrong">Cargando preguntas</AppText>
                  <AppText
                    variant="label"
                    colorName="secondary"
                    style={{ opacity: 0.85 }}
                  >
                    Preparando el cuestionario...
                  </AppText>
                </View>
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
                    width: "42%",
                    height: "100%",
                    backgroundColor: primary,
                    opacity: 0.8,
                  }}
                />
              </View>
            </AppCard>
          ) : loadError || !q ? (
            <AppCard tone="low" style={{ padding: 22, gap: 10 }}>
              <AppText variant="bodyStrong">
                No se pudo cargar el cuestionario
              </AppText>
              <AppText variant="body" colorName="secondary">
                {loadError || "No hay preguntas disponibles."}
              </AppText>
              <AppButton
                variant="secondary"
                onPress={() => router.back()}
                leftIcon={
                  <MaterialIcons
                    name="arrow-back"
                    size={18}
                    color={secondary}
                  />
                }
              >
                Volver
              </AppButton>
            </AppCard>
          ) : (
            <View style={{ flexDirection: isWide ? "row" : "column", gap: 16 }}>
              <View style={{ flex: isWide ? 7 : undefined, gap: 12 }}>
                <AppCard tone="low" style={{ padding: 22, gap: 14 }}>
                  <View style={{ gap: 6 }}>
                    <AppText
                      variant="labelCaps"
                      colorName="secondary"
                      style={{ opacity: 0.8 }}
                    >
                      Pregunta
                    </AppText>
                    <AppText
                      variant="headline"
                      colorName="onSurface"
                      style={{ fontSize: 24, lineHeight: 30 }}
                    >
                      {q.title}
                    </AppText>
                  </View>
                  <View style={{ gap: 10 }}>
                    <AppText
                      variant="labelCaps"
                      colorName="secondary"
                      style={{ opacity: 0.8 }}
                    >
                      {q.contextLabel}
                    </AppText>
                    {q.code ? <CodeBlock>{q.code}</CodeBlock> : null}
                  </View>
                </AppCard>
              </View>

              <View style={{ flex: isWide ? 5 : undefined, gap: 10 }}>
                <View style={{ gap: 4, paddingHorizontal: 6 }}>
                  <AppText
                    variant="labelCaps"
                    colorName="secondary"
                    style={{ opacity: 0.8 }}
                  >
                    Opciones
                  </AppText>
                  <AppText
                    variant="label"
                    colorName="secondary"
                    style={{ opacity: 0.75 }}
                  >
                    Selecciona una opción. Las opciones se cargan por pregunta.
                  </AppText>
                </View>

                {isLoadingOptions ? (
                  <AppCard
                    tone="low"
                    style={{
                      padding: 16,
                      borderRadius: 18,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <ActivityIndicator color={primary} />
                    <View style={{ flex: 1 }}>
                      <AppText variant="bodyStrong">Cargando opciones</AppText>
                      <AppText
                        variant="label"
                        colorName="secondary"
                        style={{ opacity: 0.85 }}
                      >
                        Preparando opciones de respuesta...
                      </AppText>
                    </View>
                  </AppCard>
                ) : (
                  q.options.map((opt) => {
                    const selected = opt.key === selectedKey;
                    return (
                      <Pressable
                        key={opt.key}
                        accessibilityRole="button"
                        accessibilityLabel={`Opción ${opt.key}: ${opt.title}`}
                        disabled={!canInteract}
                        onPress={() => setSelectedKey(opt.key)}
                        style={({ pressed }) => [
                          {
                            borderRadius: 18,
                            padding: 16,
                            backgroundColor: selected
                              ? surfaceLowest
                              : surfaceHighest,
                            transform: [{ scale: pressed ? 0.99 : 1 }],
                            borderWidth: selected ? 2 : 1,
                            borderColor: selected
                              ? primary
                              : `${outlineVariant}33`,
                            opacity: !canInteract ? 0.6 : 1,
                          },
                        ]}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 14,
                          }}
                        >
                          <View
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 12,
                              backgroundColor: selected
                                ? primary
                                : surfaceLowest,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <AppText
                              variant="bodyStrong"
                              style={{ color: selected ? "#ffffff" : primary }}
                            >
                              {opt.key}
                            </AppText>
                          </View>
                          <View style={{ flex: 1, gap: 2 }}>
                            <AppText
                              variant="title"
                              style={{
                                fontSize: 18,
                                color: selected ? primary : undefined,
                              }}
                            >
                              {opt.title}
                            </AppText>
                            <AppText
                              variant="label"
                              colorName={selected ? "primary" : "secondary"}
                              style={{ opacity: selected ? 0.75 : 0.8 }}
                            >
                              {opt.subtitle}
                            </AppText>
                          </View>
                          {selected ? (
                            <MaterialIcons
                              name="check-circle"
                              size={20}
                              color={primary}
                            />
                          ) : null}
                        </View>
                      </Pressable>
                    );
                  })
                )}

                {isLastQuestion ? (
                  <AppCard
                    tone="lowest"
                    style={{
                      marginTop: 12,
                      padding: 16,
                      borderRadius: 18,
                      gap: 8,
                    }}
                  >
                    <AppText
                      variant="labelCaps"
                      colorName="secondary"
                      style={{ opacity: 0.8 }}
                    >
                      Enviar respuestas
                    </AppText>
                    <AppText
                      variant="label"
                      colorName="secondary"
                      style={{ opacity: 0.85 }}
                    >
                      Al finalizar guardaremos tu intento y verás tu resultado.
                    </AppText>
                  </AppCard>
                ) : null}
              </View>
            </View>
          )}
        </ScrollView>

        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: 20,
            paddingTop: 14,
            paddingBottom: 18,
            borderTopWidth: 1,
            borderTopColor: `${outlineVariant}33`,
            backgroundColor: surfaceHighest,
          }}
        >
          <View
            style={{
              maxWidth: 980,
              width: "100%",
              alignSelf: "center",
              gap: 8,
            }}
          >
            <AppText
              variant="label"
              colorName="secondary"
              style={{ opacity: 0.8 }}
            >
              {isLoadingQuestions
                ? "Cargando preguntas…"
                : isLoadingOptions
                  ? "Cargando opciones…"
                  : isLastQuestion
                    ? "Última pregunta: confirma para enviar el intento."
                    : "Confirma para continuar a la siguiente pregunta."}
            </AppText>
            <AppButton
              disabled={!selectedKey || !canInteract}
              onPress={submit}
              rightIcon={
                <MaterialIcons name="arrow-forward" size={18} color="#ffffff" />
              }
            >
              {isSubmitting
                ? "Enviando..."
                : isLastQuestion
                  ? "Enviar respuestas"
                  : "Confirmar"}
            </AppButton>
          </View>
        </View>
      </View>
    </AppScreen>
  );
}
