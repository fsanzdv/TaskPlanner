const mongoose = require('mongoose');
const logger = require('./logger');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/taskplanner';
    
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
      bufferMaxEntries: 0
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