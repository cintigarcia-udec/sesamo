# 🎓 Plataforma Educativa Sésamo (Monorepo)

> **Proyecto Universitario - Síntesis Evaluativa**  
> **Institución:** Universidad de Cundinamarca  
> **Integrantes:**  
> - Carlos García (`cintigarcia@ucundinamarca.edu.co`)  
> - Andrea Cardona (`yacardona@ucundinamarca.edu.co`)  
> **Fecha:** Octubre de 2026  

---

## 🌐 1. Acceso en Vivo a la Plataforma en la Nube (DigitalOcean)

El sistema se encuentra desplegado y funcionando activamente en producción en la nube. Los jurados y evaluadores pueden acceder de forma inmediata sin necesidad de compilar o instalar software adicional:

| Servicio | Enlace de Acceso Público | Descripción |
| :--- | :--- | :--- |
| 💻 **Portal Web Administrativo** | [http://165.245.199.227](http://165.245.199.227) | Interfaz React 19 + NGINX para ingesta masiva y gestión |
| 📖 **Documentación Interactiva Swagger** | [http://165.245.199.227:8000/docs](http://165.245.199.227:8000/docs) | API RESTful interactiva FastAPI (OpenAPI 3.1) |
| 📱 **Proyecto Móvil en Expo** | [sesamo-mobile en Expo EAS](https://expo.dev/accounts/yacardona01/projects/sesamo-mobile) | Tablero de compilación y descarga de la app móvil |

### 🔑 Credenciales Semilla Preconfiguradas:

* **Administrador (Acceso al Portal Web y Móvil):**
  * **Correo:** `admin@sesamo.com`
  * **Contraseña:** `admin123`
* **Estudiante (Acceso a la App Móvil):**
  * **Correo:** `student@sesamo.com`
  * **Contraseña:** `student123`

---

## 🏛️ 2. Arquitectura del Monorepo y Stack Tecnológico

El proyecto está consolidado bajo una arquitectura monorepo desacoplada en tres componentes principales y orquestada con Docker:

```
sesamo/
├── docker-compose.yml                   # Orquestación de MySQL, Backend y Frontend Web
├── .gitignore                           # Exclusiones de control de versiones y seguridad
├── README.md                            # Guía de despliegue y documentación general
├── sesamoBack/                          # API RESTful (FastAPI + SQLAlchemy)
│   ├── Dockerfile                       # Contenedor optimizado en Python 3.12-slim
│   ├── app/                             # Modelos, controladores, repositorios y esquemas
│   ├── tests/                           # Suite de 63 pruebas automatizadas
│   └── requirements.txt
├── sesamoWeb/                           # Portal Web Administrativo (React 19 + Vite)
│   ├── Dockerfile                       # Multi-stage build con NGINX Alpine
│   ├── nginx.conf                       # Reverse proxy para API y enrutamiento SPA
│   └── src/                             # Ingesta masiva, autenticación y componentes
└── sesamoMobile/                        # Aplicación Móvil Multi-rol (Expo / React Native)
    ├── eas.json                         # Perfil de compilación para generación de APK
    ├── app/                             # Rutas y vistas multi-rol (Estudiante / Admin)
    └── __tests__/                       # Suite de 60 pruebas unitarias y de usabilidad
```

### Tecnologías:
* **Backend:** Python 3.12, FastAPI, SQLAlchemy ORM, PyMySQL, JWT (HS256), Passlib / Bcrypt, Pytest.
* **Portal Web:** React 19, TypeScript, Vite, NGINX Alpine (Reverse Proxy), Vitest, React Testing Library.
* **App Móvil:** React Native, Expo 54, Expo Router (file-based routing), Jest.
* **Infraestructura & Base de Datos:** MySQL 8.0, Docker & Docker Compose, DigitalOcean Droplet Ubuntu.

---

## 📱 3. Instrucciones para la Aplicación Móvil (`sesamoMobile`)

La aplicación móvil conecta directamente con el servidor en la nube (`http://165.245.199.227:8000`) y puede ser evaluada mediante dos alternativas:

### Opción A: Instalación Directa del APK en Android (Recomendada)
1. Ingresar al enlace público de descargas de EAS:  
   👉 **[Descargar APK en Expo EAS](https://expo.dev/accounts/yacardona01/projects/sesamo-mobile)**
2. Descargar el archivo `sesamo.apk` o escanear el código QR directamente desde el dispositivo Android.
3. Abrir el archivo en el teléfono y presionar **Instalar** (activando *"Instalar aplicaciones de fuentes desconocidas"* si el sistema lo solicita).

### Opción B: Ejecución Inmediata con Expo Go (Plan de Contingencia)
Si el evaluador prefiere ejecutar la app en su celular sin descargar el archivo APK:
1. Instalar la aplicación gratuita **Expo Go** desde Google Play Store en el celular.
2. Desde una terminal local en la carpeta `sesamoMobile`:
   ```bash
   cd sesamoMobile
   npm install
   npx expo start
   ```
3. Abrir **Expo Go** en el teléfono y escanear el código QR que proyecta la terminal.

### Opción C: Compilación Manual de un nuevo APK con EAS
Si se desea regenerar el APK con cambios adicionales:
```bash
cd sesamoMobile
npm install -g eas-cli
eas login
eas build -p android --profile preview
```

---

## 🐳 4. Puesta en Marcha Local (Alternativa para el Jurado)

Si el jurado prefiere levantar todo el entorno en su propia computadora en lugar de usar la nube:

### Prerrequisitos:
* Tener instalado **Docker Desktop** y **Docker Compose**.

### Comandos de ejecución:
1. Clonar el repositorio:
   ```bash
   git clone https://github.com/cintigarcia-udec/sesamo.git
   cd sesamo
   ```
2. Levantar la orquestación completa:
   ```bash
   docker compose up --build -d
   ```
3. Acceder localmente:
   * 💻 **Web:** [http://localhost](http://localhost) (Puerto 80)
   * 📖 **API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
   * 🗄️ **MySQL:** Puerto `3306`

---

## 🧪 5. Cobertura de Pruebas Automatizadas

El proyecto incorpora un marco riguroso de pruebas unitarias, de integración, de sistema y de usabilidad:

* **Backend (`sesamoBack`):**
  * **63 pruebas automatizadas con Pytest** (cobertura total de ciclo de vida de estudiantes, integridad referencial en cascada, flujos de autenticación, ergonomía de API y presupuestos de latencia).
  * Ejecución: `pytest` dentro de `sesamoBack`.
* **Frontend Web (`sesamoWeb`):**
  * **Pruebas con Vitest y React Testing Library** (ingesta masiva de archivos CSV/JSON, prevención de errores, validaciones reactivas y heurísticas de usabilidad).
  * Ejecución: `npm test` dentro de `sesamoWeb`.
* **Aplicación Móvil (`sesamoMobile`):**
  * **60 pruebas con Jest** (flujos de cuestionarios, resiliencia ante pérdida de conexión y contraste de accesibilidad táctil).
  * Ejecución: `npm test` dentro de `sesamoMobile`.

---

## 👥 6. Integrantes y Contribuciones

* **Carlos García** (`cintigarcia@ucundinamarca.edu.co`) - Arquitectura backend, API RESTful, modelos, base de datos y suite de pruebas del backend y frontend web.
* **Andrea Cardona** (`yacardona@ucundinamarca.edu.co`) - Desarrollo de la aplicación móvil multi-rol en Expo, diseño accesible, pruebas de la app móvil y DevOps con Docker/EAS.

---

## 📄 7. Licencia y Derechos

Proyecto desarrollado con fines académicos y de investigación para la Universidad de Cundinamarca.
