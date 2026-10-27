import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";

import { AppButton } from "@/components/design/app-button";
import { AppInput } from "@/components/design/app-input";
import { AppScreen } from "@/components/design/app-screen";
import { AppText } from "@/components/design/app-text";
import {
  ApiError,
  api,
  getJwtRoleId,
  setStoredAccessToken,
  setStoredRefreshToken,
} from "@/constants/api";
import { useThemeColor } from "@/hooks/use-theme-color";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const errorColor = useThemeColor({}, "error");
  const secondary = useThemeColor({}, "secondary");

  const getEmailError = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return "El correo es requerido.";
    if (!/^\S+@\S+\.\S+$/.test(trimmed)) return "Formato de correo inválido.";
    return "";
  };

  const getPasswordError = (value: string) => {
    if (!value) return "La contraseña es requerida.";
    return "";
  };

  const validateEmail = (text: string) => {
    setEmail(text);
    setEmailError(getEmailError(text));
  };

  const validatePassword = (text: string) => {
    setPassword(text);
    setPasswordError(getPasswordError(text));
  };

  const handleLogin = async () => {
    const nextEmailError = getEmailError(email);
    const nextPasswordError = getPasswordError(password);
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);

    if (nextEmailError || nextPasswordError) {
      return;
    }

    setIsLoading(true);
    setGeneralError("");

    try {
      const emailValue = email.trim();
      const data = await api.auth.login({ email: emailValue, password });
      await setStoredAccessToken(data.access_token);
      if (typeof (data as any).refresh_token === "string") {
        await setStoredRefreshToken((data as any).refresh_token);
      }

      const roleId = getJwtRoleId(data.access_token);
      console.log("[LOGIN DEBUG] Detected roleId:", roleId);
      if (roleId === 1 || roleId === "1") {
        console.log("[LOGIN DEBUG] Redirecting to /admin");
        router.replace("/admin");
        return;
      }

      if (roleId === 3 || roleId === "3") {
        router.replace("/admin/questionnaires");
        return;
      }

      if (roleId === 2 || roleId === "2") {
        router.replace("/(tabs)");
        return;
      }

      setGeneralError("Tu usuario no tiene un rol válido para acceder.");
    } catch (err) {
      if (err instanceof ApiError) {
        setGeneralError(err.message);
      } else {
        setGeneralError(
          "No se pudo conectar con el servidor. Revisa tu conexión e intenta nuevamente.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppScreen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            padding: 24,
          }}
        >
          <View style={{ marginBottom: 40 }}>
            <AppText
              variant="display"
              colorName="primary"
              style={{ marginBottom: 8 }}
            >
              Bienvenido a Sésamo
            </AppText>
            <AppText variant="body" colorName="secondary">
              Inicia sesión para continuar tu aprendizaje.
            </AppText>
          </View>

          {generalError ? (
            <View
              style={{
                backgroundColor: `${errorColor}22`,
                padding: 12,
                borderRadius: 8,
                marginBottom: 16,
              }}
              accessibilityLiveRegion="polite"
            >
              <AppText variant="label" colorName="error">
                {generalError}
              </AppText>
            </View>
          ) : null}

          <View style={{ gap: 16 }}>
            <View>
              <AppText variant="label" style={{ marginBottom: 8 }}>
                Correo Electrónico
              </AppText>
              <AppInput
                placeholder="ejemplo@correo.com"
                value={email}
                onChangeText={validateEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                accessibilityLabel="Campo de correo electrónico"
                accessibilityHint="Ingresa tu correo registrado"
              />
              {emailError ? (
                <AppText
                  variant="labelCaps"
                  colorName="error"
                  style={{ marginTop: 4 }}
                >
                  {emailError}
                </AppText>
              ) : null}
            </View>

            <View>
              <AppText variant="label" style={{ marginBottom: 8 }}>
                Contraseña
              </AppText>
              <AppInput
                placeholder="********"
                value={password}
                onChangeText={validatePassword}
                secureTextEntry={!isPasswordVisible}
                accessibilityLabel="Campo de contraseña"
                accessibilityHint="Ingresa tu contraseña"
                right={
                  <Pressable
                    onPress={() => setIsPasswordVisible((v) => !v)}
                    accessibilityRole="button"
                    accessibilityLabel={
                      isPasswordVisible
                        ? "Ocultar contraseña"
                        : "Mostrar contraseña"
                    }
                    hitSlop={10}
                  >
                    <MaterialIcons
                      name={isPasswordVisible ? "visibility-off" : "visibility"}
                      size={20}
                      color={secondary}
                    />
                  </Pressable>
                }
              />
              {passwordError ? (
                <AppText
                  variant="labelCaps"
                  colorName="error"
                  style={{ marginTop: 4 }}
                >
                  {passwordError}
                </AppText>
              ) : null}
            </View>

            <View style={{ alignItems: "flex-end" }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Recuperar contraseña"
              >
                <AppText variant="label" colorName="primary">
                  ¿Olvidaste tu contraseña?
                </AppText>
              </Pressable>
            </View>
          </View>

          <View style={{ marginTop: 32, gap: 16 }}>
            <AppButton
              onPress={handleLogin}
              disabled={
                isLoading ||
                !!emailError ||
                !!passwordError ||
                !email ||
                !password
              }
              accessibilityLabel="Botón de Iniciar Sesión"
            >
              {isLoading ? "Cargando..." : "Iniciar Sesión"}
            </AppButton>

            <View
              style={{ flexDirection: "row", justifyContent: "center", gap: 4 }}
            >
              <AppText variant="body">¿No tienes cuenta?</AppText>
              <Pressable
                onPress={() => router.push("/auth/register")}
                accessibilityRole="button"
                accessibilityLabel="Ir a registro"
              >
                <AppText variant="bodyStrong" colorName="primary">
                  Regístrate
                </AppText>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}
