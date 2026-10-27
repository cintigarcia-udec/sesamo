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
import { AppCard } from "@/components/design/app-card";
import { AppText } from "@/components/design/app-text";
import { AppInput } from "@/components/design/app-input";
import { AppButton } from "@/components/design/app-button";
import { ApiError, api, type School } from "@/constants/api";
import { useThemeColor } from "@/hooks/use-theme-color";

export default function AdminSchoolsScreen() {
  const { width } = useWindowDimensions();
  const [search, setSearch] = useState("");
  const [schools, setSchools] = useState<School[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<School | null>(null);
  const [name, setName] = useState("");
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  
  const surfaceLow = useThemeColor({}, "surfaceContainerLow");
  const surfaceLowest = useThemeColor({}, "surfaceContainerLowest");
  const errorColor = useThemeColor({}, "error");
  const primary = useThemeColor({}, "primary");
  const secondary = useThemeColor({}, "secondary");
  const primaryContainer = useThemeColor({}, "primaryContainer");
  const onPrimaryContainer = useThemeColor({}, "onPrimaryContainer");

  const isWide = width >= 900;

  const load = async () => {
    setIsLoading(true);
    setError("");
    try {
      const items = await api.schools.list({ skip: 0, limit: 500 });
      setSchools(items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudieron cargar las escuelas.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return schools;
    return schools.filter((s) => s.name.toLowerCase().includes(q));
  }, [schools, search]);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setFormError("");
    setIsModalOpen(true);
  };

  const openEdit = (s: School) => {
    setEditing(s);
    setName(s.name);
    setFormError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
  };

  const save = async () => {
    if (isSaving) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setFormError("El nombre es requerido.");
      return;
    }
    setIsSaving(true);
    setFormError("");
    try {
      if (editing) {
        await api.schools.update(editing.id, { name: trimmed });
      } else {
        await api.schools.create({ name: trimmed });
      }
      setIsModalOpen(false);
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "No se pudo guardar la escuela.");
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (id: number) => {
    try {
      await api.schools.delete(id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar la escuela.");
    }
  };

  return (
    <AdminShell
      active="schools"
      title="Escuelas"
    >
      <View style={{ gap: 10, marginLeft: isWide ? 16 : 0 }}>
        <AppText
          variant="labelCaps"
          colorName="primary"
          style={{ opacity: 0.9 }}
        >
          Centro de Gestión
        </AppText>
        <AppText variant="headline" style={{ fontSize: isWide ? 48 : 36 }}>
          Escuelas
        </AppText>
        <AppText
          variant="body"
          colorName="secondary"
          style={{ opacity: 0.9, maxWidth: 760 }}
        >
          Administra instituciones educativas para el registro de usuarios.
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
          <MaterialIcons name="school" size={22} color={onPrimaryContainer} />
          <AppText
            variant="labelCaps"
            style={{ color: onPrimaryContainer, opacity: 0.8 }}
          >
            Total de escuelas
          </AppText>
          <AppText
            variant="headline"
            style={{ color: onPrimaryContainer, fontSize: 34 }}
          >
            {schools.length}
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
            <AppInput
              placeholder="Buscar escuela..."
              value={search}
              onChangeText={setSearch}
              accessibilityLabel="Buscar escuelas"
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
              No hay escuelas.
            </AppText>
          ) : (
            filtered.map((s) => (
              <Pressable
                key={s.id}
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
                  <View style={{ gap: 4 }}>
                    <AppText variant="title">{s.name}</AppText>
                    <AppText variant="labelCaps" colorName="secondary">
                      ID: {s.id}
                    </AppText>
                  </View>
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <AppButton variant="secondary" onPress={() => openEdit(s)}>
                      Editar
                    </AppButton>
                    <AppButton
                      variant="secondary"
                      textStyle={{ color: errorColor }}
                      onPress={() => remove(s.id)}
                    >
                      Eliminar
                    </AppButton>
                  </View>
                </View>
              </Pressable>
            ))
          )}
      </View>

      <Modal visible={isModalOpen} transparent animationType="fade" onRequestClose={closeModal}>
        <Pressable
          onPress={closeModal}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", padding: 18, justifyContent: "center" }}
        >
          <Pressable onPress={() => {}} style={{ width: "100%", maxWidth: 560, alignSelf: "center" }}>
            <AppCard tone="lowest" style={{ gap: 12 }}>
              <AppText variant="title" colorName="primary">
                {editing ? "Editar escuela" : "Crear escuela"}
              </AppText>
              <View style={{ gap: 8 }}>
                <AppText variant="labelCaps" colorName="secondary" style={{ opacity: 0.8 }}>
                  Nombre
                </AppText>
                <AppInput value={name} onChangeText={setName} placeholder="Nombre de la escuela" />
                {formError ? (
                  <AppText variant="labelCaps" colorName="error">
                    {formError}
                  </AppText>
                ) : null}
              </View>
              <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 10 }}>
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
    </AdminShell>
  );
}
