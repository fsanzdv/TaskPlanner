const express = require('express');
const { body, param, query } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const taskController = require('../controllers/taskController');
const { validationResult } = require('express-validator');

const router = express.Router();

// Configurar multer para archivos adjuntos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/attachments');
    
    // Crear directorio si no existe
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${uniqueSuffix}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|csv|xlsx|xls/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    
    if (extname) {
      return cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido'));
    }
  }
});

// Validaciones
const createTaskValidation = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('El título debe tener entre 1 y 200 caracteres'),
  
  body('description')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('La descripción debe tener entre 1 y 1000 caracteres'),
  
  body('dueDate')
    .isISO8601()
    .withMessage('Formato de fecha inválido')
    .custom((value) => {
      const dueDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (dueDate < today) {
        throw new Error('La fecha de vencimiento no puede ser en el pasado');
      }
      return true;
    }),
  
  body('city')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('La ciudad debe tener entre 1 y 100 caracteres'),
  
  body('status')
    .optional()
    .isIn(['pendiente', 'en progreso', 'completada'])
    .withMessage('Estado inválido'),
  
  body('priority')
    .optional()
    .isIn(['baja', 'media', 'alta'])
    .withMessage('Prioridad inválida'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Los tags deben ser un array')
    .custom((tags) => {
      if (tags.length > 10) {
        throw new Error('Máximo 10 tags permitidos');
      }
      return true;
    })
];

const updateTaskValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('El título debe tener entre 1 y 200 caracteres'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('La descripción debe tener entre 1 y 1000 caracteres'),
  
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Formato de fecha inválido'),
  
  body('city')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('La ciudad debe tener entre 1 y 100 caracteres'),
  
  body('status')
    .optional()
    .isIn(['pendiente', 'en progreso', 'completada'])
    .withMessage('Estado inválido'),
  
  body('priority')
    .optional()
    .isIn(['baja', 'media', 'alta'])
    .withMessage('Prioridad inválida'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Los tags deben ser un array')
];

const addNoteValidation = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('La nota debe tener entre 1 y 500 caracteres')
];

const taskIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('ID de tarea inválido')
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
  
  query('status')
    .optional()
    .isIn(['pendiente', 'en progreso', 'completada'])
    .withMessage('Estado inválido'),
  
  query('priority')
    .optional()
    .isIn(['baja', 'media', 'alta'])
    .withMessage('Prioridad inválida')
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

// Rutas de tareas
router.get('/', queryValidation, handleValidation, taskController.getTasks);
router.get('/stats', taskController.getTaskStats);
router.get('/:id', taskIdValidation, handleValidation, taskController.getTaskById);
router.post('/', createTaskValidation, handleValidation, taskController.createTask);
router.put('/:id', taskIdValidation, updateTaskValidation, handleValidation, taskController.updateTask);
router.delete('/:id', taskIdValidation, handleValidation, taskController.deleteTask);

// Rutas para notas
router.post('/:id/notes', taskIdValidation, addNoteValidation, handleValidation, taskController.addNote);

// Rutas para archivos adjuntos
router.post('/:id/attachments', taskIdValidation, handleValidation, upload.single('taskAttachment'), async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se ha subido ningún archivo'
      });
    }

    // Buscar tarea
    const Task = require('../models/Task');
    const task = await Task.findOne({ _id: id, user: req.user._id });
    
    if (!task) {
      // Eliminar archivo subido si la tarea no existe
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        message: 'Tarea no encontrada'
      });
    }

    // Agregar adjunto a la tarea
    const attachmentData = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: `uploads/attachments/${req.file.filename}`,
      size: req.file.size,
      mimetype: req.file.mimetype
    };

    await task.addAttachment(attachmentData);
    await task.populate('user', 'username email');

    // Emitir evento WebSocket
    const socketService = require('../services/socketService');
    socketService.emitToUser(req.user._id, 'task:updated', task);

    res.json({
      success: true,
      message: 'Archivo adjuntado exitosamente',
      data: task
    });

  } catch (error) {
    // Limpiar archivo en caso de error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
});

router.delete('/:id/attachments/:attachmentId', taskIdValidation, handleValidation, async (req, res, next) => {
  try {
    const { id, attachmentId } = req.params;
    
    // Buscar tarea
    const Task = require('../models/Task');
    const task = await Task.findOne({ _id: id, user: req.user._id });
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Tarea no encontrada'
      });
    }

    // Buscar adjunto
    const attachment = task.attachments.id(attachmentId);
    
    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: 'Archivo adjunto no encontrado'
      });
    }

    // Eliminar archivo físico
    const filePath = path.join(__dirname, '../../', attachment.path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remover adjunto de la tarea
    await task.removeAttachment(attachmentId);
    await task.populate('user', 'username email');

    // Emitir evento WebSocket
    const socketService = require('../services/socketService');
    socketService.emitToUser(req.user._id, 'task:updated', task);

    res.json({
      success: true,
      message: 'Archivo adjunto eliminado exitosamente',
      data: task
    });

  } catch (error) {
    next(error);
  }
});

// Ruta para descargar archivos adjuntos
router.get('/:id/attachments/:attachmentId/download', taskIdValidation, handleValidation, async (req, res, next) => {
  try {
    const { id, attachmentId } = req.params;
    
    // Buscar tarea
    const Task = require('../models/Task');
    const task = await Task.findOne({ _id: id, user: req.user._id });
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Tarea no encontrada'
      });
    }

    // Buscar adjunto
    const attachment = task.attachments.id(attachmentId);
    
    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: 'Archivo adjunto no encontrado'
      });
    }

    // Verificar que el archivo existe
    const filePath = path.join(__dirname, '../../', attachment.path);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Archivo no encontrado en el servidor'
      });
    }

    // Descargar archivo
    res.download(filePath, attachment.originalName);

  } catch (error) {
    next(error);
  }
});

module.exports = router;