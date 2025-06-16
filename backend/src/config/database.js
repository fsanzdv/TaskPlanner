const mongoose = require('mongoose');
const logger = require('./logger');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/taskplanner';
    
    // Opciones simplificadas y actualizadas para Mongoose moderno
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10, // Mantiene hasta 10 conexiones
      serverSelectionTimeoutMS: 5000, // Tiempo de espera para seleccionar servidor
      socketTimeoutMS: 45000, // Tiempo de espera para operaciones de socket
      // Removidas las opciones obsoletas: bufferCommands y bufferMaxEntries
    };

    // Conectar a MongoDB
    const conn = await mongoose.connect(mongoURI, options);
    
    logger.info(`MongoDB conectado: ${conn.connection.host}`);
    
    // Manejar eventos de conexión
    mongoose.connection.on('connected', () => {
      logger.info('Mongoose conectado a MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('Error de conexión MongoDB:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('Mongoose desconectado de MongoDB');
    });

    // Cerrar conexión cuando el proceso termine
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('Conexión MongoDB cerrada debido a terminación de la aplicación');
      process.exit(0);
    });

    return conn;
    
  } catch (error) {
    logger.error('Error al conectar con MongoDB:', error.message);
    throw error;
  }
};

module.exports = connectDB;