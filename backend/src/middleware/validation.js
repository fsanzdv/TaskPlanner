const { validationResult } = require('express-validator');
const logger = require('../config/logger');

// Middleware principal de validación
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    // Log de errores de validación
    logger.warn('Errores de validación:', {
      url: req.url,
      method: req.method,
      errors: errors.array(),
      ip: req.ip
    });

    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors: errors.array().map(error => ({
        field: error.param,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

// Middleware para sanitizar datos de entrada
const sanitize = (req, res, next) => {
  // Remover campos peligrosos de req.body
  const dangerousFields = ['__proto__', 'constructor', 'prototype'];
  
  const sanitizeObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(item => sanitizeObject(item));
    }
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (!dangerousFields.includes(key)) {
        sanitized[key] = sanitizeObject(value);
      }
    }
    return sanitized;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  next();
};

// Middleware para limitar tamaño de request
const limitRequestSize = (limit = '10mb') => {
  return (req, res, next) => {
    if (req.headers['content-length']) {
      const contentLength = parseInt(req.headers['content-length']);
      const maxSize = parseSize(limit);
      
      if (contentLength > maxSize) {
        return res.status(413).json({
          success: false,
          message: 'Request demasiado grande',
          maxSize: limit
        });
      }
    }
    next();
  };
};

// Utilidad para parsear tamaños
const parseSize = (size) => {
  const units = {
    'b': 1,
    'kb': 1024,
    'mb': 1024 * 1024,
    'gb': 1024 * 1024 * 1024
  };
  
  const match = size.toString().toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([kmg]?b)$/);
  if (!match) return 0;
  
  const [, num, unit] = match;
  return parseFloat(num) * (units[unit] || 1);
};

// Middleware para validar tipos de contenido
const validateContentType = (allowedTypes = ['application/json']) => {
  return (req, res, next) => {
    if (req.method === 'GET' || req.method === 'DELETE') {
      return next();
    }
    
    const contentType = req.headers['content-type'];
    if (!contentType) {
      return res.status(400).json({
        success: false,
        message: 'Content-Type header requerido'
      });
    }
    
    const isAllowed = allowedTypes.some(type => 
      contentType.toLowerCase().includes(type.toLowerCase())
    );
    
    if (!isAllowed) {
      return res.status(415).json({
        success: false,
        message: 'Tipo de contenido no soportado',
        allowedTypes
      });
    }
    
    next();
  };
};

module.exports = {
  validate,
  sanitize,
  limitRequestSize,
  validateContentType
};