import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  View,
  useWindowDimensions,
} from "react-native";

import { AdminShell } from "@/components/admin/admin-shell";
import { AppButton } from "@/components/design/app-button";
import { AppCard } from "@/components/design/app-card";
import { AppInput } from "@/components/design/app-input";
import { AppText } from "@/components/design/app-text";
import {
  ApiError,
  api,
  type Question,
  type Questionnaire,
} from "@/constants/api";
import { useThemeColor } from "@/hooks/use-theme-color";

export default function AdminQuestionsScreen() {
  const { width } = useWindowDimensions();
  const [search, setSearch] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [selectedQuestionnaireId, setSelectedQuestionnaireId] = useState<
    number | null
  >(null);
  const [isQuestionnaireFilterPickerOpen, setIsQuestionnaireFilterPickerOpen] =
    useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQuestionnairePickerOpen, setIsQuestionnairePickerOpen] =
    useState(false);
  const [editing, setEditing] = useState<Question | null>(null);
  const [questionText, setQuestionText] = useState("");
  const [questionnaireId, setQuestionnaireId] = useState("");
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const surfaceLow = useThemeColor({}, "surfaceContainerLow");
  const surfaceLowest = useThemeColor({}, "surfaceContainerLowest");
  const outlineVariant = useThemeColor({}, "outlineVariant");
  const primary = useThemeColor({}, "primary");
  const secondary = useThemeColor({}, "secondary");
  const primaryContainer = useThemeColor({}, "primaryContainer");
  const onPrimaryContainer = useThemeColor({}, "onPrimaryContainer");
  const errorColor = useThemeColor({}, "error");

  const isWide = width >= 900;

  const load = async () => {
    setIsLoading(true);
    setError("");
    try {
      const [qs, qn] = await Promise.all([
        api.questions.list({
          skip: 0,
          limit: 2000,
          questionnaire_id: selectedQuestionnaireId ?? undefined,
        }),
        api.questionnaires.list({ skip: 0, limit: 2000 }),
      ]);
      setQuestions(qs);
      setQuestionnaires(qn);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudieron cargar las preguntas.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [selectedQuestionnaireId]);

  const questionnaireById = useMemo(() => {
    const map = new Map<number, Questionnaire>();
    for (const q of questionnaires) map.set(q.id, q);
    return map;
  }, [questionnaires]);

  const selectedQuestionnaireLabel = useMemo(() => {
    if (!selectedQuestionnaireId) return "Todos";
    const qn = questionnaireById.get(selectedQuestionnaireId);
    if (!qn) return `#${selectedQuestionnaireId}`;
    return `#${qn.id} · Cuestionario #${qn.questionnaire_number}`;
  }, [questionnaireById, selectedQuestionnaireId]);

  const selectedFormQuestionnaireLabel = useMemo(() => {
    const qnId = Number(questionnaireId.trim());
    if (!Number.isFinite(qnId) || qnId <= 0)
      return "Selecciona un cuestionario";
    const qn = questionnaireById.get(qnId);
    if (!qn) return `#${qnId}`;
    return `#${qn.id} · Cuestionario #${qn.questionnaire_number}`;
  }, [questionnaireById, questionnaireId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return questions;
    return questions.filter((it) => {
      const qn = questionnaireById.get(it.questionnaire_id);
      const hay =
        `${it.question_text} ${it.id} ${it.questionnaire_id} ${qn?.questionnaire_number ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [questions, search, questionnaireById]);

  const openCreate = () => {
    setEditing(null);
    setQuestionText("");
    setQuestionnaireId(
      selectedQuestionnaireId ? String(selectedQuestionnaireId) : "",
    );
    setFormError("");
    setIsModalOpen(true);
  };

  const openEdit = (q: Question) => {
    setEditing(q);
    setQuestionText(q.question_text);
    setQuestionnaireId(String(q.questionnaire_id));
    setFormError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSaving) return;
    setIsQuestionnairePickerOpen(false);
    setIsQuestionnaireFilterPickerOpen(false);
    setIsModalOpen(false);
  };

  const save = async () => {
    if (isSaving) return;
    const text = questionText.trim();
    const qnId = Number(questionnaireId.trim());
    if (!text) {
      setFormError("question_text es requerido.");
      return;
    }
    if (!Number.isFinite(qnId) || qnId <= 0) {
      setFormError("questionnaire_id debe ser un entero positivo.");
      return;
    }
    setIsSaving(true);
    setFormError("");
    try {
      if (editing) {
        await api.questions.update(editing.id, {
          question_text: text,
          questionnaire_id: qnId,
        });
      } else {
        await api.questions.create({
          question_text: text,
          questionnaire_id: qnId,
        });
      }
      setIsModalOpen(false);
      await load();
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.message
          : "No se pudo guardar la pregunta.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (id: number) => {
    try {
      await api.questions.delete(id);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo eliminar la pregunta.",
      );
    }
  };

  return (
    <AdminShell active="questions" title="Preguntas">
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
          Preguntas
        </AppText>
        <AppText
          variant="body"
          colorName="secondary"
          style={{ opacity: 0.9, maxWidth: 760 }}
        >
          Crea, edita y organiza preguntas asociadas a cuestionarios.
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
          tone="lowest"
          style={{ width: width >= 900 ? "32%" : "100%", gap: 8 }}
        >
          <MaterialIcons name="help" size={22} color={primary} />
          <AppText
            variant="labelCaps"
            colorName="secondary"
            style={{ opacity: 0.8 }}
          >
            Total de preguntas
          </AppText>
          <AppText
            variant="headline"
            colorName="onSurface"
            style={{ fontSize: 34 }}
          >
            {questions.length}
          </AppText>
        </AppCard>

        <AppCard
          tone="highest"
          style={{
            width: width >= 900 ? "32%" : "100%",
            gap: 8,
            backgroundColor: primaryContainer,
          }}
        >
          <MaterialIcons name="quiz" size={22} color={onPrimaryContainer} />
          <AppText
            variant="labelCaps"
            style={{ color: onPrimaryContainer, opacity: 0.8 }}
          >
            Cuestionarios
          </AppText>
          <AppText
            variant="headline"
            style={{ color: onPrimaryContainer, fontSize: 34 }}
          >
            {questionnaires.length}
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
              Filtrar por cuestionario
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Seleccionar cuestionario para filtrar"
              onPress={() => setIsQuestionnaireFilterPickerOpen(true)}
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
                  {selectedQuestionnaireLabel}
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
              accessibilityLabel="Buscar preguntas"
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
            No hay preguntas.
          </AppText>
        ) : (
          filtered.map((q) => (
            <Pressable
              key={q.id}
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
                  <AppText variant="title">{q.question_text}</AppText>
                  <AppText variant="labelCaps" colorName="secondary">
                    ID: {q.id} | questionnaire_id: {q.questionnaire_id}
                    {questionnaireById.get(q.questionnaire_id)
                      ? ` (#${questionnaireById.get(q.questionnaire_id)!.questionnaire_number})`
                      : ""}
                  </AppText>
                </View>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <AppButton variant="secondary" onPress={() => openEdit(q)}>
                    Editar
                  </AppButton>
                  <AppButton
                    variant="secondary"
                    textStyle={{ color: errorColor }}
                    onPress={() => remove(q.id)}
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
            <AppCard tone="lowest" style={{ gap: 12 }}>
              <AppText variant="title" colorName="primary">
                {editing ? "Editar pregunta" : "Crear pregunta"}
              </AppText>
              <View style={{ gap: 10 }}>
                <AppText
                  variant="labelCaps"
                  colorName="secondary"
                  style={{ opacity: 0.8 }}
                >
                  question_text
                </AppText>
                <AppInput
                  value={questionText}
                  onChangeText={setQuestionText}
                  placeholder="Texto de la pregunta"
                  multiline
                />
              </View>
              <View style={{ gap: 10 }}>
                <AppText
                  variant="labelCaps"
                  colorName="secondary"
                  style={{ opacity: 0.8 }}
                >
                  QUESTIONNAIRE_ID
                </AppText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Seleccionar cuestionario"
                  disabled={isSaving}
                  onPress={() => setIsQuestionnairePickerOpen(true)}
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
                      {selectedFormQuestionnaireLabel}
                    </AppText>
                    <MaterialIcons
                      name="expand-more"
                      size={22}
                      color={secondary}
                    />
                  </View>
                </Pressable>
              </View>
              {formError ? (
                <AppText variant="labelCaps" colorName="error">
                  {formError}
                </AppText>
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
        visible={isQuestionnairePickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsQuestionnairePickerOpen(false)}
      >
        <Pressable
          onPress={() => setIsQuestionnairePickerOpen(false)}
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
                  Seleccionar cuestionario
                </AppText>
                <View style={{ flex: 1 }} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar"
                  onPress={() => setIsQuestionnairePickerOpen(false)}
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
                  setQuestionnaireId("");
                  setIsQuestionnairePickerOpen(false);
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
                {questionnaires.length === 0 ? (
                  <AppText variant="body" colorName="secondary">
                    No hay cuestionarios disponibles.
                  </AppText>
                ) : (
                  questionnaires
                    .slice()
                    .sort((a, b) => b.id - a.id)
                    .slice(0, 200)
                    .map((qn) => {
                      const selected = qn.id === Number(questionnaireId.trim());
                      return (
                        <Pressable
                          key={qn.id}
                          accessibilityRole="button"
                          accessibilityLabel={`Seleccionar cuestionario ${qn.id}`}
                          onPress={() => {
                            setQuestionnaireId(String(qn.id));
                            setIsQuestionnairePickerOpen(false);
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
                            #{qn.id} · Cuestionario #{qn.questionnaire_number}
                          </AppText>
                          <AppText
                            variant="labelCaps"
                            colorName="secondary"
                            style={{ opacity: 0.8, marginTop: 6 }}
                          >
                            categoría: {qn.category_name ?? qn.category_id}
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

      <Modal
        visible={isQuestionnaireFilterPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsQuestionnaireFilterPickerOpen(false)}
      >
        <Pressable
          onPress={() => setIsQuestionnaireFilterPickerOpen(false)}
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
                  Filtrar por cuestionario
                </AppText>
                <View style={{ flex: 1 }} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar"
                  onPress={() => setIsQuestionnaireFilterPickerOpen(false)}
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
                accessibilityLabel="Mostrar todos los cuestionarios"
                onPress={() => {
                  setSelectedQuestionnaireId(null);
                  setIsQuestionnaireFilterPickerOpen(false);
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
                <AppText variant="bodyStrong">Todos</AppText>
              </Pressable>

              <View style={{ gap: 8, maxHeight: 420 }}>
                {questionnaires.length === 0 ? (
                  <AppText variant="body" colorName="secondary">
                    No hay cuestionarios disponibles.
                  </AppText>
                ) : (
                  questionnaires
                    .slice()
                    .sort((a, b) => b.id - a.id)
                    .slice(0, 200)
                    .map((qn) => (
                      <Pressable
                        key={qn.id}
                        accessibilityRole="button"
                        accessibilityLabel={`Filtrar por cuestionario ${qn.id}`}
                        onPress={() => {
                          setSelectedQuestionnaireId(qn.id);
                          setIsQuestionnaireFilterPickerOpen(false);
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
                              qn.id === selectedQuestionnaireId
                                ? primary
                                : outlineVariant,
                          },
                        ]}
                      >
                        <AppText variant="bodyStrong" numberOfLines={2}>
                          #{qn.id} · Cuestionario #{qn.questionnaire_number}
                        </AppText>
                        <AppText
                          variant="labelCaps"
                          colorName="secondary"
                          style={{ opacity: 0.8, marginTop: 6 }}
                        >
                          categoría: {qn.category_name ?? qn.category_id}
                        </AppText>
                      </Pressable>
                    ))
                )}
              </View>
            </AppCard>
          </Pressable>
        </Pressable>
      </Modal>
    </AdminShell>
  );
}
