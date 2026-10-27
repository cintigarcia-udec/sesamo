# Documentación de Pruebas (Unitarias, de Sistema y Usabilidad) - Sésamo Mobile

Este documento detalla la arquitectura, cobertura, ejecución y especificación de la suite de pruebas de **Sésamo Mobile** (Expo / React Native con TypeScript, Jest y `@testing-library/react-native`).

---

## 🎯 1. Niveles de Pruebas en Sésamo Mobile

| Nivel | Alcance | Objetivo en Sésamo Mobile |
| :--- | :--- | :--- |
| **Pruebas Unitarias** (`__tests__/*.test.ts(x)`) | Componente o función aislada. | Valida decodificación de JWT, resolución y normalización de roles, instanciación de `ApiError`, tokens de temas (light/dark) y primitivas de UI (`AppButton`, `AppInput`, `AppCard`, `AppText`). |
| **Pruebas de Sistema** (`__tests__/system/*.test.tsx`) | Flujos y trayectorias completas del usuario en la app. | Simula la interacción integral de pantallas, navegación (`expo-router`), almacenamiento seguro de tokens, respuestas de API y flujos de examen desde la carga del cuestionario hasta el envío de respuestas y presentación de métricas en pantalla de resultados. |
| **Pruebas de Usabilidad** (`__tests__/usability/*.test.tsx`) | Ergonomía táctil, accesibilidad y experiencia del usuario (UX/DX). | Valida cumplimiento de áreas táctiles mínimas ($\ge 48\text{dp}$ / $44\text{pt}$ según HIG y Material Design), semántica para lectores de pantalla (`accessibilityRole`, `accessibilityLabel`, `accessibilityHint`), visibilidad del estado del sistema (cronómetro, progreso, carga), prevención de errores en formularios y contraste visual en modos claro/oscuro. |

---

## 🏗️ 2. Arquitectura del Entorno de Pruebas

Para validar la aplicación móvil sin requerir emuladores de Android/iOS ni compilaciones nativas pesadas:

- **Runner**: Jest 29 con el preset oficial `jest-expo` optimizado para React Native 0.81 y React 19.
- **Testing Library**: `@testing-library/react-native` (v13) para renderizado semántico en memoria, eventos de usuario (`fireEvent.changeText`, `fireEvent.press`) y esperas asíncronas (`waitFor`).
- **Resolución de Módulos**: Mapeo idéntico de alias `@/*` a `<rootDir>/*` en `jest.config.js`.
- **Mocks Nativos Seguros**: Emulaciones automáticas para `expo-linear-gradient`, `expo-secure-store`, `react-native-safe-area-context` y `@expo/vector-icons`.

---

## 📂 3. Estructura de la Suite Completa (60 Tests)

### A. Pruebas Unitarias (30 Tests)

