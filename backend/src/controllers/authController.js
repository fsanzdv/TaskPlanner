const User = require('../models/User');
const { generateToken, generateResetToken, verifyResetToken } = require('../middleware/auth');
const emailService = require('../services/emailService');
const logger = require('../config/logger');
const { AppError } = require('../middleware/errorHandler');

// Registrar nuevo usuario
const register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    // Validar campos requeridos
    if (!username || !email || !password) {
      return next(new AppError('Todos los campos son requeridos', 400));
    }

    // Validar formato de email
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return next(new AppError('Formato de email inválido', 400));
    }

    // Validar contraseña
    if (password.length < 8) {
      return next(new AppError('La contraseña debe tener al menos 8 caracteres', 400));
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      return next(new AppError('La contraseña debe contener al menos una mayúscula, una minúscula y un número', 400));
    }

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      const field = existingUser.email === email ? 'email' : 'username';
      return next(new AppError(`El ${field} ya está registrado`, 400));
    }

    // Crear nuevo usuario
    const user = new User({
      username,
      email,
      password
    });

    await user.save();

    // Generar token
    const token = generateToken(user._id);

    // Actualizar último login
    await user.updateLastLogin();

    // Enviar email de bienvenida (opcional)
    try {
      await emailService.sendWelcomeEmail(user.email, user.username);
    } catch (emailError) {
      logger.warn('Error al enviar email de bienvenida:', emailError);
    }

    logger.info(`Nuevo usuario registrado: ${user.email}`);

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: {
        user: user.toAuthJSON(),
        token
      }
    });

  } catch (error) {
    next(error);
  }
};

// Iniciar sesión
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validar campos requeridos
    if (!email || !password) {
      return next(new AppError('Email y contraseña son requeridos', 400));
    }

    // Buscar usuario e incluir contraseña
    const user = await User.findByEmail(email).select('+password');

    if (!user) {
      return next(new AppError('Credenciales inválidas', 401));
    }

    // Verificar si la cuenta está activa
    if (!user.isActive) {
      return next(new AppError('Cuenta desactivada', 401));
    }

    // Verificar contraseña
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return next(new AppError('Credenciales inválidas', 401));
    }

    // Generar token
    const token = generateToken(user._id);

    // Actualizar último login
    await user.updateLastLogin();

    logger.info(`Usuario inició sesión: ${user.email}`);

    res.json({
      success: true,
      message: 'Sesión iniciada exitosamente',
      data: {
        user: user.toAuthJSON(),
        token
      }
    });

  } catch (error) {
    next(error);
  }
};

// Obtener perfil del usuario actual
const getProfile = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: req.user.toAuthJSON()
    });
  } catch (error) {
    next(error);
  }
};

// Actualizar perfil del usuario
const updateProfile = async (req, res, next) => {
  try {
    const { username, email } = req.body;
    const userId = req.user._id;

    // Validar campos
    if (!username && !email) {
      return next(new AppError('Al menos un campo debe ser actualizado', 400));
    }

    const updateData = {};

    if (username) {
      if (username.length < 3) {
        return next(new AppError('El nombre de usuario debe tener al menos 3 caracteres', 400));
      }
      updateData.username = username;
    }

    if (email) {
      const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(email)) {
        return next(new AppError('Formato de email inválido', 400));
      }
      updateData.email = email;
    }

    // Verificar si el nuevo username o email ya existen
    if (username || email) {
      const existingUser = await User.findOne({
        _id: { $ne: userId },
        $or: [
          ...(username ? [{ username }] : []),
          ...(email ? [{ email }] : [])
        ]
      });

      if (existingUser) {
        const field = existingUser.email === email ? 'email' : 'username';
        return next(new AppError(`El ${field} ya está en uso`, 400));
      }
    }

    // Actualizar usuario
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );

    logger.info(`Perfil actualizado: ${updatedUser.email}`);

    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      data: updatedUser.toAuthJSON()
    });

  } catch (error) {
    next(error);
  }
};

// Cambiar contraseña
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    // Validar campos requeridos
    if (!currentPassword || !newPassword) {
      return next(new AppError('Contraseña actual y nueva son requeridas', 400));
    }

    // Buscar usuario con contraseña
    const user = await User.findById(userId).select('+password');

    // Verificar contraseña actual
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);

    if (!isCurrentPasswordValid) {
      return next(new AppError('Contraseña actual incorrecta', 400));
    }

    // Validar nueva contraseña
    if (newPassword.length < 8) {
      return next(new AppError('La nueva contraseña debe tener al menos 8 caracteres', 400));
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return next(new AppError('La nueva contraseña debe contener al menos una mayúscula, una minúscula y un número', 400));
    }

    // Actualizar contraseña
    user.password = newPassword;
    await user.save();

    logger.info(`Contraseña cambiada: ${user.email}`);

    res.json({
      success: true,
      message: 'Contraseña cambiada exitosamente'
    });

  } catch (error) {
    next(error);
  }
};

// Solicitar reset de contraseña
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return next(new AppError('Email es requerido', 400));
    }

    const user = await User.findByEmail(email);

    if (!user) {
      // Por seguridad, siempre respondemos lo mismo
      return res.json({
        success: true,
        message: 'Si el email existe, se ha enviado un enlace de recuperación'
      });
    }

    // Generar token de reset
    const resetToken = generateResetToken();

    // Guardar token en la base de datos
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
    await user.save();

    // Enviar email de reset
    try {
      await emailService.sendPasswordResetEmail(user.email, user.username, resetToken);
      logger.info(`Email de reset enviado a: ${user.email}`);
    } catch (emailError) {
      logger.error('Error al enviar email de reset:', emailError);
      user.passwordResetToken = null;
      user.passwordResetExpires = null;
      await user.save();
      return next(new AppError('Error al enviar email de recuperación', 500));
    }

    res.json({
      success: true,
      message: 'Se ha enviado un enlace de recuperación a tu email'
    });

  } catch (error) {
    next(error);
  }
};

// Reset de contraseña
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return next(new AppError('Token y nueva contraseña son requeridos', 400));
    }

    // Verificar token
    try {
      verifyResetToken(token);
    } catch (tokenError) {
      return next(new AppError('Token inválido o expirado', 400));
    }

    // Buscar usuario con el token
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() }
    });

    if (!user) {
      return next(new AppError('Token inválido o expirado', 400));
    }

    // Validar nueva contraseña
    if (newPassword.length < 8) {
      return next(new AppError('La contraseña debe tener al menos 8 caracteres', 400));
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return next(new AppError('La contraseña debe contener al menos una mayúscula, una minúscula y un número', 400));
    }

    // Actualizar contraseña y limpiar tokens
    user.password = newPassword;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    logger.info(`Contraseña restablecida: ${user.email}`);

    res.json({
      success: true,
      message: 'Contraseña restablecida exitosamente'
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword
};
