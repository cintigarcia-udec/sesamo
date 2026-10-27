import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from "react-native";

import { AppCard } from "@/components/design/app-card";
import { AppInput } from "@/components/design/app-input";
import { AppScreen } from "@/components/design/app-screen";
import { AppText } from "@/components/design/app-text";
import { TopAppBar } from "@/components/design/top-app-bar";
import {
  ApiError,
  api,
  type Category,
  type Questionnaire,
} from "@/constants/api";
import { useThemeColor } from "@/hooks/use-theme-color";

export default function ExploreScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const primary = useThemeColor({}, "primary");
  const surfaceHighest = useThemeColor({}, "surfaceContainerHighest");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      setError("");
      try {
        const [cats, qs] = await Promise.all([
          api.categories.list({ skip: 0, limit: 200 }),
          api.questionnaires.list({ skip: 0, limit: 500 }),
        ]);
        if (cancelled) return;
        setCategories(cats);
        setQuestionnaires(qs);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "No se pudieron cargar los datos. Intenta nuevamente.",
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const categoryById = useMemo(() => {
    const map = new Map<number, Category>();
    for (const c of categories) map.set(c.id, c);
    return map;
  }, [categories]);

  const cards = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return questionnaires
      .filter((it) => it.is_active === true)
      .filter((it) =>
        selectedCategory ? it.category_id === selectedCategory : true,
      )
      .filter((it) => {
        if (!q) return true;
        const categoryName = (
          it.category_name ??
          categoryById.get(it.category_id)?.name ??
          ""
        ).toLowerCase();
        const title = `Cuestionario #${it.questionnaire_number}`.toLowerCase();
        return `${title} ${categoryName}`.includes(q);
      })
      .map((it) => {
        const categoryName =
          it.category_name ?? categoryById.get(it.category_id)?.name ?? "";
        return {
          id: it.id,
          categoryId: it.category_id,
          title: `Cuestionario #${it.questionnaire_number}`,
          description: categoryName
            ? `Categoría: ${categoryName}`
            : "Categoría no disponible",
          duration: "—",
        };
      });
  }, [questionnaires, selectedCategory, searchQuery, categoryById]);

  return (
    <AppScreen
      scroll
      safeAreaEdges={["left", "right", "bottom"]}
      header={
        <TopAppBar
          floating={false}
          title="Cuestionarios"
          left={<MaterialIcons name="explore" size={22} color={primary} />}
        />
      }
      contentContainerStyle={{
        paddingTop: 18,
        paddingHorizontal: 20,
        maxWidth: 1100,
        width: "100%",
        alignSelf: "center",
        gap: 24,
      }}
    >
      <View style={{ gap: 6 }}>
        <AppText variant="headline" colorName="primary">
          Explora
        </AppText>
        <AppText
          variant="body"
          colorName="secondary"
          style={{ opacity: 0.85, maxWidth: 720 }}
        >
          Encuentra cuestionarios organizados por categorías para evaluar tu
          conocimiento.
        </AppText>
      </View>

      <AppInput
        placeholder="Buscar cuestionarios..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        accessibilityLabel="Buscar cuestionarios por título"
      />

      <View style={{ gap: 12 }}>
        <AppText variant="title">Categorías</AppText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10 }}
        >
          <Pressable
            onPress={() => setSelectedCategory(null)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor:
                selectedCategory === null ? primary : surfaceHighest,
            }}
          >
            <AppText
              colorName={selectedCategory === null ? "onPrimary" : "primary"}
            >
              Todas
            </AppText>
          </Pressable>
          {categories.map((cat) => (
            <Pressable
              key={cat.id}
              onPress={() => setSelectedCategory(cat.id)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor:
                  selectedCategory === cat.id ? primary : surfaceHighest,
              }}
            >
              <AppText
                colorName={
                  selectedCategory === cat.id ? "onPrimary" : "primary"
                }
              >
                {cat.name}
              </AppText>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={{ gap: 12 }}>
        <AppText variant="title">Cuestionarios Disponibles</AppText>
        {isLoading ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <ActivityIndicator color={primary} />
            <AppText variant="body" colorName="secondary">
              Cargando cuestionarios...
            </AppText>
          </View>
        ) : error ? (
          <AppText variant="body" colorName="secondary">
            {error}
          </AppText>
        ) : cards.length === 0 ? (
          <AppText variant="body" colorName="secondary">
            No se encontraron cuestionarios.
          </AppText>
        ) : (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
            {cards.map((q) => (
              <Pressable
                key={q.id}
                accessibilityRole="button"
                accessibilityLabel={`Abrir detalle de ${q.title}`}
                onPress={() => router.push(`/quiz?id=${q.id}` as any)}
                style={({ pressed }) => [
                  {
                    width: width >= 900 ? "32%" : width >= 520 ? "48%" : "100%",
                    transform: [{ scale: pressed ? 0.985 : 1 }],
                  },
                ]}
              >
                <AppCard tone="low" style={{ gap: 12 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        backgroundColor: `${primary}14`,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <MaterialIcons name="quiz" size={22} color={primary} />
                    </View>
                    <MaterialIcons
                      name="chevron-right"
                      size={22}
                      color={primary}
                    />
                  </View>
                  <View style={{ gap: 4 }}>
                    <AppText variant="title">{q.title}</AppText>
                    <AppText
                      variant="labelCaps"
                      colorName="secondary"
                      style={{ opacity: 0.8 }}
                    >
                      {q.duration}
                    </AppText>
                  </View>
                  <AppText
                    variant="body"
                    colorName="secondary"
                    numberOfLines={2}
                  >
                    {q.description}
                  </AppText>
                </AppCard>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </AppScreen>
  );
}
