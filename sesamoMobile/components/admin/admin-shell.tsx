import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AppCard } from "@/components/design/app-card";
import { AppText } from "@/components/design/app-text";
import { TopAppBar } from "@/components/design/top-app-bar";
import { api, clearStoredAccessToken, clearStoredRefreshToken, getJwtRoleId, getStoredAccessToken } from "@/constants/api";
import { useThemeColor } from "@/hooks/use-theme-color";

type AdminNavKey =
  | "categories"
  | "questionnaires"
  | "questions"
  | "answer-options"
  | "users"
  | "schools"
  | "roles"
  | "analytics";

export function AdminShell({
  active,
  title,
  children,
  right,
}: {
  active: AdminNavKey;
  title: string;
  children: ReactNode;
  right?: ReactNode;
}) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const insets = useSafeAreaInsets();
  const [roleId, setRoleId] = useState<string | number | null>(null);

  const primary = useThemeColor({}, "primary");
  const secondary = useThemeColor({}, "secondary");
  const surface = useThemeColor({}, "surface");
  const surfaceLow = useThemeColor({}, "surfaceContainerLow");
  const surfaceHighest = useThemeColor({}, "surfaceContainerHighest");

  const isWide = width >= 900;

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const token = await getStoredAccessToken();
      const id = token ? getJwtRoleId(token) : null;
      if (!cancelled) setRoleId(id);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      await api.auth.logout().catch(() => undefined);
    } finally {
      await clearStoredAccessToken();
      await clearStoredRefreshToken();
      router.replace("/auth/login" as any);
      setIsLoggingOut(false);
    }
  };

  const items = useMemo(
    () => [
      {
        key: "categories" as const,
        title: "Categorías",
        icon: "category",
        href: "/admin/categories",
      },
      {
        key: "questionnaires" as const,
        title: "Cuestionarios",
        icon: "quiz",
        href: "/admin/questionnaires",
      },
      {
        key: "questions" as const,
        title: "Preguntas",
        icon: "help",
        href: "/admin/questions",
      },
      {
        key: "answer-options" as const,
        title: "Opciones de Respuesta",
        icon: "list",
        href: "/admin/answer-options",
      },
      {
        key: "users" as const,
        title: "Usuarios",
        icon: "group",
        href: "/admin/users",
      },
      {
        key: "schools" as const,
        title: "Escuelas",
        icon: "school",
        href: "/admin/schools",
      },
      {
        key: "roles" as const,
        title: "Roles",
        icon: "admin-panel-settings",
        href: "/admin/roles",
      },
    ],
    [],
  );

  const filteredItems = useMemo(() => {
    if (roleId === 3 || roleId === "3") {
      return items.filter(
        (it) =>
          it.key === "questionnaires" ||
          it.key === "questions" ||
          it.key === "answer-options",
      );
    }
    return items;
  }, [items, roleId]);

  const NavList = ({ onNavigate }: { onNavigate?: () => void }) => (
    <View style={{ gap: 6 }}>
      {filteredItems.map((it) => {
        const selected = it.key === active;
        return (
          <Pressable
            key={it.key}
            accessibilityRole="button"
            accessibilityLabel={it.title}
            onPress={() => {
              onNavigate?.();
              router.replace(it.href as any);
            }}
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: selected
                  ? `${primary}14`
                  : pressed
                    ? surfaceHighest
                    : "transparent",
              },
            ]}
          >
            <MaterialIcons
              name={it.icon as any}
              size={20}
              color={selected ? primary : secondary}
            />
            <AppText
              variant="bodyStrong"
              style={{ color: selected ? primary : secondary }}
            >
              {it.title}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: surface }}>
      <TopAppBar
        title={title}
        left={
          isWide ? (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 12,
                  backgroundColor: primary,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons name="terminal" size={18} color="#ffffff" />
              </View>
              <View>
                <AppText variant="title" colorName="primary">
                  Syntactic Logic
                </AppText>
                <AppText
                  variant="labelCaps"
                  colorName="secondary"
                  style={{ opacity: 0.7 }}
                >
                  Admin Console
                </AppText>
              </View>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Abrir navegación"
              onPress={() => setDrawerOpen(true)}
              style={({ pressed }) => [
                {
                  padding: 8,
                  borderRadius: 999,
                  backgroundColor: pressed ? surfaceHighest : "transparent",
                },
              ]}
            >
              <MaterialIcons name="menu" size={22} color={primary} />
            </Pressable>
          )
        }
        right={
          <>
            {right}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar sesión"
              accessibilityState={{ disabled: isLoggingOut }}
              onPress={handleLogout}
              style={({ pressed }) => [
                {
                  padding: 8,
                  borderRadius: 999,
                  backgroundColor: pressed ? surfaceHighest : "transparent",
                  opacity: isLoggingOut ? 0.6 : 1,
                },
              ]}
            >
              <MaterialIcons name="logout" size={22} color={primary} />
            </Pressable>
          </>
        }
      />

      <View style={{ flex: 1, flexDirection: isWide ? "row" : "column" }}>
        {isWide ? (
          <View
            style={{
              width: 300,
              paddingTop: 92 + insets.top,
              paddingHorizontal: 16,
              paddingBottom: 16,
            }}
          >
            <AppCard tone="lowest" style={{ borderRadius: 18, padding: 16 }}>
              <NavList />
              <View
                style={{
                  marginTop: 14,
                  padding: 12,
                  borderRadius: 14,
                  backgroundColor: surfaceLow,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 999,
                    backgroundColor: surfaceHighest,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <AppText variant="labelCaps" colorName="primary">
                    AU
                  </AppText>
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong" numberOfLines={1}>
                    Engineering Admin
                  </AppText>
                  <AppText
                    variant="label"
                    colorName="secondary"
                    style={{ opacity: 0.8 }}
                  >
                    Root Access
                  </AppText>
                </View>
              </View>
            </AppCard>
          </View>
        ) : null}

        <View
          style={{
            flex: 1,
            paddingTop: 92 + insets.top,
            paddingHorizontal: 20,
            paddingBottom: 40,
          }}
        >
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            {children}
          </ScrollView>
        </View>
      </View>

      <Modal
        transparent
        visible={drawerOpen}
        animationType="fade"
        onRequestClose={() => setDrawerOpen(false)}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar navegación"
          onPress={() => setDrawerOpen(false)}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.35)",
            paddingTop: 92 + insets.top,
            paddingHorizontal: 16,
          }}
        >
          <Pressable
            accessibilityRole="none"
            onPress={() => {}}
            style={{
              maxWidth: 360,
              width: "100%",
              backgroundColor: surface,
              borderRadius: 18,
              padding: 16,
            }}
          >
            <NavList onNavigate={() => setDrawerOpen(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
