const express = require('express');
const { body, param, query } = require('express-validator');
const { validationResult } = require('express-validator');

const { adminAuth } = require('../middleware/auth');
const User = require('../models/User');
const Task = require('../models/Task');
const socketService = require('../services/socketService');
const logger = require('../config/logger');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

// Aplicar middleware de admin a todas las rutas
router.use(adminAuth);

// Validaciones
const userIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('ID de usuario inválido')
];

const updateUserRoleValidation = [
  body('role')
    .isIn(['user', 'admin'])
    .withMessage('Rol inválido')
];

const updateUserStatusValidation = [
  body('active')
    .isBoolean()
    .withMessage('El estado debe ser true o false')
];

const queryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La página debe ser un número mayor a 0'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe ser entre 1 y 100'),
  
  query('sort')
    .optional()
    .matches(/^(createdAt|username|email|lastLogin):(asc|desc)$/)
    .withMessage('Formato de ordenamiento inválido')
];

// Middleware de validación
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors: errors.array().map(error => error.msg)
    });
  }
  next();
};

// Obtener estadísticas del sistema
router.get('/statistics', async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalTasks,
      totalEvents,
      tasksByStatus,
      userGrowth,
      taskGrowth
    ] = await Promise.all([
      // Total de usuarios
      User.countDocuments(),
      
      // Total de tareas
      Task.countDocuments(),
      
      // Total de eventos (placeholder - implementar si tienes modelo de eventos)
      Promise.resolve(0),
      
      // Tareas por estado
      Task.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),
      
      // Crecimiento de usuarios (últimos 30 días)
      User.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt'
              }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]),
      
      // Crecimiento de tareas (últimos 30 días)
      Task.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt'
              }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ])
    ]);

    // Formatear datos para el frontend
    const stats = {
      totals: {
        users: totalUsers,
        tasks: totalTasks,
        events: totalEvents
      },
      tasksByStatus: tasksByStatus.map(item => ({
        _id: item._id,
        count: item.count
      })),
      userGrowth: userGrowth.map(item => ({
        date: item._id,
        count: item.count
      })),
      taskGrowth: taskGrowth.map(item => ({
        date: item._id,
        count: item.count
      }))
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    next(error);
  }
});

// Obtener todos los usuarios
router.get('/users', queryValidation, handleValidation, async (req, res, next) => {
  try {
    const {
      search = '',
      page = 1,
      limit = 10,
      sort = 'createdAt:desc'
    } = req.query;

    // Construir query de búsqueda
    let query = {};
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Configurar ordenamiento
    const [sortField, sortOrder] = sort.split(':');
    const sortObj = {};
    sortObj[sortField] = sortOrder === 'desc' ? -1 : 1;

    // Ejecutar consulta con paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort(sortObj)
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query)
    ]);

    // Calcular páginas
    const pages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        pages,
        limit: parseInt(limit),
        total
      }
    });

  } catch (error) {
    next(error);
  }
});

// Obtener detalles de un usuario específico
router.get('/users/:id', userIdValidation, handleValidation, async (req, res, next) => {
  try {
    const { id } = req.params;

    const [user, taskStats, recentTasks, recentEvents] = await Promise.all([
      User.findById(id).select('-password'),
      Task.getStatsByUser(id),
      Task.find({ user: id })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title status dueDate createdAt'),
      Promise.resolve([]) // Placeholder para eventos
    ]);

    if (!user) {
      return next(new AppError('Usuario no encontrado', 404));
    }

    // Formatear estadísticas
    const stats = {
      taskCount: taskStats.reduce((total, stat) => total + stat.count, 0),
      eventCount: 0 // Placeholder
    };

    res.json({
      success: true,
      data: {
        user,
        stats,
        recentTasks,
        recentEvents
      }
    });

  } catch (error) {
    next(error);
  }
});

// Actualizar rol de usuario
router.patch('/users/:id/role', userIdValidation, updateUserRoleValidation, handleValidation, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Verificar que el usuario existe
    const user = await User.findById(id);
    if (!user) {
      return next(new AppError('Usuario no encontrado', 404));
    }

    // Verificar que no se esté cambiando el rol de sí mismo
    if (user._id.toString() === req.user._id.toString()) {
      return next(new AppError('No puedes cambiar tu propio rol', 400));
    }

    // Actualizar rol
    user.role = role;
    await user.save();

    logger.info(`Rol de usuario actualizado por admin: ${user.email} -> ${role} (por ${req.user.email})`);

    // Notificar al usuario si está conectado
    socketService.emitToUser(user._id, 'user:role-updated', {
      newRole: role,
      message: `Tu rol ha sido actualizado a ${role}`
    });

    res.json({
      success: true,
      message: 'Rol actualizado exitosamente',
      data: user.toAuthJSON()
    });

  } catch (error) {
    next(error);
  }
});

// Activar/desactivar usuario
router.patch('/users/:id/status', userIdValidation, updateUserStatusValidation, handleValidation, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { active } = req.body;

    // Verificar que el usuario existe
    const user = await User.findById(id);
    if (!user) {
      return next(new AppError('Usuario no encontrado', 404));
    }

    // Verificar que no se esté desactivando a sí mismo
    if (user._id.toString() === req.user._id.toString()) {
      return next(new AppError('No puedes desactivar tu propia cuenta', 400));
    }

    // Actualizar estado
    user.isActive = active;
    await user.save();

    const action = active ? 'activado' : 'desactivado';
    logger.info(`Usuario ${action} por admin: ${user.email} (por ${req.user.email})`);

    // Desconectar usuario si se desactiva
    if (!active) {
      socketService.disconnectUser(user._id, 'Cuenta desactivada por administrador');
    }

    // Notificar al usuario
    socketService.emitToUser(user._id, 'user:status-updated', {
      isActive: active,
      message: `Tu cuenta ha sido ${action}`
    });

    res.json({
      success: true,
      message: `Usuario ${action} exitosamente`,
      data: user.toAuthJSON()
    });

  } catch (error) {
    next(error);
  }
});

