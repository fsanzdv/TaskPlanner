const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../config/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.templates = {};
  }

 
  async initialize() {
    try {
      // Configurar transporter
     this.transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

      // Verificar conexión
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        await this.transporter.verify();
        logger.info('Servicio de email configurado correctamente');
      } else {
        logger.warn('Credenciales de email no configuradas - los emails no se enviarán');
      }

      // Cargar plantillas
      await this.loadTemplates();

    } catch (error) {
      logger.error('Error al inicializar servicio de email:', error);
      throw error;
    }
  }

  // Cargar plantillas de email
  async loadTemplates() {
    try {
      // Plantilla de bienvenida
      this.templates.welcome = handlebars.compile(`
        <h2>¡Bienvenido a TaskPlanner!</h2>
        <p>Hola {{username}},</p>
        <p>Gracias por registrarte en TaskPlanner. Estamos emocionados de tenerte como parte de nuestra comunidad.</p>
        <p>Con TaskPlanner puedes:</p>
        <ul>
          <li>Organizar tus tareas diarias</li>
          <li>Ver el clima para tus actividades</li>
          <li>Colaborar con tu equipo</li>
          <li>Mantener todo sincronizado</li>
        </ul>
        <p>¡Empieza a crear tus primeras tareas!</p>
        <p>Saludos,<br>El equipo de TaskPlanner</p>
      `);

      // Plantilla de reset de contraseña
      this.templates.passwordReset = handlebars.compile(`
        <h2>Restablecer Contraseña</h2>
        <p>Hola {{username}},</p>
        <p>Has solicitado restablecer tu contraseña en TaskPlanner.</p>
        <p>Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
        <p><a href="{{resetUrl}}" style="background-color: #7E9C2C; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Restablecer Contraseña</a></p>
        <p>Este enlace expirará en 1 hora por seguridad.</p>
        <p>Si no solicitaste este cambio, puedes ignorar este email.</p>
        <p>Saludos,<br>El equipo de TaskPlanner</p>
      `);

      // Plantilla de notificación de tarea
      this.templates.taskNotification = handlebars.compile(`
        <h2>Recordatorio de Tarea</h2>
        <p>Hola {{username}},</p>
        <p>Te recordamos que tienes una tarea próxima a vencer:</p>
        <div style="border: 1px solid #ddd; padding: 15px; margin: 15px 0; border-radius: 5px;">
          <h3>{{taskTitle}}</h3>
          <p><strong>Descripción:</strong> {{taskDescription}}</p>
          <p><strong>Fecha de vencimiento:</strong> {{dueDate}}</p>
          <p><strong>Estado:</strong> {{status}}</p>
        </div>
        <p>¡No olvides completarla a tiempo!</p>
        <p>Saludos,<br>El equipo de TaskPlanner</p>
      `);

      logger.info('Plantillas de correo cargadas y compiladas correctamente');

    } catch (error) {
      logger.error('Error al cargar plantillas de email:', error);
      throw error;
    }
  }

  // Método genérico para enviar emails
  async sendEmail(to, subject, html, text = null) {
    try {
      if (!this.transporter || !process.env.EMAIL_USER) {
        logger.warn('Servicio de email no configurado - email no enviado');
        return false;
      }

      const mailOptions = {
        from: `"TaskPlanner" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, '') // Generar texto plano si no se proporciona
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Email enviado a ${to}: ${subject}`);
      return result;

    } catch (error) {
      logger.error(`Error al enviar email a ${to}:`, error);
      throw error;
    }
  }

  // Enviar email de bienvenida
  async sendWelcomeEmail(email, username) {
    try {
      const html = this.templates.welcome({ username });
      await this.sendEmail(email, '¡Bienvenido a TaskPlanner!', html);
    } catch (error) {
      logger.error('Error al enviar email de bienvenida:', error);
      throw error;
    }
  }

  // Enviar email de reset de contraseña
  async sendPasswordResetEmail(email, username, resetToken) {
    try {
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
      const html = this.templates.passwordReset({ username, resetUrl });
      await this.sendEmail(email, 'Restablecer Contraseña - TaskPlanner', html);
    } catch (error) {
      logger.error('Error al enviar email de reset:', error);
      throw error;
    }
  }

  // Enviar notificación de tarea
  async sendTaskNotification(email, username, taskData) {
    try {
      const html = this.templates.taskNotification({
        username,
        taskTitle: taskData.title,
        taskDescription: taskData.description,
        dueDate: taskData.dueDate.toLocaleDateString('es-ES'),
        status: taskData.status
      });
      await this.sendEmail(email, `Recordatorio: ${taskData.title}`, html);
    } catch (error) {
      logger.error('Error al enviar notificación de tarea:', error);
      throw error;
    }
  }

  // Verificar si el servicio está disponible
  isAvailable() {
    return !!(this.transporter && process.env.EMAIL_USER && process.env.EMAIL_PASS);
  }
}

// Crear instancia única
const emailService = new EmailService();

module.exports = emailService;