| Archivo | Tests | Descripción y Cobertura |
| :--- | :---: | :--- |
| **[`__tests__/api.test.ts`](file:///Users/johanrodriguez/Documents/inti/sesamo/sesamoMobile/__tests__/api.test.ts)** | **20** | **Lógica crítica de API y Autenticación**: <br>• Decodificación segura de JWT URL-safe (`getJwtPayload`).<br>• Detección y mapeo de roles (`getJwtRoleId`): IDs directos, strings en español (`Admin` $\to$ 1, `Estudiante` $\to$ 2, `Docente` $\to$ 3), objetos anidados y arrays.<br>• Resolución de ID de usuario (`getJwtUserId`) desde `sub`, `user_id` o `id`.<br>• Estructura de errores tipados `ApiError`.<br>• Almacenamiento y limpieza de tokens en memoria. |
| **[`__tests__/theme.test.ts`](file:///Users/johanrodriguez/Documents/inti/sesamo/sesamoMobile/__tests__/theme.test.ts)** | **4** | **Sistema de Diseño y Temas**: <br>• Validación de tokens esenciales en modo claro (`Colors.light`) y modo oscuro (`Colors.dark`).<br>• Hook `useThemeColor`: resolución de colores de la paleta y respeto a overrides manuales en props. |
| **[`__tests__/components.test.tsx`](file:///Users/johanrodriguez/Documents/inti/sesamo/sesamoMobile/__tests__/components.test.tsx)** | **6** | **Componentes UI del Design System**: <br>• `AppText`: renderizado de texto y variantes tipográficas.<br>• `AppCard`: contenedor de contenido y anidamiento.<br>• `AppButton`: renderizado de etiqueta, respuesta al evento de presión y bloqueo de eventos cuando `disabled={true}`.<br>• `AppInput`: renderizado de placeholder y captura de `onChangeText`. |

### B. Pruebas de Sistema E2E (10 Tests)

| Archivo | Tests | Workflow de Negocio Validado |
| :--- | :---: | :--- |
| **[`__tests__/system/system_auth.test.tsx`](file:///Users/johanrodriguez/Documents/inti/sesamo/sesamoMobile/__tests__/system/system_auth.test.tsx)** | **6** | **Ciclo de Autenticación, Enrutamiento RBAC y Cierre de Sesión**: <br>• Validación en cliente: previene peticiones vacías o correos malformados y bloquea el botón.<br>• Procesamiento de rechazo 401 del backend mostrando banner de error.<br>• **Enrutamiento Estudiante (rol 2)**: Almacena JWT y redirige a `/(tabs)`.<br>• **Enrutamiento Administrador (rol 1)**: Redirige a `/admin`.<br>• **Enrutamiento Docente (rol 3)**: Redirige a `/admin/questionnaires`.<br>• **Cierre de sesión desde ProfileScreen**: Purga tokens de almacenamiento y redirige a `/auth/login`. |
| **[`__tests__/system/system_quiz_workflow.test.tsx`](file:///Users/johanrodriguez/Documents/inti/sesamo/sesamoMobile/__tests__/system/system_quiz_workflow.test.tsx)** | **2** | **Workflow Completo de Evaluación y Resultados**: <br>• `QuizQuestionsScreen`: Descarga preguntas y opciones por `quizId`, renderiza pregunta activa y 4 opciones.<br>• Estudiante selecciona opción B y envía respuestas: extrae ID del token JWT, despacha a `api.userResponses.create` con respuestas y puntaje calculado, y navega a `/quiz/results`.<br>• `QuizResultsScreen`: Presenta consolidado de precisión (100%), conteo de correctas y tiempo transcurrido. |
| **[`__tests__/system/system_network_resilience.test.tsx`](file:///Users/johanrodriguez/Documents/inti/sesamo/sesamoMobile/__tests__/system/system_network_resilience.test.tsx)** | **2** | **Resiliencia de Red y Recuperación ante Fallos**: <br>• Manejo de error 500 al descargar cuestionario: presenta tarjeta de error y botón "Volver" sin congelar la app.<br>• Caída de conexión durante el envío del examen: captura `ApiError` de red y avanza a resultados pasando `submitError` para no perder la interacción del alumno. |

### C. Pruebas de Usabilidad y Experiencia de Usuario (20 Tests)

| Archivo | Tests | Criterio de Usabilidad y Accesibilidad Validado |
| :--- | :---: | :--- |
| **[`__tests__/usability/touch_targets_and_accessibility.test.tsx`](file:///Users/johanrodriguez/Documents/inti/sesamo/sesamoMobile/__tests__/usability/touch_targets_and_accessibility.test.tsx)** | **7** | **Ergonomía Táctil y Accesibilidad Asistida**: <br>• **Área táctil mínima**: `AppButton` garantiza `minHeight >= 48dp` en variantes primaria, secundaria y terciaria (superando Apple HIG de 44pt y cumpliendo Google Material Design de 48dp).<br>• Padding ergonómico en campos de texto `AppInput` ($\ge 10\text{dp}$ vertical, $\ge 14\text{dp}$ horizontal).<br>• Semántica de accesibilidad: atributos `accessibilityRole="button"`, labels dinámicos y estado `accessibilityState={{ disabled: true }}` con opacidad visual atenuada (0.5).<br>• Formulario de autenticación con `accessibilityLabel`, `accessibilityHint` ("Ingresa tu correo registrado") y botón de alternancia de contraseña con `hitSlop={10}` para facilitar toque con el pulgar.<br>• Etiquetas descriptivas en avatares de usuario y botones de navegación. |
| **[`__tests__/usability/system_status_and_error_prevention.test.tsx`](file:///Users/johanrodriguez/Documents/inti/sesamo/sesamoMobile/__tests__/usability/system_status_and_error_prevention.test.tsx)** | **6** | **Heurísticas 1 & 5 de Nielsen (Estado del Sistema y Prevención de Errores)**: <br>• **Prevención de error en Login**: Validación en tiempo real de estructura de correo electrónico sin esperar a presionar enviar, bloqueando el botón de submit hasta contar con credenciales válidas.<br>• Control y visibilidad de contraseña: el usuario puede alternar la visibilidad de los caracteres sensibles a voluntad.<br>• **Estado explícito de carga**: En evaluación, muestra `ActivityIndicator` y etiquetas informativas ("Cargando preguntas...", "Preparando el cuestionario...") mientras se resuelven peticiones de red.<br>• **Indicadores de estado y tiempo**: Visibilidad en pantalla del cronómetro regresivo (`15:00`) y número de pregunta relativa (`01 / 2`).<br>• **Prevención de error en examen**: El botón de confirmación de respuesta se mantiene bloqueado hasta que el usuario toca una de las opciones disponibles. |
| **[`__tests__/usability/theme_contrast_and_feedback.test.tsx`](file:///Users/johanrodriguez/Documents/inti/sesamo/sesamoMobile/__tests__/usability/theme_contrast_and_feedback.test.tsx)** | **7** | **Heurística 8 de Nielsen (Diseño Estético, Minimalista y Contraste)**: <br>• **Contraste de color**: Pares semánticos válidos y diferenciados en modo claro (`background: #f6fafa`, `onBackground: #181c1d`, `primary: #004d5b`, `onPrimary: #ffffff`).<br>• **Inversión para modo oscuro**: Inversión completa de contraste en modo oscuro (`background: #0f1415`, `onBackground: #edf2f1`, `primary: #86d2e5`, `onPrimary: #001f26`) para reducir fatiga visual.<br>• **Claridad cognitiva en resultados**: Clasificación comprensible del desempeño en tres estados: "Dominado" ($\ge 85$), "Aprobado" ($70-84$) o mensaje constructivo "Requiere repaso" ($< 70$).<br>• Desglose transparente de métricas cuantitativas: respuestas correctas (`17 / 20`), tiempo total (`04:32 min`) y meta referencial (`Meta: 80%`).<br>• Notificación no intrusiva de incidencias de sincronización sin ocultar las calificaciones obtenidas. |

---

## 🚀 4. Guía de Ejecución

### Ejecutar toda la suite (Unitarias + Sistema + Usabilidad):
```bash
cd sesamoMobile
npm test
```

### Ejecutar ÚNICAMENTE las Pruebas de Usabilidad:
```bash
cd sesamoMobile
npm test -- __tests__/usability
```

### Ejecutar ÚNICAMENTE las Pruebas de Sistema:
```bash
cd sesamoMobile
npm test -- __tests__/system
```

### Ejecutar ÚNICAMENTE las Pruebas Unitarias:
```bash
cd sesamoMobile
npm test -- __tests__/api.test.ts __tests__/theme.test.ts __tests__/components.test.tsx
```

---

## 📊 5. Resultado de la Última Ejecución

```text
PASS __tests__/system/system_auth.test.tsx
PASS __tests__/usability/system_status_and_error_prevention.test.tsx
PASS __tests__/system/network_resilience.test.tsx
PASS __tests__/system/system_quiz_workflow.test.tsx
PASS __tests__/usability/theme_contrast_and_feedback.test.tsx
PASS __tests__/usability/touch_targets_and_accessibility.test.tsx
PASS __tests__/components.test.tsx
PASS __tests__/api.test.ts
PASS __tests__/theme.test.ts

Test Suites: 9 passed, 9 total
Tests:       60 passed, 60 total
Snapshots:   0 total
Time:        1.868 s
```
