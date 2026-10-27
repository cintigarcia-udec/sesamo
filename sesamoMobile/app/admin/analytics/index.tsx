import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEffect, useState } from "react";
import { ActivityIndicator, View, useWindowDimensions } from "react-native";
import Svg, { Rect } from "react-native-svg";

import { AdminShell } from "@/components/admin/admin-shell";
import { AppButton } from "@/components/design/app-button";
import { AppCard } from "@/components/design/app-card";
import { AppInput } from "@/components/design/app-input";
import { AppText } from "@/components/design/app-text";
import {
  ApiError,
  api,
  type School,
  type User,
  type UserResponse,
} from "@/constants/api";
import { useThemeColor } from "@/hooks/use-theme-color";

type Bar = { label: string; value: number };

function BarChart({ data, height = 140 }: { data: Bar[]; height?: number }) {
  const primary = useThemeColor({}, "primary");
  const surfaceHighest = useThemeColor({}, "surfaceContainerHighest");
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <Svg
      width="100%"
      height={height}
      viewBox={`0 0 ${data.length * 44} ${height}`}
    >
      {data.map((d, i) => {
        const w = 32;
        const x = i * 44 + 6;
        const h = Math.round((d.value / max) * (height - 18));
        const y = height - h;
        return (
          <Rect
            key={d.label}
            x={x}
            y={y}
            width={w}
            height={h}
            rx={10}
            fill={primary}
            opacity={0.85}
          />
        );
      })}
      <Rect
        x={0}
        y={height - 2}
        width={data.length * 44}
        height={2}
        fill={surfaceHighest}
        opacity={0.6}
      />
    </Svg>
  );
}

