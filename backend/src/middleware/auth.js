const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../config/logger');

// Middleware para verificar autenticación
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acceso requerido'
      });
    }

    // Extraer token del header "Bearer TOKEN"
    const tokenValue = token.startsWith('Bearer ') 
      ? token.slice(7, token.length) 
      : token;

    if (!tokenValue) {
      return res.status(401).json({
        success: false,
        message: 'Token de acceso inválido'
      });
    }

    // Verificar token
    const decoded = jwt.verify(tokenValue, process.env.JWT_SECRET);
    
    // Buscar usuario
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Cuenta desactivada'
      });
    }

    // Agregar usuario a la request
    req.user = user;
    next();
    
  } catch (error) {
    logger.error('Error en middleware de autenticación:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Middleware para verificar rol de administrador
const adminAuth = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Autenticación requerida'
      });
    }

    if (!req.user.isAdmin()) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Se requieren permisos de administrador'
      });
    }

    next();
  } catch (error) {
    logger.error('Error en middleware de administrador:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Middleware opcional de autenticación (no falla si no hay token)
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization');
    
    if (!token) {
      return next();
    }

    const tokenValue = token.startsWith('Bearer ') 
      ? token.slice(7, token.length) 
      : token;

    if (!tokenValue) {
      return next();
    }

    const decoded = jwt.verify(tokenValue, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (user && user.isActive) {
      req.user = user;
    }
    
    next();
    
  } catch (error) {
    // En autenticación opcional, continuamos aunque haya error
    next();
  }
};

// Utilidad para generar JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRE || '7d',
      issuer: 'taskplanner-api'
    }
  );
};

// Utilidad para generar token de reset de contraseña
const generateResetToken = () => {
  return jwt.sign(
    { type: 'password-reset', timestamp: Date.now() },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

// Verificar token de reset de contraseña
const verifyResetToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'password-reset') {
      throw new Error('Tipo de token inválido');
    }
    return decoded;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  auth,
  adminAuth,
  optionalAuth,
  generateToken,
  generateResetToken,
  verifyResetToken
};