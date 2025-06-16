const Task = require('../models/Task');
const weatherService = require('../services/weatherService');
const socketService = require('../services/socketService');
const logger = require('../config/logger');
const { AppError } = require('../middleware/errorHandler');

// Obtener todas las tareas del usuario
const getTasks = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const {
      status,
      priority,
      search,
      fromDate,
      toDate,
      page = 1,
      limit = 10,
      sort = 'createdAt:desc'
    } = req.query;

    // Construir filtros
    const filters = {
      status,
      priority,
      search,
      fromDate,
      toDate
    };

    // Construir query
    let query = Task.findByUser(userId, filters);

    // Aplicar ordenamiento
    const [sortField, sortOrder] = sort.split(':');
    const sortObj = {};
    sortObj[sortField] = sortOrder === 'desc' ? -1 : 1;
    query = query.sort(sortObj);

    // Aplicar paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);
    query = query.skip(skip).limit(parseInt(limit));

    // Ejecutar query y contar total
    const [tasks, total] = await Promise.all([
      query.populate('user', 'username email'),
      Task.countDocuments({ user: userId })
    ]);

    // Calcular paginación
    const pages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: tasks,
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
};

// Obtener una tarea por ID
const getTaskById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const task = await Task.findOne({ _id: id, user: userId })
      .populate('user', 'username email');

    if (!task) {
      return next(new AppError('Tarea no encontrada', 404));
    }

    res.json({
      success: true,
      data: task
    });

  } catch (error) {
    next(error);
  }
};

// Crear nueva tarea
const createTask = async (req, res, next) => {
  try {
    const { title, description, dueDate, status, priority, city, tags } = req.body;
    const userId = req.user._id;

    // Validar campos requeridos
    if (!title || !description || !dueDate || !city) {
      return next(new AppError('Título, descripción, fecha de vencimiento y ciudad son requeridos', 400));
    }

    // Validar fecha de vencimiento
    const dueDateObj = new Date(dueDate);
    if (dueDateObj < new Date()) {
      return next(new AppError('La fecha de vencimiento no puede ser en el pasado', 400));
    }

    // Crear tarea
    const taskData = {
      title,
      description,
      dueDate: dueDateObj,
      city,
      user: userId,
      status: status || 'pendiente',
      priority: priority || 'media'
    };

    if (tags && Array.isArray(tags)) {
      taskData.tags = tags;
    }

    const task = new Task(taskData);

    // Obtener datos del clima
    try {
      const weatherData = await weatherService.getWeatherByCity(city, dueDateObj);
      if (weatherData) {
        task.weatherData = weatherData;
      }
    } catch (weatherError) {
      logger.warn(`Error al obtener clima para ${city}:`, weatherError);
    }

    await task.save();
    await task.populate('user', 'username email');

    logger.info(`Nueva tarea creada: ${task.title} por ${req.user.email}`);

    // Emitir evento WebSocket
    socketService.emitToUser(userId, 'task:created', task);

    res.status(201).json({
      success: true,
      message: 'Tarea creada exitosamente',
      data: task
    });

  } catch (error) {
    next(error);
  }
};

// Actualizar tarea
const updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const updateData = req.body;

    // Buscar tarea
    const task = await Task.findOne({ _id: id, user: userId });

    if (!task) {
      return next(new AppError('Tarea no encontrada', 404));
    }

    // Validar campos si están presentes
    if (updateData.dueDate) {
      const dueDateObj = new Date(updateData.dueDate);
      if (dueDateObj < new Date() && updateData.status !== 'completada') {
        return next(new AppError('La fecha de vencimiento no puede ser en el pasado', 400));
      }
      updateData.dueDate = dueDateObj;
    }

    // Si se actualiza la ciudad, obtener nuevo clima
    if (updateData.city && updateData.city !== task.city) {
      try {
        const weatherData = await weatherService.getWeatherByCity(
          updateData.city, 
          updateData.dueDate || task.dueDate
        );
        if (weatherData) {
          updateData.weatherData = weatherData;
        }
      } catch (weatherError) {
        logger.warn(`Error al obtener clima para ${updateData.city}:`, weatherError);
      }
    }

    // Actualizar tarea
    Object.assign(task, updateData);
    await task.save();
    await task.populate('user', 'username email');

    logger.info(`Tarea actualizada: ${task.title} por ${req.user.email}`);

    // Emitir evento WebSocket
    socketService.emitToUser(userId, 'task:updated', task);

    res.json({
      success: true,
      message: 'Tarea actualizada exitosamente',
      data: task
    });

  } catch (error) {
    next(error);
  }
};

// Eliminar tarea
const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const task = await Task.findOne({ _id: id, user: userId });

    if (!task) {
      return next(new AppError('Tarea no encontrada', 404));
    }

    await Task.findByIdAndDelete(id);

    logger.info(`Tarea eliminada: ${task.title} por ${req.user.email}`);

    // Emitir evento WebSocket
    socketService.emitToUser(userId, 'task:deleted', { taskId: id });

    res.json({
      success: true,
      message: 'Tarea eliminada exitosamente'
    });

  } catch (error) {
    next(error);
  }
};

// Agregar nota a tarea
const addNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    if (!content) {
      return next(new AppError('El contenido de la nota es requerido', 400));
    }

    const task = await Task.findOne({ _id: id, user: userId });

    if (!task) {
      return next(new AppError('Tarea no encontrada', 404));
    }

    await task.addNote(content);
    await task.populate('user', 'username email');

    logger.info(`Nota agregada a tarea: ${task.title} por ${req.user.email}`);

    // Emitir evento WebSocket
    socketService.emitToUser(userId, 'task:updated', task);

    res.json({
      success: true,
      message: 'Nota agregada exitosamente',
      data: task
    });

  } catch (error) {
    next(error);
  }
};

// Obtener estadísticas de tareas del usuario
const getTaskStats = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const stats = await Task.getStatsByUser(userId);
    
    // Contar tareas vencidas
    const overdueTasks = await Task.countDocuments({
      user: userId,
      status: { $ne: 'completada' },
      dueDate: { $lt: new Date() }
    });

    // Contar tareas próximas a vencer (próximos 7 días)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const upcomingTasks = await Task.countDocuments({
      user: userId,
      status: { $ne: 'completada' },
      dueDate: { $gte: new Date(), $lte: nextWeek }
    });

    res.json({
      success: true,
      data: {
        byStatus: stats,
        overdue: overdueTasks,
        upcoming: upcomingTasks
      }
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  addNote,
  getTaskStats
};