const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../config/logger');

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socketId
    this.userSockets = new Map(); // socketId -> userId
  }

  // Inicializar servicio de WebSocket
  initialize(io) {
    this.io = io;
    
    // Middleware de autenticación para Socket.IO
    io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
          return next(new Error('Token de autenticación requerido'));
        }

        // Verificar token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Buscar usuario
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user || !user.isActive) {
          return next(new Error('Usuario no válido o inactivo'));
        }

        // Agregar usuario al socket
        socket.userId = user._id.toString();
        socket.user = user;
        
        next();
      } catch (error) {
        logger.error('Error en autenticación WebSocket:', error);
        next(new Error('Token inválido'));
      }
    });

    // Manejar conexiones
    io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    logger.info('Servicio WebSocket inicializado correctamente');
  }

  // Manejar nueva conexión
  handleConnection(socket) {
    const userId = socket.userId;
    const username = socket.user.username;

    // Registrar conexión
    this.connectedUsers.set(userId, socket.id);
    this.userSockets.set(socket.id, userId);

    logger.info(`Usuario conectado via WebSocket: ${username} (${socket.id})`);

    // Unirse a sala personal del usuario
    socket.join(`user:${userId}`);

    // Eventos del socket
    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });

    // Eventos de tareas
    socket.on('task:subscribe', (taskId) => {
      socket.join(`task:${taskId}`);
      logger.debug(`Usuario ${username} suscrito a tarea ${taskId}`);
    });

    socket.on('task:unsubscribe', (taskId) => {
      socket.leave(`task:${taskId}`);
      logger.debug(`Usuario ${username} desuscrito de tarea ${taskId}`);
    });

    // Eventos de notificaciones
    socket.on('notification:read', (notificationId) => {
      // Marcar notificación como leída
      this.handleNotificationRead(socket, notificationId);
    });

    // Evento de ping para mantener conexión
    socket.on('ping', () => {
      socket.emit('pong');
    });

    // Emitir evento de conexión exitosa
    socket.emit('connected', {
      message: 'Conectado exitosamente',
      userId: userId,
      timestamp: new Date().toISOString()
    });
  }

  // Manejar desconexión
  handleDisconnection(socket) {
    const userId = this.userSockets.get(socket.id);
    
    if (userId) {
      const username = socket.user?.username || 'Usuario desconocido';
      
      // Limpiar registros
      this.connectedUsers.delete(userId);
      this.userSockets.delete(socket.id);
      
      logger.info(`Usuario desconectado via WebSocket: ${username} (${socket.id})`);
    }
  }

  // Emitir evento a un usuario específico
  emitToUser(userId, event, data) {
    try {
      if (!this.io) {
        logger.warn('WebSocket no inicializado');
        return false;
      }

      const socketId = this.connectedUsers.get(userId.toString());
      
      if (socketId) {
        this.io.to(socketId).emit(event, data);
        logger.debug(`Evento ${event} enviado a usuario ${userId}`);
        return true;
      } else {
        logger.debug(`Usuario ${userId} no conectado via WebSocket`);
        return false;
      }
    } catch (error) {
      logger.error('Error al emitir evento a usuario:', error);
      return false;
    }
  }

  // Emitir evento a una sala específica
  emitToRoom(room, event, data) {
    try {
      if (!this.io) {
        logger.warn('WebSocket no inicializado');
        return false;
      }

      this.io.to(room).emit(event, data);
      logger.debug(`Evento ${event} enviado a sala ${room}`);
      return true;
    } catch (error) {
      logger.error('Error al emitir evento a sala:', error);
      return false;
    }
  }

  // Emitir evento a todos los usuarios conectados
  emitToAll(event, data) {
    try {
      if (!this.io) {
        logger.warn('WebSocket no inicializado');
        return false;
      }

      this.io.emit(event, data);
      logger.debug(`Evento ${event} enviado a todos los usuarios`);
      return true;
    } catch (error) {
      logger.error('Error al emitir evento a todos:', error);
      return false;
    }
  }

  // Emitir notificación a usuario
  emitNotification(userId, notification) {
    return this.emitToUser(userId, 'notification', {
      id: notification.id || Date.now(),
      type: notification.type || 'info',
      title: notification.title,
      message: notification.message,
      timestamp: new Date().toISOString(),
      data: notification.data || {}
    });
  }

  // Manejar notificación leída
  handleNotificationRead(socket, notificationId) {
    logger.debug(`Notificación ${notificationId} marcada como leída por ${socket.user.username}`);
    // Aquí puedes agregar lógica para marcar la notificación como leída en la BD
  }

  // Obtener usuarios conectados
  getConnectedUsers() {
    return Array.from(this.connectedUsers.keys());
  }

  // Verificar si un usuario está conectado
  isUserConnected(userId) {
    return this.connectedUsers.has(userId.toString());
  }

  // Obtener estadísticas de conexiones
  getStats() {
    return {
      connectedUsers: this.connectedUsers.size,
      totalSockets: this.userSockets.size,
      rooms: this.io ? Object.keys(this.io.sockets.adapter.rooms).length : 0
    };
  }

  // Desconectar usuario específico
  disconnectUser(userId, reason = 'Desconectado por el servidor') {
    const socketId = this.connectedUsers.get(userId.toString());
    
    if (socketId && this.io) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit('force-disconnect', { reason });
        socket.disconnect(true);
        logger.info(`Usuario ${userId} desconectado forzosamente: ${reason}`);
        return true;
      }
    }
    
    return false;
  }
}

// Crear instancia única
const socketService = new SocketService();

module.exports = socketService;