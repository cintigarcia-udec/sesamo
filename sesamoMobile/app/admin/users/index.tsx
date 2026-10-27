import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from "react-native";

import { AdminShell } from "@/components/admin/admin-shell";
import { AppButton } from "@/components/design/app-button";
import { AppCard } from "@/components/design/app-card";
import { AppInput } from "@/components/design/app-input";
import { AppText } from "@/components/design/app-text";
import { ApiError, api, type User as ApiUser } from "@/constants/api";
import { useThemeColor } from "@/hooks/use-theme-color";

export default function AdminUsersScreen() {
  const { width, height } = useWindowDimensions();
  const primary = useThemeColor({}, "primary");
  const secondary = useThemeColor({}, "secondary");
  const primaryContainer = useThemeColor({}, "primaryContainer");
  const onPrimaryContainer = useThemeColor({}, "onPrimaryContainer");
  const error = useThemeColor({}, "error");
  const surfaceHighest = useThemeColor({}, "surfaceContainerHighest");

  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<ApiUser | null>(null);
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [emailValue, setEmailValue] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const load = async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const items = await api.users.list({ skip: 0, limit: 2000 });
      setUsers(items);
    } catch (err) {
      setLoadError(
        err instanceof ApiError
          ? err.message
          : "No se pudieron cargar los usuarios.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = users.filter((u) => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      `${u.id} ${u.name} ${u.last_name} ${u.email}`.toLowerCase().includes(q);
    return matchesQuery;
  });

  const openEdit = (u: ApiUser) => {
    setEditing(u);
    setName(u.name);
    setLastName(u.last_name);
    setEmailValue(u.email);
    setSchoolId(String(u.school_id));
    setPassword("");
    setFormError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
  };

  const save = async () => {
    if (!editing || isSaving) return;
    const nextSchoolId = Number(schoolId.trim());
    if (!name.trim() || !lastName.trim() || !emailValue.trim()) {
      setFormError("Nombre, apellido y correo son requeridos.");
      return;
    }
    if (!Number.isFinite(nextSchoolId) || nextSchoolId <= 0) {
      setFormError("school_id debe ser un entero positivo.");
      return;
    }
    setIsSaving(true);
    setFormError("");
    try {
      await api.users.update(editing.id, {
        name: name.trim(),
        last_name: lastName.trim(),
        email: emailValue.trim(),
        school_id: nextSchoolId,
        password: password ? password : null,
      });
      setIsModalOpen(false);
      await load();
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.message
          : "No se pudo guardar el usuario.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async () => {
    if (!editing || isSaving) return;
    setIsSaving(true);
    setFormError("");
    try {
      await api.users.delete(editing.id);
      setIsModalOpen(false);
      await load();
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.message
          : "No se pudo eliminar el usuario.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminShell active="users" title="Gestión de usuarios">
      <View style={{ gap: 10 }}>
        <AppText
          variant="headline"
          colorName="primary"
          style={{
            fontSize: width >= 900 ? 56 : 42,
            lineHeight: width >= 900 ? 60 : 48,
          }}
        >
          Ecosistema de usuarios
        </AppText>
        <AppText
          variant="body"
          colorName="secondary"
          style={{ opacity: 0.9, maxWidth: 860 }}
        >
          Administra el acceso, monitorea la actividad y gestiona roles y
          estados de usuarios dentro de la plataforma.
        </AppText>
      </View>

      <View
        style={{
          flexDirection: width >= 900 ? "row" : "column",
          gap: 14,
          marginTop: 16,
        }}
      >
        <AppCard
          tone="lowest"
          style={{
            flex: width >= 900 ? 3 : undefined,
            borderRadius: 28,
            gap: 12,
          }}
        >
          <View
            style={{
              flexDirection: width >= 720 ? "row" : "column",
              gap: 10,
              alignItems: width >= 720 ? "center" : "stretch",
            }}
          >
            <View style={{ flex: 1 }}>
              <AppInput
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar por nombre o correo..."
                accessibilityLabel="Buscar usuarios"
              />
            </View>
            <View
              style={{ flexDirection: "row", gap: 10, alignItems: "center" }}
            >
              <AppButton
                variant="secondary"
                onPress={load}
                leftIcon={
                  <MaterialIcons name="refresh" size={18} color={secondary} />
                }
              >
                Actualizar
              </AppButton>
            </View>
          </View>
        </AppCard>

        <AppCard
          tone="lowest"
          style={{
            flex: width >= 900 ? 1 : undefined,
            borderRadius: 28,
            gap: 10,
            backgroundColor: primaryContainer,
          }}
        >
          <MaterialIcons name="insights" size={26} color={onPrimaryContainer} />
          <AppText
            variant="labelCaps"
            style={{
              color: onPrimaryContainer,
              opacity: 0.75,
            }}
          >
            Sesiones activas
          </AppText>
          <AppText
            variant="headline"
            style={{ color: onPrimaryContainer, fontSize: 40 }}
          >
            {users.length}
          </AppText>
        </AppCard>
      </View>

      <View style={{ marginTop: 14, gap: 10 }}>
        {isLoading ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <ActivityIndicator color={primary} />
            <AppText variant="body" colorName="secondary">
              Cargando...
            </AppText>
          </View>
        ) : loadError ? (
          <AppCard tone="low">
            <AppText variant="bodyStrong">Error</AppText>
            <AppText
              variant="label"
              colorName="secondary"
              style={{ opacity: 0.85, marginTop: 6 }}
            >
              {loadError}
            </AppText>
          </AppCard>
        ) : (
          filtered.map((u) => (
            <AppCard
              key={u.id}
              tone="low"
              style={{ borderRadius: 22, padding: 0, overflow: "hidden" }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Abrir usuario ${u.name}`}
                onPress={() => openEdit(u)}
                style={({ pressed }) => [
                  {
                    padding: 16,
                    backgroundColor: pressed ? surfaceHighest : "transparent",
                  },
                ]}
              >
                <View
                  style={{
                    flexDirection: width >= 720 ? "row" : "column",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      flex: 1,
                    }}
                  >
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 16,
                        backgroundColor: `${primary}14`,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <MaterialIcons name="person" size={22} color={primary} />
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <AppText variant="bodyStrong">
                        {u.name} {u.last_name}
                      </AppText>
                      <AppText
                        variant="label"
                        colorName="secondary"
                        style={{ opacity: 0.85 }}
                      >
                        {u.email}
                      </AppText>
                    </View>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <View
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 999,
                        backgroundColor: `${secondary}14`,
                      }}
                    >
                      <AppText variant="labelCaps" colorName="secondary">
                        school_id: {u.school_id}
                      </AppText>
                    </View>
                    <AppText
                      variant="labelCaps"
                      colorName="secondary"
                      style={{ opacity: 0.7 }}
                    >
                      ID {u.id}
                    </AppText>
                    <MaterialIcons
                      name="chevron-right"
                      size={22}
                      color={secondary}
                    />
                  </View>
                </View>
              </Pressable>
            </AppCard>
          ))
        )}
        {!isLoading && !loadError && filtered.length === 0 ? (
          <AppCard tone="low">
            <AppText variant="bodyStrong">No se encontraron usuarios</AppText>
            <AppText
              variant="label"
              colorName="secondary"
              style={{ opacity: 0.85, marginTop: 6 }}
            >
              Prueba quitando filtros o cambiando la búsqueda.
            </AppText>
          </AppCard>
        ) : null}
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
            style={{
              width: "100%",
              maxWidth: 720,
              maxHeight: height * 0.9,
              alignSelf: "center",
            }}
          >
            <AppCard tone="lowest" style={{ gap: 14, padding: 18 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <AppText variant="title" colorName="primary">
                    Editar usuario
                  </AppText>
                  <AppText
                    variant="label"
                    colorName="secondary"
                    style={{ opacity: 0.85 }}
                  >
                    {editing ? `ID ${editing.id}` : ""}
                  </AppText>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar"
                  onPress={closeModal}
                  hitSlop={10}
                  style={({ pressed }) => [
                    {
                      width: 38,
                      height: 38,
                      borderRadius: 999,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: pressed ? surfaceHighest : "transparent",
                    },
                  ]}
                >
                  <MaterialIcons name="close" size={22} color={secondary} />
                </Pressable>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ gap: 12, paddingBottom: 4 }}
              >
                <View
                  style={{
                    flexDirection: width >= 720 ? "row" : "column",
                    gap: 12,
                  }}
                >
                  <View style={{ flex: 1, gap: 8 }}>
                    <AppText
                      variant="labelCaps"
                      colorName="secondary"
                      style={{ opacity: 0.8 }}
                    >
                      Nombre
                    </AppText>
                    <AppInput value={name} onChangeText={setName} />
                  </View>
                  <View style={{ flex: 1, gap: 8 }}>
                    <AppText
                      variant="labelCaps"
                      colorName="secondary"
                      style={{ opacity: 0.8 }}
                    >
                      Apellido
                    </AppText>
                    <AppInput value={lastName} onChangeText={setLastName} />
                  </View>
                </View>

                <View style={{ gap: 8 }}>
                  <AppText
                    variant="labelCaps"
                    colorName="secondary"
                    style={{ opacity: 0.8 }}
                  >
                    Email
                  </AppText>
                  <AppInput
                    value={emailValue}
                    onChangeText={setEmailValue}
                    autoCapitalize="none"
                  />
                </View>

                <View
                  style={{
                    flexDirection: width >= 720 ? "row" : "column",
                    gap: 12,
                  }}
                >
                  <View style={{ flex: 1, gap: 8 }}>
                    <AppText
                      variant="labelCaps"
                      colorName="secondary"
                      style={{ opacity: 0.8 }}
                    >
                      school_id
                    </AppText>
                    <AppInput
                      value={schoolId}
                      onChangeText={setSchoolId}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={{ flex: 1, gap: 8 }}>
                    <AppText
                      variant="labelCaps"
                      colorName="secondary"
                      style={{ opacity: 0.8 }}
                    >
                      password (opcional)
                    </AppText>
                    <AppInput
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                    />
                  </View>
                </View>

                {formError ? (
                  <View
                    style={{
                      backgroundColor: `${error}22`,
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
                    flexDirection: width >= 520 ? "row" : "column",
                    justifyContent: "space-between",
                    gap: 10,
                    paddingTop: 4,
                  }}
                >
                  <AppButton
                    variant="secondary"
                    textStyle={{ color: error }}
                    onPress={remove}
                  >
                    {isSaving ? "..." : "Eliminar"}
                  </AppButton>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <AppButton variant="tertiary" onPress={closeModal}>
                      Cancelar
                    </AppButton>
                    <AppButton onPress={save}>
                      {isSaving ? "Guardando..." : "Guardar"}
                    </AppButton>
                  </View>
                </View>
              </ScrollView>
            </AppCard>
          </Pressable>
        </Pressable>
      </Modal>
    </AdminShell>
  );
}