// Eliminar usuario (soft delete)
router.delete('/users/:id', userIdValidation, handleValidation, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verificar que el usuario existe
    const user = await User.findById(id);
    if (!user) {
      return next(new AppError('Usuario no encontrado', 404));
    }

    // Verificar que no se esté eliminando a sí mismo
    if (user._id.toString() === req.user._id.toString()) {
      return next(new AppError('No puedes eliminar tu propia cuenta', 400));
    }

    // Desactivar usuario en lugar de eliminarlo
    user.isActive = false;
    user.email = `deleted_${Date.now()}_${user.email}`;
    user.username = `deleted_${Date.now()}_${user.username}`;
    await user.save();

    logger.info(`Usuario eliminado por admin: ${user.email} (por ${req.user.email})`);

    // Desconectar usuario
    socketService.disconnectUser(user._id, 'Cuenta eliminada por administrador');

    res.json({
      success: true,
      message: 'Usuario eliminado exitosamente'
    });

  } catch (error) {
    next(error);
  }
});

// Obtener estadísticas de WebSocket
router.get('/websocket/stats', (req, res) => {
  const stats = socketService.getStats();
  res.json({
    success: true,
    data: stats
  });
});

// Obtener usuarios conectados
router.get('/websocket/connected-users', async (req, res, next) => {
  try {
    const connectedUserIds = socketService.getConnectedUsers();
    
    const connectedUsers = await User.find({
      _id: { $in: connectedUserIds }
    }).select('username email lastLogin');

    res.json({
      success: true,
      data: {
        count: connectedUsers.length,
        users: connectedUsers
      }
    });

  } catch (error) {
    next(error);
  }
});

// Desconectar usuario específico
router.post('/websocket/disconnect/:id', userIdValidation, handleValidation, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason = 'Desconectado por administrador' } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return next(new AppError('Usuario no encontrado', 404));
    }

    const disconnected = socketService.disconnectUser(id, reason);

    logger.info(`Usuario desconectado por admin: ${user.email} (por ${req.user.email})`);

    res.json({
      success: true,
      message: disconnected ? 'Usuario desconectado exitosamente' : 'Usuario no estaba conectado'
    });

  } catch (error) {
    next(error);
  }
});

// Enviar notificación a usuario específico
router.post('/notifications/send/:id', userIdValidation, handleValidation, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, message, type = 'info' } = req.body;

    if (!title || !message) {
      return next(new AppError('Título y mensaje son requeridos', 400));
    }

    const user = await User.findById(id);
    if (!user) {
      return next(new AppError('Usuario no encontrado', 404));
    }

    const notification = {
      title,
      message,
      type,
      data: {
        from: 'admin',
        adminUser: req.user.username
      }
    };

    const sent = socketService.emitNotification(id, notification);

    logger.info(`Notificación enviada por admin a ${user.email}: ${title} (por ${req.user.email})`);

    res.json({
      success: true,
      message: sent ? 'Notificación enviada exitosamente' : 'Usuario no conectado, notificación no enviada'
    });

  } catch (error) {
    next(error);
  }
});

// Enviar notificación broadcast
router.post('/notifications/broadcast', async (req, res, next) => {
  try {
    const { title, message, type = 'info' } = req.body;

    if (!title || !message) {
      return next(new AppError('Título y mensaje son requeridos', 400));
    }

    const notification = {
      title,
      message,
      type,
      data: {
        from: 'admin',
        adminUser: req.user.username,
        broadcast: true
      }
    };

    socketService.emitToAll('notification', notification);

    logger.info(`Notificación broadcast enviada por admin: ${title} (por ${req.user.email})`);

    res.json({
      success: true,
      message: 'Notificación broadcast enviada exitosamente'
    });

  } catch (error) {
    next(error);
  }
});

// Obtener logs del sistema (últimos 100)
router.get('/logs', async (req, res, next) => {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    const logPath = path.join(__dirname, '../../logs/combined.log');
    
    try {
      const logContent = await fs.readFile(logPath, 'utf8');
      const logs = logContent
        .split('\n')
        .filter(line => line.trim())
        .slice(-100) // Últimas 100 líneas
        .reverse(); // Más recientes primero

      res.json({
        success: true,
        data: logs
      });
    } catch (fileError) {
      res.json({
        success: true,
        data: [],
        message: 'Archivo de logs no encontrado'
      });
    }

  } catch (error) {
    next(error);
  }
});

// Limpiar logs antiguos
router.delete('/logs', async (req, res, next) => {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    const logPath = path.join(__dirname, '../../logs/combined.log');
    const errorLogPath = path.join(__dirname, '../../logs/error.log');
    
    // Crear backup antes de limpiar
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    try {
      await fs.copyFile(logPath, `${logPath}.backup-${timestamp}`);
      await fs.copyFile(errorLogPath, `${errorLogPath}.backup-${timestamp}`);
      
      // Limpiar logs
      await fs.writeFile(logPath, '');
      await fs.writeFile(errorLogPath, '');
      
      logger.info(`Logs limpiados por admin: ${req.user.email}`);
      
      res.json({
        success: true,
        message: 'Logs limpiados exitosamente (backup creado)'
      });
    } catch (fileError) {
      res.json({
        success: true,
        message: 'No hay logs para limpiar'
      });
    }

  } catch (error) {
    next(error);
  }
});

module.exports = router;