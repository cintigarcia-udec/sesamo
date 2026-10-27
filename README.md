# 🎓 Plataforma Educativa Sésamo (Monorepo)

> **Proyecto Universitario - Síntesis Evaluativa**  
> **Institución:** Universidad de Cundinamarca  
> **Integrantes:**  
> - Carlos García (`cintigarcia@ucundinamarca.edu.co`)  
> - Andrea Cardona (`yacardona@ucundinamarca.edu.co`)  
> **Fecha:** Octubre de 2026  

---

## 🏛️ 1. Arquitectura y Stack Tecnológico

El proyecto **Sésamo** está consolidado bajo una arquitectura monorepo unificada, desacoplada en tres componentes principales y orquestada con Docker:

```
sesamo/
├── docker-compose.yml                   # Orquestación de MySQL, Backend y Frontend Web
├── .gitignore                           # Exclusiones de control de versiones
├── README.md                            # Guía de despliegue y documentación general
├── sesamoBack/                          # API RESTful (FastAPI + SQLAlchemy)
│   ├── Dockerfile
│   ├── app/                             # Modelos, controladores, repositorios y esquemas
│   ├── tests/                           # Suite de 63 pruebas automatizadas
│   └── requirements.txt
├── sesamoWeb/                           # Portal Web Administrativo (React 19 + Vite)
│   ├── Dockerfile                       # Multi-stage build con NGINX Alpine
│   ├── nginx.conf                       # Configuración de reverse proxy / SPA routing
│   └── src/                             # Ingesta masiva, autenticación y gestión
└── sesamoMobile/                        # Aplicación Móvil (Expo / React Native)
    ├── eas.json                         # Perfil de compilación para generación de APK
    ├── app/                             # Rutas multi-rol (Estudiante y Administrador)
    └── __tests__/                       # Suite de 60 pruebas unitarias y de usabilidad
```

### Tecnologías:
* **Backend:** Python 3.12, FastAPI, SQLAlchemy ORM, PyMySQL, JWT (HS256), Pytest.
* **Portal Web:** React 19, TypeScript, Vite, NGINX Alpine, Vitest, Testing Library.
* **App Móvil:** React Native, Expo Router (file-based routing), Jest.
* **Base de Datos & Infraestructura:** MySQL 8.0, Docker & Docker Compose.

---

## 🚀 2. Guía de Ejecución Rápida para el Jurado

El sistema cuenta con orquestación completa para que los evaluadores puedan poner en marcha los servicios web y la base de datos con un único comando:

### Prerrequisitos:
* Tener instalado **Docker** y **Docker Compose**.

### Puesta en marcha:

1. Clonar o ubicarse en la raíz del repositorio `sesamo`:
   ```bash
   docker compose up --build -d
   ```

2. **Acceso a los Servicios:**
   * 💻 **Portal Web Administrativo:** [http://localhost](http://localhost) (Puerto 80)
   * 📖 **Documentación Interactiva Swagger (API):** [http://localhost:8000/docs](http://localhost:8000/docs)
   * 🗄️ **Motor de Base de Datos MySQL:** Puerto `3306` (Base de datos: `sesamo`)

3. **Credenciales Preconfiguradas (Semilla Automática):**
   * **Administrador:**
     * **Usuario:** `admin@sesamo.com`
     * **Contraseña:** `admin123`
   * **Estudiante:**
     * **Usuario:** `student@sesamo.com`
     * **Contraseña:** `student123`

> [!NOTE]
> Al iniciar en modo de desarrollo (`ENVIRONMENT=development`), la base de datos genera automáticamente el esquema relacional, roles, usuarios semilla y cuestionarios de prueba.

---

## 📱 3. Instrucciones para la Aplicación Móvil (`sesamoMobile`)

La aplicación móvil está diseñada para ejecutarse en dispositivos Android para que los evaluadores puedan calificar el flujo de cuestionarios y usabilidad:

### Opción A: Generación o Instalación del APK Directo (Recomendada)
1. Instalar la CLI de EAS e iniciar sesión en Expo:
   ```bash
   npm install -g eas-cli
   cd sesamoMobile
   eas login
   ```
2. Generar el APK compilado para Android:
   ```bash
   eas build -p android --profile preview
   ```
3. Descargar el archivo `sesamo.apk` generado o escanear el código QR en la terminal e instalarlo en el dispositivo Android activando *"Instalar aplicaciones de fuentes desconocidas"*.

### Opción B: Ejecución Local con Expo Go (Plan de Contingencia)
Si el jurado prefiere evaluar la aplicación sin instalar el APK:
1. Instalar dependencias en `sesamoMobile`:
   ```bash
   cd sesamoMobile
   npm install
   ```
2. Iniciar el servidor de desarrollo de Metro:
   ```bash
   npx expo start
   ```
3. Abrir la app **Expo Go** en el dispositivo móvil y escanear el código QR proyectado en la terminal.

---

## 🧪 4. Cobertura de Pruebas Automatizadas

El proyecto incorpora un marco riguroso de pruebas unitarias, de integración, de sistema y de usabilidad:

* **Backend (`sesamoBack`):**
  * 63 pruebas automatizadas con Pytest (cobertura de autenticación, ciclo de vida de estudiantes, integridad referencial en cascada, ergonomía de API y presupuestos de latencia).
  * Ejecución: `pytest` dentro de `sesamoBack`.
* **Frontend Web (`sesamoWeb`):**
  * Pruebas completas con Vitest y React Testing Library (ingesta masiva de archivos CSV/JSON, prevención de errores y heurísticas de usabilidad).
  * Ejecución: `npm test` dentro de `sesamoWeb`.
* **Aplicación Móvil (`sesamoMobile`):**
  * 60 pruebas con Jest (flujos de examen, resiliencia ante pérdida de conexión y contraste táctil de interfaz).
  * Ejecución: `npm test` dentro de `sesamoMobile`.

---

## 📄 5. Licencia y Derechos

Proyecto desarrollado con fines académicos y de investigación para la Universidad de Cundinamarca.
