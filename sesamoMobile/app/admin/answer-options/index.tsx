import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  View,
  useWindowDimensions,
} from "react-native";

import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { AdminShell } from "@/components/admin/admin-shell";
import { AppButton } from "@/components/design/app-button";
import { AppCard } from "@/components/design/app-card";
import { AppInput } from "@/components/design/app-input";
import { AppText } from "@/components/design/app-text";
import {
  ApiError,
  api,
  type AnswerOption,
  type Question,
} from "@/constants/api";
import { useThemeColor } from "@/hooks/use-theme-color";

export default function AdminAnswerOptionsScreen() {
  const { width } = useWindowDimensions();
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<AnswerOption[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(
    null,
  );
  const [isQuestionPickerOpen, setIsQuestionPickerOpen] = useState(false);
  const [isQuestionIdPickerOpen, setIsQuestionIdPickerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<AnswerOption | null>(null);
  const [answer, setAnswer] = useState("");
  const [optionKey, setOptionKey] = useState("");
  const [questionId, setQuestionId] = useState("");
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const surfaceLow = useThemeColor({}, "surfaceContainerLow");
  const surfaceLowest = useThemeColor({}, "surfaceContainerLowest");
  const modalSectionBackground = useThemeColor({}, "surfaceContainerHighest");
  const outlineVariant = useThemeColor({}, "outlineVariant");
  const errorColor = useThemeColor({}, "error");
  const primary = useThemeColor({}, "primary");
  const secondary = useThemeColor({}, "secondary");
  const onSurface = useThemeColor({}, "onSurface");
  const primaryContainer = useThemeColor({}, "primaryContainer");
  const onPrimaryContainer = useThemeColor({}, "onPrimaryContainer");

  const isWide = width >= 900;

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [items, qs] = await Promise.all([
        api.answerOptions.list({
          skip: 0,
          limit: 5000,
          question_id: selectedQuestionId ?? undefined,
        }),
        api.questions.list({ skip: 0, limit: 5000 }),
      ]);
      setOptions(items);
      setQuestions(qs);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudieron cargar las opciones.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [selectedQuestionId]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedQuestionLabel = useMemo(() => {
    if (!selectedQuestionId) return "Todas";
    const q = questions.find((it) => it.id === selectedQuestionId);
    if (!q) return `question_id: ${selectedQuestionId}`;
    return `#${q.id} · ${q.question_text}`;
  }, [questions, selectedQuestionId]);

  const selectedFormQuestionLabel = useMemo(() => {
    const qId = Number(questionId.trim());
    if (!Number.isFinite(qId) || qId <= 0) return "Selecciona una pregunta";
    const q = questions.find((it) => it.id === qId);
    if (!q) return `#${qId}`;
    return `#${q.id} · ${q.question_text}`;
  }, [questionId, questions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => {
      const hay =
        `${o.answer} ${o.option_key} ${o.question_id} ${o.id}`.toLowerCase();
      return hay.includes(q);
    });
  }, [options, search]);

  const openCreate = () => {
    setEditing(null);
    setAnswer("");
    setOptionKey("A");
    setQuestionId(selectedQuestionId ? String(selectedQuestionId) : "");
    setIsCorrect(false);
    setFormError("");
    setIsModalOpen(true);
  };

  const openEdit = (o: AnswerOption) => {
    setEditing(o);
    setAnswer(o.answer);
    setOptionKey(o.option_key);
    setQuestionId(String(o.question_id));
    setIsCorrect(typeof o.is_correct === "boolean" ? o.is_correct : false);
    setFormError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSaving) return;
    setIsQuestionIdPickerOpen(false);
    setIsModalOpen(false);
  };

  const save = async () => {
    if (isSaving) return;
    const a = answer.trim();
    const k = optionKey.trim().toUpperCase();
    const qId = Number(questionId.trim());
    if (!a) {
      setFormError("answer es requerido.");
      return;
    }
    if (!k || k.length !== 1 || !["A", "B", "C", "D"].includes(k)) {
      setFormError("option_key debe ser A, B, C o D.");
      return;
    }
    if (!Number.isFinite(qId) || qId <= 0) {
      setFormError("question_id debe ser un entero positivo.");
      return;
    }
    setIsSaving(true);
    setFormError("");
    try {
      if (editing) {
        await api.answerOptions.update(editing.id, {
          answer: a,
          option_key: k,
          question_id: qId,
          is_correct: isCorrect,
        });
      } else {
        await api.answerOptions.create({
          answer: a,
          option_key: k,
          question_id: qId,
          is_correct: isCorrect,
        });
      }
      setIsModalOpen(false);
      await load();
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "No se pudo guardar la opción.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (id: number) => {
    try {
      await api.answerOptions.delete(id);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo eliminar la opción.",
      );
    }
  };

  return (
    <AdminShell active="answer-options" title="Opciones de respuesta">
      <View style={{ gap: 10, marginLeft: isWide ? 16 : 0 }}>
        <AppText
          variant="labelCaps"
          colorName="primary"
          style={{ opacity: 0.9 }}
        >
          Centro de Gestión
        </AppText>
        <AppText
          variant="headline"
          style={{
            fontSize: isWide ? 48 : 36,
            lineHeight: isWide ? 56 : 44,
          }}
        >
          Opciones de respuesta
        </AppText>
        <AppText
          variant="body"
          colorName="secondary"
          style={{ opacity: 0.9, maxWidth: 760 }}
        >
          Crea opciones (A–D) para preguntas específicas y marca la correcta.
        </AppText>
      </View>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 14,
          marginTop: 14,
        }}
      >
        <AppCard
          tone="highest"
          style={{
            width: width >= 900 ? "32%" : "100%",
            gap: 8,
            backgroundColor: primaryContainer,
          }}
        >
          <MaterialIcons name="list" size={22} color={onPrimaryContainer} />
          <AppText
            variant="labelCaps"
            style={{ color: onPrimaryContainer, opacity: 0.8 }}
          >
            Total de opciones
          </AppText>
          <AppText
            variant="headline"
            style={{ color: onPrimaryContainer, fontSize: 34 }}
          >
            {options.length}
          </AppText>
        </AppCard>
      </View>

      <AppCard
        tone="lowest"
        style={{
          borderRadius: 22,
          padding: 14,
          marginTop: 14,
          gap: 12,
        }}
      >
        <View style={{ flexDirection: isWide ? "row" : "column", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <AppText
              variant="labelCaps"
              colorName="secondary"
              style={{ opacity: 0.8, marginBottom: 8 }}
            >
              Filtrar por pregunta
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Seleccionar pregunta para filtrar"
              onPress={() => setIsQuestionPickerOpen(true)}
              style={({ pressed }) => [
                {
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  backgroundColor: pressed ? surfaceLow : surfaceLowest,
                  borderWidth: 1,
                  borderColor: outlineVariant,
                },
              ]}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <AppText variant="bodyStrong" numberOfLines={1}>
                  {selectedQuestionLabel}
                </AppText>
                <MaterialIcons name="expand-more" size={22} color={secondary} />
              </View>
            </Pressable>
          </View>
        </View>

        <View style={{ flexDirection: isWide ? "row" : "column", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <AppInput
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar por texto o ID..."
              accessibilityLabel="Buscar opciones"
            />
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <AppButton
              variant="secondary"
              onPress={load}
              leftIcon={
                <MaterialIcons name="refresh" size={18} color={secondary} />
              }
            >
              Actualizar
            </AppButton>
            <AppButton
              variant="tertiary"
              onPress={openCreate}
              leftIcon={<MaterialIcons name="add" size={18} color={primary} />}
            >
              Nuevo
            </AppButton>
          </View>
        </View>
      </AppCard>

      <View style={{ gap: 8, marginTop: 14, paddingBottom: 40 }}>
        {isLoading ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <ActivityIndicator color={primary} />
            <AppText variant="body" colorName="secondary">
              Cargando...
            </AppText>
          </View>
        ) : error ? (
          <AppText variant="body" colorName="secondary">
            {error}
          </AppText>
        ) : filtered.length === 0 ? (
          <AppText variant="body" colorName="secondary">
            No hay opciones.
          </AppText>
        ) : (
          filtered.map((o) => (
            <Pressable
              key={o.id}
              style={({ pressed }) => [
                {
                  borderRadius: 14,
                  padding: 16,
                  backgroundColor: pressed ? surfaceLow : surfaceLowest,
                },
              ]}
            >
              <View
                style={{
                  flexDirection: width >= 720 ? "row" : "column",
                  alignItems: width >= 720 ? "center" : "flex-start",
                  justifyContent: "space-between",
                  gap: 16,
                }}
              >
                <View style={{ gap: 4, flex: 1 }}>
                  <AppText variant="title">
                    {o.option_key}. {o.answer}
                  </AppText>
                  <AppText
                    variant="labelCaps"
                    colorName={o.is_correct ? "primary" : "secondary"}
                  >
                    {o.is_correct ? "Correcta" : "Sin marcar"} | question_id:{" "}
                    {o.question_id} | ID: {o.id}
                  </AppText>
                </View>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <AppButton variant="secondary" onPress={() => openEdit(o)}>
                    Editar
                  </AppButton>
                  <AppButton
                    variant="secondary"
                    textStyle={{ color: errorColor }}
                    onPress={() => remove(o.id)}
                  >
                    Eliminar
                  </AppButton>
                </View>
              </View>
            </Pressable>
          ))
        )}
      </View>

      <Modal
        visible={isModalOpen}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <Pressable
          onPress={closeModal}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.45)",
            padding: 18,
            justifyContent: "center",
          }}
        >
          <Pressable
            onPress={() => {}}
            style={{ width: "100%", maxWidth: 680, alignSelf: "center" }}
          >
            <AppCard tone="lowest" style={{ gap: 14 }}>
              <View style={{ gap: 4 }}>
                <AppText variant="title" colorName="primary">
                  {editing ? "Editar opción" : "Crear opción"}
                </AppText>
                <AppText
                  variant="label"
                  colorName="secondary"
                  style={{ opacity: 0.85 }}
                >
                  Define el texto de la opción, su letra (A–D) y la pregunta a
                  la que pertenece.
                </AppText>
              </View>

              <View style={{ gap: 10 }}>
                <AppText
                  variant="labelCaps"
                  colorName="secondary"
                  style={{ opacity: 0.8 }}
                >
                  Texto de la opción
                </AppText>
                <AppInput
                  value={answer}
                  onChangeText={setAnswer}
                  placeholder="Ej: O(log n)"
                  multiline
                  containerStyle={{ minHeight: 48 }}
                />
              </View>

              <View
                style={{
                  padding: 12,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: outlineVariant,
                  backgroundColor: modalSectionBackground,
                  gap: 12,
                }}
              >
                <View style={{ gap: 10 }}>
                  <AppText
                    variant="labelCaps"
                    colorName="secondary"
                    style={{ opacity: 0.8 }}
                  >
                    Letra (A–D)
                  </AppText>
                  <View
                    style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}
                  >
                    {(["A", "B", "C", "D"] as const).map((k) => {
                      const selected = optionKey.trim().toUpperCase() === k;
                      return (
                        <Pressable
                          key={k}
                          onPress={() => setOptionKey(k)}
                          accessibilityRole="button"
                          accessibilityLabel={`Seleccionar opción ${k}`}
                          style={({ pressed }) => [
                            {
                              minWidth: 44,
                              height: 42,
                              paddingHorizontal: 14,
                              borderRadius: 999,
                              alignItems: "center",
                              justifyContent: "center",
                              borderWidth: 1,
                              borderColor: selected ? primary : outlineVariant,
                              backgroundColor: pressed
                                ? `${primary}14`
                                : selected
                                  ? `${primary}1a`
                                  : surfaceLowest,
                            },
                          ]}
                        >
                          <AppText
                            variant="bodyStrong"
                            style={{ color: selected ? primary : onSurface }}
                          >
                            {k}
                          </AppText>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View style={{ gap: 10 }}>
                  <AppText
                    variant="labelCaps"
                    colorName="secondary"
                    style={{ opacity: 0.8 }}
                  >
                    QUESTION_ID
                  </AppText>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Seleccionar pregunta"
                    disabled={isSaving}
                    onPress={() => setIsQuestionIdPickerOpen(true)}
                    style={({ pressed }) => [
                      {
                        borderRadius: 12,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        backgroundColor: pressed ? surfaceLow : surfaceLowest,
                        borderWidth: 1,
                        borderColor: outlineVariant,
                        opacity: isSaving ? 0.6 : 1,
                      },
                    ]}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <AppText variant="bodyStrong" numberOfLines={1}>
                        {selectedFormQuestionLabel}
                      </AppText>
                      <MaterialIcons
                        name="expand-more"
                        size={22}
                        color={secondary}
                      />
                    </View>
                  </Pressable>
                </View>
              </View>

              <View style={{ gap: 10 }}>
                <AppText
                  variant="labelCaps"
                  colorName="secondary"
                  style={{ opacity: 0.8 }}
                >
                  Correcta
                </AppText>
                <View
                  style={{
                    flexDirection: width >= 520 ? "row" : "column",
                    gap: 10,
                  }}
                >
                  <Pressable
                    onPress={() => setIsCorrect(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Marcar como correcta"
                    style={({ pressed }) => [
                      {
                        flex: width >= 520 ? 1 : undefined,
                        borderRadius: 12,
                        paddingVertical: 12,
                        paddingHorizontal: 12,
                        borderWidth: 1,
                        borderColor:
                          isCorrect === true ? primary : outlineVariant,
                        backgroundColor: pressed
                          ? `${primary}14`
                          : isCorrect === true
                            ? `${primary}1a`
                            : surfaceLowest,
                        alignItems: "center",
                      },
                    ]}
                  >
                    <AppText
                      variant="bodyStrong"
                      style={{
                        color: isCorrect === true ? primary : onSurface,
                      }}
                    >
                      Sí
                    </AppText>
                  </Pressable>

                  <Pressable
                    onPress={() => setIsCorrect(false)}
                    accessibilityRole="button"
                    accessibilityLabel="Marcar como incorrecta"
                    style={({ pressed }) => [
                      {
                        flex: width >= 520 ? 1 : undefined,
                        borderRadius: 12,
                        paddingVertical: 12,
                        paddingHorizontal: 12,
                        borderWidth: 1,
                        borderColor:
                          isCorrect === false ? secondary : outlineVariant,
                        backgroundColor: pressed
                          ? `${secondary}14`
                          : isCorrect === false
                            ? `${secondary}1a`
                            : surfaceLowest,
                        alignItems: "center",
                      },
                    ]}
                  >
                    <AppText
                      variant="bodyStrong"
                      style={{
                        color: isCorrect === false ? secondary : onSurface,
                      }}
                    >
                      No
                    </AppText>
                  </Pressable>
                </View>
              </View>

              {formError ? (
                <View
                  style={{
                    backgroundColor: `${errorColor}22`,
                    borderRadius: 12,
                    padding: 12,
                  }}
                >
                  <AppText variant="label" colorName="error">
                    {formError}
                  </AppText>
                </View>
              ) : null}

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  gap: 10,
                }}
              >
                <AppButton variant="tertiary" onPress={closeModal}>
                  Cancelar
                </AppButton>
                <AppButton onPress={save}>
                  {isSaving ? "Guardando..." : "Guardar"}
                </AppButton>
              </View>
            </AppCard>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={isQuestionPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsQuestionPickerOpen(false)}
      >
        <Pressable
          onPress={() => setIsQuestionPickerOpen(false)}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.45)",
            padding: 18,
            justifyContent: "center",
          }}
        >
          <Pressable
            onPress={() => {}}
            style={{ width: "100%", maxWidth: 720, alignSelf: "center" }}
          >
            <AppCard tone="lowest" style={{ gap: 12 }}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <AppText variant="title" colorName="primary">
                  Filtrar por pregunta
                </AppText>
                <View style={{ flex: 1 }} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar"
                  onPress={() => setIsQuestionPickerOpen(false)}
                  style={({ pressed }) => [
                    {
                      width: 40,
                      height: 40,
                      borderRadius: 999,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: pressed ? surfaceLow : "transparent",
                    },
                  ]}
                >
                  <MaterialIcons name="close" size={20} color={secondary} />
                </Pressable>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Mostrar todas las preguntas"
                onPress={() => {
                  setSelectedQuestionId(null);
                  setIsQuestionPickerOpen(false);
                }}
                style={({ pressed }) => [
                  {
                    borderRadius: 14,
                    padding: 14,
                    backgroundColor: pressed ? surfaceLow : surfaceLowest,
                    borderWidth: 1,
                    borderColor: outlineVariant,
                  },
                ]}
              >
                <AppText variant="bodyStrong">Todas</AppText>
              </Pressable>

              <View style={{ gap: 8, maxHeight: 420 }}>
                {questions.length === 0 ? (
                  <AppText variant="body" colorName="secondary">
                    No hay preguntas disponibles.
                  </AppText>
                ) : (
                  questions
                    .slice()
                    .sort((a, b) => b.id - a.id)
                    .slice(0, 200)
                    .map((q) => (
                      <Pressable
                        key={q.id}
                        accessibilityRole="button"
                        accessibilityLabel={`Filtrar por pregunta ${q.id}`}
                        onPress={() => {
                          setSelectedQuestionId(q.id);
                          setIsQuestionPickerOpen(false);
                        }}
                        style={({ pressed }) => [
                          {
                            borderRadius: 14,
                            padding: 14,
                            backgroundColor: pressed
                              ? surfaceLow
                              : surfaceLowest,
                            borderWidth: 1,
                            borderColor:
                              q.id === selectedQuestionId
                                ? primary
                                : outlineVariant,
                          },
                        ]}
                      >
                        <AppText variant="bodyStrong" numberOfLines={2}>
                          #{q.id} · {q.question_text}
                        </AppText>
                        <AppText
                          variant="labelCaps"
                          colorName="secondary"
                          style={{ opacity: 0.8, marginTop: 6 }}
                        >
                          questionnaire_id: {q.questionnaire_id}
                        </AppText>
                      </Pressable>
                    ))
                )}
              </View>
            </AppCard>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={isQuestionIdPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsQuestionIdPickerOpen(false)}
      >
        <Pressable
          onPress={() => setIsQuestionIdPickerOpen(false)}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.45)",
            padding: 18,
            justifyContent: "center",
          }}
        >
          <Pressable
            onPress={() => {}}
            style={{ width: "100%", maxWidth: 720, alignSelf: "center" }}
          >
            <AppCard tone="lowest" style={{ gap: 12 }}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <AppText variant="title" colorName="primary">
                  Seleccionar pregunta
                </AppText>
                <View style={{ flex: 1 }} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar"
                  onPress={() => setIsQuestionIdPickerOpen(false)}
                  style={({ pressed }) => [
                    {
                      width: 40,
                      height: 40,
                      borderRadius: 999,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: pressed ? surfaceLow : "transparent",
                    },
                  ]}
                >
                  <MaterialIcons name="close" size={20} color={secondary} />
                </Pressable>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Limpiar selección"
                onPress={() => {
                  setQuestionId("");
                  setIsQuestionIdPickerOpen(false);
                }}
                style={({ pressed }) => [
                  {
                    borderRadius: 14,
                    padding: 14,
                    backgroundColor: pressed ? surfaceLow : surfaceLowest,
                    borderWidth: 1,
                    borderColor: outlineVariant,
                  },
                ]}
              >
                <AppText variant="bodyStrong">Sin seleccionar</AppText>
              </Pressable>

              <View style={{ gap: 8, maxHeight: 420 }}>
                {questions.length === 0 ? (
                  <AppText variant="body" colorName="secondary">
                    No hay preguntas disponibles.
                  </AppText>
                ) : (
                  questions
                    .slice()
                    .sort((a, b) => b.id - a.id)
                    .slice(0, 200)
                    .map((q) => {
                      const selected = q.id === Number(questionId.trim());
                      return (
                        <Pressable
                          key={q.id}
                          accessibilityRole="button"
                          accessibilityLabel={`Seleccionar pregunta ${q.id}`}
                          onPress={() => {
                            setQuestionId(String(q.id));
                            setIsQuestionIdPickerOpen(false);
                          }}
                          style={({ pressed }) => [
                            {
                              borderRadius: 14,
                              padding: 14,
                              backgroundColor: pressed
                                ? surfaceLow
                                : surfaceLowest,
                              borderWidth: 1,
                              borderColor: selected ? primary : outlineVariant,
                            },
                          ]}
                        >
                          <AppText variant="bodyStrong" numberOfLines={2}>
                            #{q.id} · {q.question_text}
                          </AppText>
                          <AppText
                            variant="labelCaps"
                            colorName="secondary"
                            style={{ opacity: 0.8, marginTop: 6 }}
                          >
                            questionnaire_id: {q.questionnaire_id}
                          </AppText>
                        </Pressable>
                      );
                    })
                )}
              </View>
            </AppCard>
          </Pressable>
        </Pressable>
      </Modal>
    </AdminShell>
  );
}
