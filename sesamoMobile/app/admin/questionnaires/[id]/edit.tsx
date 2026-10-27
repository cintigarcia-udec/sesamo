import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";

import { AdminShell } from "@/components/admin/admin-shell";
import { AppButton } from "@/components/design/app-button";
import { AppCard } from "@/components/design/app-card";
import { AppInput } from "@/components/design/app-input";
import { AppText } from "@/components/design/app-text";
import {
  ApiError,
  api,
  getJwtRoleId,
  getStoredAccessToken,
  type Category,
  type Questionnaire,
} from "@/constants/api";
import { useThemeColor } from "@/hooks/use-theme-color";

export default function AdminQuestionnaireEditorScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();

  const primary = useThemeColor({}, "primary");
  const secondary = useThemeColor({}, "secondary");
  const surfaceHighest = useThemeColor({}, "surfaceContainerHighest");

  const questionnaireId = useMemo(() => {
    const raw = Array.isArray(id) ? id[0] : id;
    const num = typeof raw === "string" ? Number(raw) : NaN;
    return Number.isFinite(num) ? num : null;
  }, [id]);

  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(
    null,
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [questionnaireNumber, setQuestionnaireNumber] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [estimatedDurationMinutes, setEstimatedDurationMinutes] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">(
    "medium",
  );
  const [teacherId, setTeacherId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isTeacherRole, setIsTeacherRole] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const token = await getStoredAccessToken();
      const roleId = token ? getJwtRoleId(token) : null;
      if (!cancelled) setIsTeacherRole(roleId === 3 || roleId === "3");
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      setError("");
      try {
        if (!questionnaireId) {
          setError("Id inválido.");
          return;
        }
        const [q, cats] = await Promise.all([
          api.questionnaires.get(questionnaireId),
          api.categories.list({ skip: 0, limit: 500 }),
        ]);
        if (cancelled) return;
        setQuestionnaire(q);
        setCategories(cats);
        setQuestionnaireNumber(String(q.questionnaire_number));
        setCategoryId(String(q.category_id));
        setEstimatedDurationMinutes(
          typeof q.estimated_duration_minutes === "number"
            ? String(q.estimated_duration_minutes)
            : "",
        );
        setDifficulty(() => {
          const raw = q.difficulty;
          if (raw === "easy" || raw === "medium" || raw === "hard") return raw;
          if (raw === 1) return "easy";
          if (raw === 2) return "medium";
          if (raw === 3) return "hard";
          return "medium";
        });
        setTeacherId(
          typeof q.teacher_id === "number" ? String(q.teacher_id) : "",
        );
        setIsActive(typeof q.is_active === "boolean" ? q.is_active : true);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "No se pudo cargar el cuestionario.",
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [questionnaireId]);

  const isWide = width >= 900;

  const categoryLabel = useMemo(() => {
    const cat = Number(categoryId);
    if (!Number.isFinite(cat)) return "";
    return categories.find((c) => c.id === cat)?.name ?? "";
  }, [categoryId, categories]);

  const save = async () => {
    if (isSaving) return;
    const num = Number(questionnaireNumber.trim());
    const cat = Number(categoryId.trim());
    const estimated = Number(estimatedDurationMinutes.trim());
    if (!questionnaireId) return;
    if (!Number.isFinite(num) || num <= 0) {
      setError("questionnaire_number debe ser un entero positivo.");
      return;
    }
    if (!Number.isFinite(cat) || cat <= 0) {
      setError("category_id debe ser un entero positivo.");
      return;
    }
    if (!Number.isFinite(estimated) || estimated <= 0) {
      setError("estimated_duration_minutes debe ser un entero positivo.");
      return;
    }
    const teacher = Number(teacherId.trim());
    if (!isTeacherRole && (!Number.isFinite(teacher) || teacher <= 0)) {
      setError("teacher_id debe ser un entero positivo.");
      return;
    }

    if (isActive) {
      try {
        const limit = 500;
        let skip = 0;
        let count = 0;
        while (true) {
          const batch = await api.questions.list({ skip, limit });
          count += batch.filter(
            (it) => it.questionnaire_id === questionnaireId,
          ).length;
          if (batch.length < limit) break;
          skip += limit;
          if (skip > 50_000) break;
        }
        if (count === 0) {
          setError(
            "No se puede activar un cuestionario sin preguntas asociadas.",
          );
          return;
        }
      } catch {
        setError("No se pudo validar las preguntas del cuestionario.");
        return;
      }
    }

    setIsSaving(true);
    setError("");
    try {
      const payload = {
        questionnaire_number: num,
        category_id: cat,
        estimated_duration_minutes: estimated,
        difficulty,
        is_active: isActive,
      } as const;

      const updated = await api.questionnaires.update(questionnaireId, {
        ...payload,
        ...(isTeacherRole ? {} : { teacher_id: teacher }),
      });
      setQuestionnaire(updated);
      setQuestionnaireNumber(String(updated.questionnaire_number));
      setCategoryId(String(updated.category_id));
      setEstimatedDurationMinutes(
        typeof updated.estimated_duration_minutes === "number"
          ? String(updated.estimated_duration_minutes)
          : "",
      );
      setDifficulty(() => {
        const raw = updated.difficulty;
        if (raw === "easy" || raw === "medium" || raw === "hard") return raw;
        if (raw === 1) return "easy";
        if (raw === 2) return "medium";
        if (raw === 3) return "hard";
        return "medium";
      });
      setTeacherId(
        typeof updated.teacher_id === "number"
          ? String(updated.teacher_id)
          : "",
      );
      setIsActive(
        typeof updated.is_active === "boolean" ? updated.is_active : true,
      );
      router.back();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminShell
      active="questionnaires"
      title="Cuestionarios"
      right={
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View
            style={{
              display: width >= 520 ? "flex" : "none",
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: surfaceHighest,
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                backgroundColor: primary,
              }}
            />
            <AppText
              variant="label"
              colorName="secondary"
              style={{ opacity: 0.9 }}
            >
              Editor en vivo
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notificaciones"
            onPress={() => {}}
            style={({ pressed }) => [
              {
                width: 40,
                height: 40,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: pressed ? surfaceHighest : "transparent",
              },
            ]}
          >
            <MaterialIcons name="notifications" size={22} color={primary} />
          </Pressable>
        </View>
      }
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          marginBottom: 10,
        }}
      >
        <AppText
          variant="label"
          colorName="secondary"
          style={{ opacity: 0.85 }}
        >
          Cuestionarios
        </AppText>
        <MaterialIcons name="chevron-right" size={18} color={secondary} />
        <AppText
          variant="label"
          colorName="primary"
          style={{ fontWeight: "700" }}
        >
          Editor de Cuestionario
        </AppText>
      </View>

      <View
        style={{
          flexDirection: isWide ? "row" : "column",
          alignItems: isWide ? "flex-end" : "flex-start",
          justifyContent: "space-between",
          gap: 14,
        }}
      >
        <View style={{ flex: 1, gap: 8 }}>
          <AppText
            variant="headline"
            colorName="primary"
            style={{
              fontSize: width >= 900 ? 52 : 38,
              lineHeight: width >= 900 ? 56 : 44,
            }}
          >
            {isLoading
              ? "Cargando..."
              : questionnaire
                ? `Cuestionario #${questionnaire.questionnaire_number}`
                : "Cuestionario"}
          </AppText>
          <AppText
            variant="body"
            colorName="secondary"
            style={{ opacity: 0.9, maxWidth: 760 }}
          >
            {error
              ? error
              : categoryLabel
                ? `Categoría: ${categoryLabel}`
                : categoryId
                  ? `category_id: ${categoryId}`
                  : ""}
          </AppText>
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <AppButton
            variant="tertiary"
            onPress={() => router.back()}
            leftIcon={<MaterialIcons name="close" size={18} color={primary} />}
          >
            Cancelar
          </AppButton>
          <AppButton
            onPress={save}
            leftIcon={
              <MaterialIcons name="publish" size={18} color="#ffffff" />
            }
          >
            {isSaving ? "Guardando..." : "Guardar"}
          </AppButton>
        </View>
      </View>

      <View
        style={{
          flexDirection: isWide ? "row" : "column",
          gap: 14,
          marginTop: 16,
        }}
      >
        <AppCard
          tone="low"
          style={{ flex: isWide ? 5 : undefined, borderRadius: 18, gap: 12 }}
        >
          <AppText variant="title">Metadatos</AppText>
          <View style={{ gap: 10 }}>
            <AppText
              variant="labelCaps"
              colorName="secondary"
              style={{ opacity: 0.75 }}
            >
              questionnaire_number
            </AppText>
            <AppInput
              value={questionnaireNumber}
              onChangeText={setQuestionnaireNumber}
              accessibilityLabel="questionnaire_number"
              keyboardType="numeric"
            />
          </View>
          <View style={{ gap: 10 }}>
            <AppText
              variant="labelCaps"
              colorName="secondary"
              style={{ opacity: 0.75 }}
            >
              category_id
            </AppText>
            <AppInput
              value={categoryId}
              onChangeText={setCategoryId}
              accessibilityLabel="category_id"
              keyboardType="numeric"
            />
            {categoryLabel ? (
              <AppText
                variant="label"
                colorName="secondary"
                style={{ opacity: 0.85 }}
              >
                Categoría: {categoryLabel}
              </AppText>
            ) : null}
          </View>
          <View style={{ gap: 10 }}>
            <AppText
              variant="labelCaps"
              colorName="secondary"
              style={{ opacity: 0.75 }}
            >
              estimated_duration_minutes
            </AppText>
            <AppInput
              value={estimatedDurationMinutes}
              onChangeText={setEstimatedDurationMinutes}
              accessibilityLabel="estimated_duration_minutes"
              keyboardType="numeric"
              placeholder="Ej: 15"
            />
          </View>
          <View style={{ gap: 10 }}>
            <AppText
              variant="labelCaps"
              colorName="secondary"
              style={{ opacity: 0.75 }}
            >
              difficulty
            </AppText>
            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
              {(["easy", "medium", "hard"] as const).map((opt) => {
                const selected = difficulty === opt;
                return (
                  <Pressable
                    key={opt}
                    accessibilityRole="button"
                    accessibilityLabel={`Seleccionar dificultad ${opt}`}
                    onPress={() => setDifficulty(opt)}
                    style={({ pressed }) => [
                      {
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 999,
                        backgroundColor: selected
                          ? primary
                          : pressed
                            ? surfaceHighest
                            : "transparent",
                        borderWidth: selected ? 0 : 1,
                        borderColor: `${secondary}22`,
                      },
                    ]}
                  >
                    <AppText
                      variant="labelCaps"
                      style={{
                        color: selected ? "#ffffff" : secondary,
                        opacity: selected ? 1 : 0.9,
                      }}
                    >
                      {opt}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>
          {!isTeacherRole ? (
            <View style={{ gap: 10 }}>
              <AppText
                variant="labelCaps"
                colorName="secondary"
                style={{ opacity: 0.75 }}
              >
                teacher_id
              </AppText>
              <AppInput
                value={teacherId}
                onChangeText={setTeacherId}
                accessibilityLabel="teacher_id"
                keyboardType="numeric"
                placeholder="Ej: 10"
              />
            </View>
          ) : null}
          <View style={{ gap: 10 }}>
            <AppText
              variant="labelCaps"
              colorName="secondary"
              style={{ opacity: 0.75 }}
            >
              is_active
            </AppText>
            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
              {[
                { label: "Activo", value: true },
                { label: "Inactivo", value: false },
              ].map((opt) => {
                const selected = isActive === opt.value;
                return (
                  <Pressable
                    key={opt.label}
                    accessibilityRole="button"
                    accessibilityLabel={`Seleccionar ${opt.label}`}
                    onPress={() => setIsActive(opt.value)}
                    style={({ pressed }) => [
                      {
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 999,
                        backgroundColor: selected
                          ? primary
                          : pressed
                            ? surfaceHighest
                            : "transparent",
                        borderWidth: selected ? 0 : 1,
                        borderColor: `${secondary}22`,
                      },
                    ]}
                  >
                    <AppText
                      variant="labelCaps"
                      style={{
                        color: selected ? "#ffffff" : secondary,
                        opacity: selected ? 1 : 0.9,
                      }}
                    >
                      {opt.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </AppCard>
      </View>
    </AdminShell>
  );
}