export default function AdminAnalyticsScreen() {
  const { width } = useWindowDimensions();
  const primary = useThemeColor({}, "primary");
  const primaryContainer = useThemeColor({}, "primaryContainer");
  const onPrimary = useThemeColor({}, "onPrimary");

  const [institution, setInstitution] = useState("All Institutions");
  const [component, setComponent] = useState("Global Architecture");
  const [date, setDate] = useState("");

  const [bars, setBars] = useState<Bar[]>([]);
  const [avgScore, setAvgScore] = useState<number | null>(null);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [topSchool, setTopSchool] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      setError("");
      try {
        const [schools, users, responses] = await Promise.all([
          api.schools.list({ skip: 0, limit: 500 }),
          api.users.list({ skip: 0, limit: 5000 }),
          api.userResponses.list({ skip: 0, limit: 5000 }),
        ]);

        const userById = new Map<number, User>();
        for (const u of users) userById.set(u.id, u);

        const schoolById = new Map<number, School>();
        for (const s of schools) schoolById.set(s.id, s);

        const bySchool = new Map<number, UserResponse[]>();
        for (const r of responses) {
          const u = userById.get(r.user_id);
          if (!u) continue;
          const prev = bySchool.get(u.school_id) ?? [];
          prev.push(r);
          bySchool.set(u.school_id, prev);
        }

        const overallAvg =
          responses.reduce(
            (acc, it) => acc + (Number.isFinite(it.score) ? it.score : 0),
            0,
          ) / Math.max(1, responses.length);

        const schoolStats = Array.from(bySchool.entries()).map(
          ([schoolId, rs]) => {
            const avg =
              rs.reduce(
                (acc, it) => acc + (Number.isFinite(it.score) ? it.score : 0),
                0,
              ) / Math.max(1, rs.length);
            const label =
              schoolById.get(schoolId)?.name ?? `School ${schoolId}`;
            return { schoolId, label, avg, count: rs.length };
          },
        );

        schoolStats.sort((a, b) => b.avg - a.avg || b.count - a.count);
        const top = schoolStats[0]?.label ?? "";
        const chart = schoolStats
          .slice(0, 8)
          .map((s) => ({ label: s.label, value: Math.round(s.avg) }));

        if (cancelled) return;
        setAvgScore(Number.isFinite(overallAvg) ? overallAvg : 0);
        setTotalUsers(users.length);
        setTopSchool(top);
        setBars(chart.length ? chart : [{ label: "Sin datos", value: 0 }]);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "No se pudo cargar analytics.",
        );
        setBars([{ label: "Sin datos", value: 0 }]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const isWide = width >= 900;

  return (
    <AdminShell active="analytics" title="Admin Analytics">
      <View style={{ flexDirection: isWide ? "row" : "column", gap: 14 }}>
        <View
          style={{
            flex: isWide ? 8 : undefined,
            borderRadius: 28,
            padding: 22,
            backgroundColor: primary,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: primaryContainer,
              opacity: 0.22,
            }}
          />
          <AppText
            variant="labelCaps"
            style={{ color: onPrimary, opacity: 0.8 }}
          >
            Global Insight
          </AppText>
          <AppText
            variant="headline"
            style={{
              color: onPrimary,
              fontSize: isWide ? 54 : 40,
              marginTop: 8,
            }}
          >
            Performance Architecture
          </AppText>
          <View style={{ flexDirection: "row", gap: 30, marginTop: 18 }}>
            <View>
              <AppText
                variant="labelCaps"
                style={{ color: onPrimary, opacity: 0.75 }}
              >
                Average Score
              </AppText>
              <AppText
                variant="display"
                style={{ color: onPrimary, fontSize: 54, lineHeight: 58 }}
              >
                {avgScore === null ? "—" : `${avgScore.toFixed(1)}%`}
              </AppText>
            </View>
            <View>
              <AppText
                variant="labelCaps"
                style={{ color: onPrimary, opacity: 0.75 }}
              >
                Total Students
              </AppText>
              <AppText
                variant="display"
                style={{ color: onPrimary, fontSize: 54, lineHeight: 58 }}
              >
                {totalUsers === null ? "—" : totalUsers.toLocaleString()}
              </AppText>
            </View>
          </View>
          {isLoading ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                marginTop: 16,
              }}
            >
              <ActivityIndicator color={onPrimary} />
              <AppText
                variant="body"
                style={{ color: onPrimary, opacity: 0.85 }}
              >
                Cargando...
              </AppText>
            </View>
          ) : error ? (
            <AppText
              variant="body"
              style={{ color: onPrimary, opacity: 0.85, marginTop: 16 }}
            >
              {error}
            </AppText>
          ) : null}
        </View>

        <View style={{ flex: isWide ? 4 : undefined, gap: 14 }}>
          <AppCard tone="low" style={{ borderRadius: 28, gap: 8 }}>
            <MaterialIcons name="trending-up" size={22} color={primary} />
            <AppText variant="bodyStrong" colorName="secondary">
              Growth Rate
            </AppText>
            <AppText
              variant="headline"
              colorName="onSurface"
              style={{ fontSize: 28 }}
            >
              +12.4%{" "}
              <AppText
                variant="label"
                colorName="secondary"
                style={{ opacity: 0.7 }}
              >
                vs last month
              </AppText>
            </AppText>
          </AppCard>
          <AppCard tone="highest" style={{ borderRadius: 28, gap: 8 }}>
            <MaterialIcons name="verified" size={22} color={primary} />
            <AppText variant="bodyStrong" colorName="secondary">
              Top School
            </AppText>
            <AppText
              variant="headline"
              colorName="onSurface"
              style={{ fontSize: 28 }}
            >
              {topSchool || "—"}
            </AppText>
          </AppCard>
        </View>
      </View>

      <AppCard
        tone="lowest"
        style={{ borderRadius: 22, gap: 12, marginTop: 14 }}
      >
        <View style={{ flexDirection: isWide ? "row" : "column", gap: 12 }}>
          <View style={{ flex: 1, minWidth: 220, gap: 6 }}>
            <AppText
              variant="labelCaps"
              colorName="secondary"
              style={{ opacity: 0.8 }}
            >
              Colegio (School)
            </AppText>
            <AppInput
              value={institution}
              onChangeText={setInstitution}
              accessibilityLabel="Colegio"
            />
          </View>
          <View style={{ flex: 1, minWidth: 220, gap: 6 }}>
            <AppText
              variant="labelCaps"
              colorName="secondary"
              style={{ opacity: 0.8 }}
            >
              Component
            </AppText>
            <AppInput
              value={component}
              onChangeText={setComponent}
              accessibilityLabel="Componente"
            />
          </View>
          <View style={{ flex: 1, minWidth: 220, gap: 6 }}>
            <AppText
              variant="labelCaps"
              colorName="secondary"
              style={{ opacity: 0.8 }}
            >
              Date Range
            </AppText>
            <AppInput
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              accessibilityLabel="Rango de fechas"
            />
          </View>
          <View style={{ justifyContent: "flex-end" }}>
            <AppButton
              onPress={() => {}}
              leftIcon={
                <MaterialIcons name="play-arrow" size={18} color="#ffffff" />
              }
            >
              Execute Filter
            </AppButton>
          </View>
        </View>
      </AppCard>

      <View
        style={{
          flexDirection: isWide ? "row" : "column",
          gap: 14,
          marginTop: 14,
        }}
      >
        <AppCard
          tone="low"
          style={{ flex: isWide ? 7 : undefined, borderRadius: 28, gap: 12 }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-end",
            }}
          >
            <AppText variant="title">Student Metrics by Origin</AppText>
            <AppText
              variant="labelCaps"
              colorName="secondary"
              style={{ opacity: 0.8 }}
            >
              Institutional Comparison
            </AppText>
          </View>
          <BarChart data={bars} />
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            {bars.slice(0, 3).map((b) => (
              <AppText
                key={b.label}
                variant="labelCaps"
                colorName="secondary"
                style={{ opacity: 0.75 }}
              >
                {b.label}
              </AppText>
            ))}
          </View>
        </AppCard>

        <AppCard
          tone="highest"
          style={{ flex: isWide ? 5 : undefined, borderRadius: 28, gap: 10 }}
        >
          <AppText variant="title">Notes</AppText>
          <AppText
            variant="body"
            colorName="secondary"
            style={{ opacity: 0.9, fontSize: 13 }}
          >
            The mockup uses a native date picker and select controls. This
            implementation keeps inputs generic to remain cross-platform.
          </AppText>
          <AppButton
            variant="secondary"
            onPress={() => {}}
            leftIcon={
              <MaterialIcons
                name="download"
                size={18}
                color={useThemeColor({}, "onSecondaryContainer")}
              />
            }
          >
            Export CSV
          </AppButton>
        </AppCard>
      </View>
    </AdminShell>
  );
}
