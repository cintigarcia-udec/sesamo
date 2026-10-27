import { useRouter } from "expo-router";
import { useEffect } from "react";

export default function AdminDashboardScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/categories");
  }, [router]);

  return null;
}
