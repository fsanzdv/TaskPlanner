# TaskPlanner 📝

Una aplicación web completa para gestión de tareas con información meteorológica integrada.

## 🚀 Características

- **Gestión de Tareas**: Crear, editar, eliminar y organizar tareas
- **Información del Clima**: Pronóstico meteorológico para el día de las tareas
- **Autenticación**: Sistema completo de registro y login
- **Tiempo Real**: Actualizaciones en vivo con WebSockets
- **Responsive**: Diseño adaptable para móviles y escritorio
- **Panel de Administración**: Para gestión de usuarios

## 🛠️ Tecnologías

### Frontend
- **React 18** - Framework de interfaz de usuario
- **React Router DOM** - Navegación
- **Axios** - Cliente HTTP
- **Socket.IO Client** - WebSockets
- **CSS personalizado** - Estilos

### Backend
- **Node.js** - Runtime de JavaScript
- **Express.js** - Framework web
- **MongoDB** - Base de datos
- **Mongoose** - ODM para MongoDB
- **Socket.IO** - WebSockets en tiempo real
- **JWT** - Autenticación
- **Nodemailer** - Envío de emails
- **Multer** - Subida de archivos
- **Winston** - Logging

### APIs Externas
- **OpenWeatherMap API** - Datos meteorológicos

## 📋 Prerrequisitos

- Node.js (v14 o superior)
- MongoDB (local o cloud)
- Cuenta en OpenWeatherMap (gratuita)

## ⚙️ Instalación

### 1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/taskplanner.git
cd taskplanner
```

### 2. Configurar el Backend

```bash
cd backend
npm install
```

Crear archivo `.env` basado en `.env.example`:
```bash
cp .env.example .env
```

Editar `.env` con tus configuraciones:
```env
# Puerto del servidor
PORT=5051

# Base de datos MongoDB
MONGODB_URI=mongodb://localhost:27017/taskplanner

# JWT Secret (cambiar por una clave segura)
JWT_SECRET=tu-jwt-secret-super-seguro

# API del clima
OPENWEATHER_API_KEY=tu-api-key-de-openweathermap

# Configuración de correo (opcional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=tu-password-de-aplicacion

# CORS
FRONTEND_URL=http://localhost:3000
```

### 3. Configurar el Frontend

```bash
cd ../Frontend
npm install
```

### 4. Iniciar la aplicación

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd Frontend
npm start
```

La aplicación estará disponible en:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5051

## 🌐 Configuración de la API del Clima

1. Registrarse en [OpenWeatherMap](https://openweathermap.org/api)
2. Obtener tu API key gratuita
3. Agregar la API key al archivo `.env` del backend:
   ```env
   OPENWEATHER_API_KEY=tu-api-key-aqui
   ```

## 📁 Estructura del Proyecto

```
taskplanner/
├── Frontend/                 # Aplicación React
│   ├── public/
│   ├── src/
│   │   ├── components/      # Componentes React
│   │   ├── contexts/        # Context API
│   │   ├── services/        # Servicios y API calls
│   │   └── styles.css       # Estilos globales
│   └── package.json
├── backend/                 # API Node.js
│   ├── src/
│   │   ├── config/          # Configuraciones
│   │   ├── controllers/     # Controladores
│   │   ├── middleware/      # Middlewares
│   │   ├── models/          # Modelos de MongoDB
│   │   ├── routes/          # Rutas de la API
│   │   └── services/        # Servicios
│   ├── logs/               # Archivos de log
│   ├── uploads/            # Archivos subidos
│   └── package.json
└── README.md
```

## 🎯 Funcionalidades Principales

### Gestión de Tareas
- ✅ Crear tareas con título, descripción, fecha y ciudad
- ✅ Establecer prioridad (Alta, Media, Baja)
- ✅ Cambiar estado (Pendiente, En Progreso, Completada)
- ✅ Eliminar tareas con confirmación
- ✅ Información meteorológica automática

### Sistema de Usuarios
- ✅ Registro e inicio de sesión
- ✅ Perfil de usuario
- ✅ Recuperación de contraseña
- ✅ Subida de foto de perfil

### Características Avanzadas
- ✅ Tiempo real con WebSockets
- ✅ Notificaciones en vivo
- ✅ Panel de administración
- ✅ Logs del sistema
- ✅ Cache inteligente para clima
- ✅ Validaciones robustas

## 🔧 Scripts Disponibles

### Backend
```bash
npm start          # Iniciar en producción
npm run dev        # Iniciar en desarrollo con nodemon
```

### Frontend
```bash
npm start          # Iniciar servidor de desarrollo
npm run build      # Crear build de producción
npm test           # Ejecutar tests
```

## 🚀 Despliegue

### Preparar para producción:

1. **Frontend**: Crear build
   ```bash
   cd Frontend
   npm run build
   ```

2. **Backend**: Configurar variables de entorno para producción
3. **Base de datos**: Usar MongoDB Atlas o servidor dedicado
4. **Servidor**: Heroku, DigitalOcean, AWS, etc.

## 🤝 Contribuir

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 👥 Autor

Tu Nombre - [tu-email@ejemplo.com](mailto:tu-email@ejemplo.com)

Enlace del Proyecto: [https://github.com/tu-usuario/taskplanner](https://github.com/tu-usuario/taskplanner)

## 🙏 Agradecimientos

- [OpenWeatherMap](https://openweathermap.org/) por la API del clima
- [React](https://reactjs.org/) por el framework frontend
- [Express.js](https://expressjs.com/) por el framework backend
- [MongoDB](https://www.mongodb.com/) por la base de datos