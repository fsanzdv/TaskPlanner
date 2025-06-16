const express = require('express');
const { body } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const authController = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

const router = express.Router();

// Configurar multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/profiles');
    
    // Crear directorio si no existe
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `profile-${uniqueSuffix}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, gif)'));
    }
  }
});

// Validaciones
const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('El nombre de usuario debe tener entre 3 y 50 caracteres')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('El nombre de usuario solo puede contener letras, números, guiones y guiones bajos'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Formato de email inválido'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('La contraseña debe tener al menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La contraseña debe contener al menos una mayúscula, una minúscula y un número')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Formato de email inválido'),
  
  body('password')
    .notEmpty()
    .withMessage('La contraseña es requerida')
];

const updateProfileValidation = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('El nombre de usuario debe tener entre 3 y 50 caracteres')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('El nombre de usuario solo puede contener letras, números, guiones y guiones bajos'),
  
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Formato de email inválido')
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('La contraseña actual es requerida'),
  
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('La nueva contraseña debe tener al menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La nueva contraseña debe contener al menos una mayúscula, una minúscula y un número')
];

const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Formato de email inválido')
];

const resetPasswordValidation = [
  body('token')
    .notEmpty()
    .withMessage('Token es requerido'),
  
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('La contraseña debe tener al menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La contraseña debe contener al menos una mayúscula, una minúscula y un número')
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

// Rutas públicas
router.post('/register', registerValidation, handleValidation, authController.register);
router.post('/login', loginValidation, handleValidation, authController.login);
router.post('/forgot-password', forgotPasswordValidation, handleValidation, authController.forgotPassword);
router.post('/reset-password', resetPasswordValidation, handleValidation, authController.resetPassword);

// Rutas protegidas (requieren autenticación)
router.use(auth); // Aplicar middleware de autenticación a todas las rutas siguientes

router.get('/profile', authController.getProfile);
router.put('/profile', updateProfileValidation, handleValidation, authController.updateProfile);
router.post('/change-password', changePasswordValidation, handleValidation, authController.changePassword);

// Ruta para subir foto de perfil
router.post('/profile-picture', upload.single('profilePicture'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se ha subido ningún archivo'
      });
    }

    // Actualizar usuario con la nueva foto
    const User = require('../models/User');
    const relativePath = `uploads/profiles/${req.file.filename}`;
    
    await User.findByIdAndUpdate(req.user._id, {
      profilePicture: relativePath
    });

    res.json({
      success: true,
      message: 'Foto de perfil actualizada exitosamente',
      data: {
        profilePicture: relativePath
      }
    });

  } catch (error) {
    next(error);
  }
});

// Ruta para eliminar foto de perfil
router.delete('/profile-picture', async (req, res, next) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.user._id);
    
    if (user.profilePicture) {
      // Eliminar archivo físico
      const filePath = path.join(__dirname, '../../', user.profilePicture);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      // Actualizar base de datos
      user.profilePicture = null;
      await user.save();
    }

    res.json({
      success: true,
      message: 'Foto de perfil eliminada exitosamente'
    });

  } catch (error) {
    next(error);
  }
});

// Ruta para verificar token (útil para el frontend)
router.get('/verify-token', (req, res) => {
  res.json({
    success: true,
    message: 'Token válido',
    data: req.user.toAuthJSON()
  });
});

// Ruta para cerrar sesión (opcional, principalmente para limpiar logs)
router.post('/logout', (req, res) => {
  const logger = require('../config/logger');
  logger.info(`Usuario cerró sesión: ${req.user.email}`);
  
  res.json({
    success: true,
    message: 'Sesión cerrada exitosamente'
  });
});

module.exports = router;