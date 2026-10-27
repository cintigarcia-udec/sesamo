import { Stack, usePathname, useRouter } from "expo-router";
import { useEffect, useState } from "react";

import { getJwtRoleId, getStoredAccessToken } from "@/constants/api";

export default function AdminLayout() {
  const router = useRouter();
  const pathname = usePathname();
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
      console.log("[ADMIN LAYOUT DEBUG] token exists: yes, roleId:", roleId);

      if (roleId === 1 || roleId === "1") {
        console.log("[ADMIN LAYOUT DEBUG] Admin access granted");
        if (pathname === "/admin") {
          router.replace("/admin/categories");
          return;
        }
        if (!cancelled) setIsAuthChecked(true);
        return;
      }

      if (roleId === 3 || roleId === "3") {
        const allowed =
          pathname === "/admin" ||
          pathname.startsWith("/admin/questionnaires") ||
          pathname.startsWith("/admin/questions") ||
          pathname.startsWith("/admin/answer-options");

        if (!allowed) {
          router.replace("/admin/questionnaires");
          return;
        }

        if (pathname === "/admin") {
          router.replace("/admin/questionnaires");
          return;
        }

        if (!cancelled) setIsAuthChecked(true);
        return;
      }

      if (roleId === 2 || roleId === "2") {
        router.replace("/(tabs)");
        return;
      }

      router.replace("/auth/login");
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [router, pathname]);

  if (!isAuthChecked) return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}
