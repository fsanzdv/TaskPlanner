const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Importar configuraciones
const connectDB = require('./src/config/database');
const logger = require('./src/config/logger');
const emailService = require('./src/services/emailService');

// Importar rutas
const authRoutes = require('./src/routes/authRoutes');
const taskRoutes = require('./src/routes/taskRoutes');
const adminRoutes = require('./src/routes/adminRoutes');

// Importar middleware
const errorHandler = require('./src/middleware/errorHandler');
const authMiddleware = require('./src/middleware/auth');

// Importar servicios WebSocket
const socketService = require('./src/services/socketService');

const app = express();
const server = http.createServer(app);

// Configurar CORS
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middlewares de seguridad
app.use(helmet());
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // límite de 100 requests por ventana de tiempo
  message: 'Demasiadas peticiones, intenta nuevamente más tarde.'
});
app.use('/api/', limiter);

// Middleware para parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configurar Socket.IO
const io = socketIo(server, {
  cors: corsOptions
});

// Inicializar servicio de WebSocket
socketService.initialize(io);

// Rutas principales
app.use('/api/auth', authRoutes);
app.use('/api/tasks', authMiddleware, taskRoutes);
app.use('/api/admin', authMiddleware, adminRoutes);

// Ruta de prueba
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'TaskPlanner API funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// Ruta raíz
app.get('/', (req, res) => {
  res.json({ 
    message: 'TaskPlanner API',
    version: '1.0.0',
    docs: '/api/test'
  });
});

// Middleware de manejo de errores
app.use(errorHandler);

// Manejar rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

// Función para inicializar el servidor
async function startServer() {
  try {
    // Conectar a la base de datos
    await connectDB();
    logger.info('MongoDB conectado: ' + (process.env.MONGODB_URI || 'localhost'));

    // Inicializar servicio de correo
    await emailService.initialize();
    logger.info('Conexión con servidor de correo establecida correctamente');

    // Iniciar servidor
    const PORT = process.env.PORT || 5051;
    server.listen(PORT, () => {
      logger.info(`Servidor iniciado en el puerto ${PORT} en modo ${process.env.NODE_ENV || 'development'}`);
    });

  } catch (error) {
    logger.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

// Manejar errores no capturados
process.on('uncaughtException', (error) => {
  logger.error('Error no capturado:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  logger.error('Promesa rechazada no manejada:', error);
  process.exit(1);
});

// Iniciar servidor
startServer();

module.exports = { app, server, io };