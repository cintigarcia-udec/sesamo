import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Tabs, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";

import { HapticTab } from "@/components/haptic-tab";
import { getJwtRoleId, getStoredAccessToken } from "@/constants/api";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const token = await getStoredAccessToken();

      if (!token) {
        router.replace("/auth/login");
        return;
      }

      const roleId = getJwtRoleId(token);

      if (roleId === 1 || roleId === "1") {
        router.replace("/admin");
        return;
      }

      if (roleId === 3 || roleId === "3") {
        router.replace("/admin/questionnaires");
        return;
      }

      if (roleId === 2 || roleId === "2") {
        if (!cancelled) setIsAuthChecked(true);
        return;
      }

      router.replace("/auth/login");
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!isAuthChecked) return null;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        tabBarInactiveTintColor: Colors[colorScheme ?? "light"].tabIconDefault,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: Colors[colorScheme ?? "light"].surface,
          borderTopColor: `${Colors[colorScheme ?? "light"].outlineVariant}26`,
        },
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="dashboard" size={size ?? 28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Cuestionarios",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="explore" size={size ?? 28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: "Progreso",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="insights" size={size ?? 28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" size={size ?? 28} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
