# Documentación de Pruebas (Unitarias, de Sistema y Usabilidad) - Sésamo Web

Este documento detalla la arquitectura, cobertura, ejecución y especificación de la suite de pruebas de **Sésamo Web** (React 19, TypeScript, Vite, Vitest y React Testing Library).

---

## 🎯 1. Niveles de Pruebas en Sésamo Web

| Nivel | Alcance | Objetivo en Sésamo Web |
| :--- | :--- | :--- |
| **Pruebas Unitarias** (`src/test/*.test.ts(x)`) | Módulo o componente aislado. | Valida funciones de normalización de encabezados en hojas de cálculo, parseo con `xlsx`, clientes REST de `api.ts`, renderizado estático y respuestas atómicas de `LoginScreen`, `AuthBar` y `BulkUploader`. |
| **Pruebas de Sistema** (`src/test/system/*.test.tsx`) | Flujos administrativos integrales de extremo a extremo. | Simula workflows de usuario completos: ciclo de vida de sesión en la aplicación raíz (`App.tsx` con barrera RBAC, login admin y logout), procesamiento de archivos binarios Excel `.xlsx` reales con carga encadenada de preguntas y 4 opciones hacia el backend, y resiliencia ante errores de red o restricciones de BD. |
| **Pruebas de Usabilidad** (`src/test/usability/*.test.tsx`) | Accesibilidad, ergonomía web y experiencia del operador (UX/DX). | Valida cumplimiento de accesibilidad semántica de formularios (asociación explícita de `htmlFor`/`id`, tipos HTML5, `autoFocus`), heurísticas de Nielsen (visibilidad de estado con métricas e insignias de validación, prevención de errores con bloqueo condicional de botones, filtros interactivos de tabla, ayuda contextual con descarga directa de plantillas CSV/XLSX y consola de auditoría de logs). |

---

## 🏗️ 2. Arquitectura del Entorno de Pruebas

Para garantizar pruebas ultrarrápidas, deterministas y sin dependencias externas:

