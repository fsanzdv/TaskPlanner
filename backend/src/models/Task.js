const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  mimetype: {
    type: String,
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

const weatherDataSchema = new mongoose.Schema({
  temperature: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    required: true
  },
  humidity: {
    type: Number
  },
  windSpeed: {
    type: Number
  },
  pressure: {
    type: Number
  },
  fetchedAt: {
    type: Date,
    default: Date.now
  }
});

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'El título es requerido'],
    trim: true,
    maxlength: [200, 'El título no puede exceder 200 caracteres']
  },
  
  description: {
    type: String,
    required: [true, 'La descripción es requerida'],
    trim: true,
    maxlength: [1000, 'La descripción no puede exceder 1000 caracteres']
  },
  
  status: {
    type: String,
    enum: ['pendiente', 'en progreso', 'completada'],
    default: 'pendiente'
  },
  
  priority: {
    type: String,
    enum: ['baja', 'media', 'alta'],
    default: 'media'
  },
  
  dueDate: {
    type: Date,
    required: [true, 'La fecha de vencimiento es requerida']
  },
  
  completedAt: {
    type: Date,
    default: null
  },
  
  city: {
    type: String,
    required: [true, 'La ciudad es requerida'],
    trim: true,
    maxlength: [100, 'El nombre de la ciudad no puede exceder 100 caracteres']
  },
  
  weatherData: {
    type: weatherDataSchema,
    default: null
  },
  
  attachments: [attachmentSchema],
  
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Cada tag no puede exceder 30 caracteres']
  }],
  
  notes: [{
    content: {
      type: String,
      required: true,
      maxlength: [500, 'La nota no puede exceder 500 caracteres']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para mejorar performance
taskSchema.index({ user: 1, createdAt: -1 });
taskSchema.index({ user: 1, status: 1 });
taskSchema.index({ user: 1, dueDate: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ status: 1 });

// Virtual para verificar si la tarea está vencida
taskSchema.virtual('isOverdue').get(function() {
  return this.status !== 'completada' && this.dueDate < new Date();
});

// Virtual para obtener días restantes
taskSchema.virtual('daysRemaining').get(function() {
  if (this.status === 'completada') return null;
  
  const today = new Date();
  const dueDate = new Date(this.dueDate);
  const diffTime = dueDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
});

// Middleware para actualizar completedAt cuando el status cambia a completada
taskSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    if (this.status === 'completada' && !this.completedAt) {
      this.completedAt = new Date();
    } else if (this.status !== 'completada') {
      this.completedAt = null;
    }
  }
  next();
});

// Método estático para buscar tareas por usuario
taskSchema.statics.findByUser = function(userId, filters = {}) {
  const query = { user: userId };
  
  // Aplicar filtros
  if (filters.status) {
    query.status = filters.status;
  }
  
  if (filters.priority) {
    query.priority = filters.priority;
  }
  
  if (filters.fromDate || filters.toDate) {
    query.dueDate = {};
    if (filters.fromDate) {
      query.dueDate.$gte = new Date(filters.fromDate);
    }
    if (filters.toDate) {
      query.dueDate.$lte = new Date(filters.toDate);
    }
  }
  
  if (filters.search) {
    query.$or = [
      { title: { $regex: filters.search, $options: 'i' } },
      { description: { $regex: filters.search, $options: 'i' } }
    ];
  }
  
  return this.find(query);
};

// Método estático para estadísticas de tareas por usuario
taskSchema.statics.getStatsByUser = function(userId) {
  return this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

// Método para agregar una nota
taskSchema.methods.addNote = function(content) {
  this.notes.push({ content });
  return this.save();
};

// Método para agregar adjunto
taskSchema.methods.addAttachment = function(attachmentData) {
  this.attachments.push(attachmentData);
  return this.save();
};

// Método para remover adjunto
taskSchema.methods.removeAttachment = function(attachmentId) {
  this.attachments.id(attachmentId).remove();
  return this.save();
};

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;