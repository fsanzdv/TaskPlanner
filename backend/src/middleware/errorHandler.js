const logger = require('../config/logger');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log del error
  logger.error(`Error ${err.name}: ${err.message}`, {
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Error de validación de Mongoose
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: message
    });
  }

  // Error de duplicado de Mongoose
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field} ya existe`;
    return res.status(400).json({
      success: false,
      message: 'Recurso duplicado',
      errors: message
    });
  }

  // Error de CastError de Mongoose (ID inválido)
  if (err.name === 'CastError') {
    const message = 'ID de recurso inválido';
    return res.status(400).json({
      success: false,
      message,
      errors: message
    });
  }

  // Error de JWT
  if (err.name === 'JsonWebTokenError') {
    const message = 'Token de acceso inválido';
    return res.status(401).json({
      success: false,
      message,
      errors: message
    });
  }

  // Error de JWT expirado
  if (err.name === 'TokenExpiredError') {
    const message = 'Token de acceso expirado';
    return res.status(401).json({
      success: false,
      message,
      errors: message
    });
  }

  // Error de Multer (subida de archivos)
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = 'El archivo es demasiado grande';
    return res.status(400).json({
      success: false,
      message,
      errors: message
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    const message = 'Tipo de archivo no permitido';
    return res.status(400).json({
      success: false,
      message,
      errors: message
    });
  }

  // Error de sintaxis JSON
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'JSON malformado',
      errors: 'Datos JSON inválidos'
    });
  }

  // Error de conexión a base de datos
  if (err.name === 'MongoNetworkError' || err.name === 'MongooseServerSelectionError') {
    return res.status(500).json({
      success: false,
      message: 'Error de conexión a la base de datos',
      errors: 'Servicio temporalmente no disponible'
    });
  }

  // Error personalizado con status code
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message || 'Error del servidor',
      errors: err.message
    });
  }

  // Error por defecto
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    errors: process.env.NODE_ENV === 'development' ? err.message : 'Error interno del servidor'
  });
};

// Middleware para manejar rutas no encontradas
const notFound = (req, res, next) => {
  const error = new Error(`Ruta no encontrada - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

// Clase para errores personalizados
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  errorHandler,
  notFound,
  AppError
};