- **Runner & Test Engine**: [Vitest 5](https://vitest.dev/) con configuración nativa ESM vía `vitest/config`.
- **Entorno DOM**: `jsdom` para simulación del DOM del navegador en memoria.
- **Matchers & Testing Library**: `@testing-library/react` (v16) y `@testing-library/jest-dom/vitest` (v7) para aserciones semánticas (`toBeInTheDocument`, `toBeDisabled`, `toHaveAttribute`, etc.).
- **Aislamiento de Estado**: En `src/test/setup.ts`, cada test limpia automáticamente el DOM (`cleanup()`) y el almacenamiento local (`localStorage.clear()`).
- **Simulación de API / Red**: Mocks de `fetch` y servicios API con `vi.fn()` y `vi.spyOn()` para validar contratos HTTP, cabeceras JWT, serialización JSON y manejo de errores.

---

## 📂 3. Estructura de la Suite Completa (60 Tests)

### A. Pruebas Unitarias (41 Tests)

| Archivo | Tests | Descripción y Cobertura |
| :--- | :---: | :--- |
| **[`fileParser.test.ts`](file:///Users/johanrodriguez/Documents/inti/sesamo/sesamoWeb/src/test/fileParser.test.ts)** | **10** | **Procesamiento de Archivos y Normalización**: <br>• Validación estricta de filas de preguntas con opciones A-D y clave correcta.<br>• Normalización de mayúsculas/minúsculas en respuestas.<br>• Resolución de fallback para `questionnaire_id`.<br>• Detección y reporte detallado de errores en filas inválidas o incompletas.<br>• Validación y mapeo de alias de columnas en cuestionarios y categorías.<br>• Lectura y parseo de buffers XLSX/CSV reales con la librería `xlsx`. |
| **[`api.test.ts`](file:///Users/johanrodriguez/Documents/inti/sesamo/sesamoWeb/src/test/api.test.ts)** | **15** | **Capa de Servicios REST y Autenticación**: <br>• Configuración dinámica y persistencia de URL base (`sesamo_api_url`).<br>• Almacenamiento seguro y limpieza de token JWT (`sesamo_access_token`).<br>• Decodificación manual de JWT compatible con caracteres especiales UTF-8 y base64 URL-safe.<br>• Endpoints: `login`, `getCategories`, `getQuestionnaires`, `createCategory`, `createQuestionnaire`, `createQuestion`, `createAnswerOption`.<br>• Inyección automática de cabecera `Authorization: Bearer <token>`.<br>• Manejo de errores HTTP (403, 401, 500) y excepciones de red/conexión. |
| **[`LoginScreen.test.tsx`](file:///Users/johanrodriguez/Documents/inti/sesamo/sesamoWeb/src/test/LoginScreen.test.tsx)** | **5** | **Control de Acceso y Puerta de Seguridad**: <br>• Renderizado inicial del formulario con títulos institucionales e inputs.<br>• Flujo exitoso para administradores (`role_id: 1`) con invocación de `onLoginSuccess`.<br>• **Restricción RBAC**: Bloqueo explícito a usuarios estudiantes (`role_id: 2`) con banner de error y purga de token.<br>• Captura y visualización de errores de autenticación del backend.<br>• Formulario emergente para configuración rápida de URL base de la API. |
| **[`AuthBar.test.tsx`](file:///Users/johanrodriguez/Documents/inti/sesamo/sesamoWeb/src/test/AuthBar.test.tsx)** | **4** | **Barra de Navegación y Sesión**: <br>• Visualización del botón de inicio de sesión cuando no hay sesión activa.<br>• Visualización de insignia de rol (`🛡️ Admin`) y correo del usuario conectado.<br>• Cierre de sesión (purga de token y notificación de cambio de estado).<br>• Modal de configuración de endpoint API con persistencia. |
| **[`App.test.tsx`](file:///Users/johanrodriguez/Documents/inti/sesamo/sesamoWeb/src/test/App.test.tsx)** | **3** | **Enrutamiento y Estado Raíz**: <br>• Renderizado condicional de `LoginScreen` ante ausencia de token.<br>• Renderizado de `LoginScreen` si el token pertenece a un estudiante.<br>• Acceso y renderizado del panel administrativo (`AuthBar` + `BulkUploader`) ante un administrador válido. |
| **[`BulkUploader.test.tsx`](file:///Users/johanrodriguez/Documents/inti/sesamo/sesamoWeb/src/test/BulkUploader.test.tsx)** | **4** | **Componente Principal de Carga Masiva**: <br>• Navegación entre pestañas (Preguntas, Cuestionarios, Categorías).<br>• Descarga de plantillas de ejemplo en formatos CSV y XLSX.<br>• Carga de archivo simulado, parseo y vista previa con métricas.<br>• Ejecución del ciclo de carga masiva a la base de datos con reporte de progreso y resultados. |

### B. Pruebas de Sistema E2E (3 Tests)

| Archivo | Tests | Workflow de Negocio Validado de Extremo a Extremo |
| :--- | :---: | :--- |
| **[`system_admin_auth.test.tsx`](file:///Users/johanrodriguez/Documents/inti/sesamo/sesamoWeb/src/test/system/system_admin_auth.test.tsx)** | **1** | **Ciclo Completo de Autenticación, RBAC y Salida**: <br>1. Usuario anónimo visualiza `LoginScreen`.<br>2. Estudiante intenta entrar y es bloqueado con banner de error y purga de token de `localStorage`.<br>3. Administrador ingresa credenciales válidas; el backend responde con JWT real; la app conmuta su estado global y abre el dashboard con `AuthBar` (`🛡️ Admin`) y `BulkUploader`.<br>4. Admin presiona "Salir"; el sistema purga el token y regresa inmediatamente a `LoginScreen`. |
| **[`system_bulk_ingestion.test.tsx`](file:///Users/johanrodriguez/Documents/inti/sesamo/sesamoWeb/src/test/system/system_bulk_ingestion.test.tsx)** | **1** | **Carga Masiva Real de Preguntas desde Hoja de Cálculo (XLSX)**: <br>1. Se genera un archivo `.xlsx` binario en memoria con múltiples preguntas y sus 4 opciones A-D.<br>2. Se simula la carga del archivo en el dropzone.<br>3. El sistema valida las filas y despliega la tabla de vista previa con métricas.<br>4. Se inicia la carga hacia la base de datos.<br>5. El sistema ejecuta la secuencia de llamadas: `createQuestion` $\to$ 4 llamadas a `createAnswerOption` por cada pregunta, preservando la opción correcta y actualizando la barra de progreso en vivo hasta el resumen final exitoso. |
| **[`system_ingestion_fault_recovery.test.tsx`](file:///Users/johanrodriguez/Documents/inti/sesamo/sesamoWeb/src/test/system/system_ingestion_fault_recovery.test.tsx)** | **1** | **Resiliencia y Aislamiento de Fallos en Ingesta Masiva**: <br>1. Ingesta de un lote que contiene filas válidas y filas que fallan en el backend (ej. clave duplicada o error 400).<br>2. El sistema atrapa el error sin interrumpir la ejecución, continúa procesando las filas restantes, acumula contadores de éxitos y fallas (`Finalizado: 1 creadas, 1 con error`) y detalla cada error en el panel de auditoría de logs. |

### C. Pruebas de Usabilidad y Experiencia de Usuario (16 Tests)

| Archivo | Tests | Criterios y Heurísticas de Usabilidad Evaluadas |
| :--- | :---: | :--- |
| **[`form_accessibility_and_heuristics.test.tsx`](file:///Users/johanrodriguez/Documents/inti/sesamo/sesamoWeb/src/test/usability/form_accessibility_and_heuristics.test.tsx)** | **5** | **Accesibilidad de Formularios (WCAG 2.1 AA) y Heurísticas 1 & 9 de Nielsen:**<br>• Vinculación estricta de `<label>` con `<input>` mediante `htmlFor` e `id` (`login-email`, `login-password`) para lectura asistida.<br>• Semántica HTML5 nativa: atributos `type="email"`, `type="password"`, `required` y `autoFocus` para agilizar ingreso por teclado sin clics adicionales.<br>• **Heurística 1 (Estado del sistema)**: Estado asíncrono visible ("Validando credenciales...") y botón bloqueado durante el envío para evitar envíos duplicados.<br>• **Heurística 9 (Diagnóstico de errores)**: Notificación descriptiva de denegación de rol RBAC indicando exactamente qué rol tiene el usuario y qué roles están autorizados.<br>• **Control del usuario**: Despliegue en ventana del configurador de URL de API sin abandonar la vista actual. |
| **[`system_status_and_error_prevention.test.tsx`](file:///Users/johanrodriguez/Documents/inti/sesamo/sesamoWeb/src/test/usability/system_status_and_error_prevention.test.tsx)** | **5** | **Heurística 1 (Estado del Sistema) y Heurística 5 (Prevención de Errores):**<br>• Píldoras cuantitativas de validación en tiempo real: `Total: X`, `✓ Válidos: Y` y `✕ Errores: Z`.<br>• Filtros interactivos ("Solo Válidos", "Solo Errores", "Todos") para reducir fatiga visual y localizar anomalías rápidamente.<br>• **Prevención estricta de carga**: Botón `btn-upload` deshabilitado si no existen registros válidos (`0 Registros Válidos`), evitando peticiones nulas al backend.<br>• Advertencia preventiva y bloqueo si el operador no cuenta con credenciales de Administrador.<br>• Barra de progreso animada con porcentaje (`100%`), contador de paso fraccionario (`1 / 1`) y tarjeta de celebración final con desglose de éxitos y fallas. |
| **[`user_control_and_guidance.test.tsx`](file:///Users/johanrodriguez/Documents/inti/sesamo/sesamoWeb/src/test/usability/user_control_and_guidance.test.tsx)** | **6** | **Heurística 3 (Control y Libertad), Heurística 8 (Diseño Minimalista) y Heurística 10 (Ayuda):**<br>• **Ayuda guiada**: Botones visibles y directos para descarga de plantillas oficiales en formatos CSV y Excel (.xlsx).<br>• **Control en dropzone**: Respuesta visual al arrastrar (`dragging`) y visualización de metadatos del archivo seleccionado con capacidad de sustitución mediante clic o arrastre.<br>• **Claridad contextual**: Explicación del cuestionario por defecto (`cuestionario_id`) y listado de insignias con IDs y nombres de categorías registradas en la base de datos.<br>• **Transparencia en auditoría**: Consola de logs con marcas temporales `[HH:MM:SS]` y diferenciación de clases CSS (`success` / `error`) para diagnóstico de cada fila.<br>• Gestión de sesión en `AuthBar`: Insignia de rol `🛡️ Admin`, email y botón "Salir" de efecto inmediato. |

---

## 🚀 4. Guía de Ejecución

### Ejecutar toda la suite (Unitarias + Sistema + Usabilidad):
```bash
cd sesamoWeb
npm test
```

### Ejecutar ÚNICAMENTE las Pruebas de Usabilidad:
```bash
cd sesamoWeb
npx vitest run src/test/usability
```

### Ejecutar ÚNICAMENTE las Pruebas de Sistema:
```bash
cd sesamoWeb
npx vitest run src/test/system
```

### Ejecutar ÚNICAMENTE las Pruebas Unitarias:
```bash
cd sesamoWeb
npx vitest run src/test/*.test.*
```

### Validar compilación TypeScript y oxlint:
```bash
cd sesamoWeb
npm run lint && npm run build
```

---

## 📊 5. Resultado de la Última Ejecución

```text
 ✓ src/test/api.test.ts (15 tests) 5ms
 ✓ src/test/fileParser.test.ts (10 tests) 17ms
 ✓ src/test/AuthBar.test.tsx (4 tests) 170ms
 ✓ src/test/LoginScreen.test.tsx (5 tests) 231ms
 ✓ src/test/App.test.tsx (3 tests) 337ms
 ✓ src/test/system/system_bulk_ingestion.test.tsx (1 test) 370ms
 ✓ src/test/system/system_ingestion_fault_recovery.test.tsx (1 test) 339ms
 ✓ src/test/system/system_admin_auth.test.tsx (1 test) 344ms
 ✓ src/test/BulkUploader.test.tsx (4 tests) 397ms
 ✓ src/test/usability/form_accessibility_and_heuristics.test.tsx (5 tests) 102ms
 ✓ src/test/usability/system_status_and_error_prevention.test.tsx (5 tests) 422ms
 ✓ src/test/usability/user_control_and_guidance.test.tsx (6 tests) 398ms

 Test Files  12 passed (12)
      Tests  60 passed (60)
   Start at  22:26:04
   Duration  1.74s
```
