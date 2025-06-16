import React, { useState, useEffect } from 'react';
import taskService from '../../services/taskService';

const TaskList = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    city: '',
    priority: 'media',
    status: 'pendiente'
  });

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError('');
      
      const result = await taskService.getTasks();
      
      if (result.success) {
        setTasks(result.data || []);
      } else {
        setError(result.message || 'Error al cargar tareas');
      }
    } catch (error) {
      console.error('Error al cargar tareas:', error);
      setError('Error al cargar tareas. Por favor intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    
    try {
      setCreating(true);
      setError('');

      // Validaciones básicas
      if (!formData.title || !formData.description || !formData.dueDate || !formData.city) {
        setError('Todos los campos son requeridos');
        return;
      }

      // Validar que la fecha no sea en el pasado
      const selectedDate = new Date(formData.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        setError('La fecha de vencimiento no puede ser en el pasado');
        return;
      }

      const result = await taskService.createTask(formData);
      
      if (result.success) {
        // Limpiar formulario
        setFormData({
          title: '',
          description: '',
          dueDate: '',
          city: '',
          priority: 'media',
          status: 'pendiente'
        });
        setShowCreateForm(false);
        
        // Recargar tareas
        await loadTasks();
      } else {
        setError(result.message || 'Error al crear la tarea');
      }
    } catch (error) {
      console.error('Error al crear tarea:', error);
      setError('Error al crear la tarea. Por favor intenta nuevamente.');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      const result = await taskService.updateTask(taskId, { status: newStatus });
      
      if (result.success) {
        // Actualizar la tarea en el estado local
        setTasks(prevTasks => 
          prevTasks.map(task => 
            task._id === taskId 
              ? { ...task, status: newStatus, completedAt: newStatus === 'completada' ? new Date() : null }
              : task
          )
        );
      } else {
        setError(result.message || 'Error al actualizar la tarea');
      }
    } catch (error) {
      console.error('Error al actualizar tarea:', error);
      setError('Error al actualizar la tarea');
    }
  };

  const handleDeleteTask = async (taskId, taskTitle) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar la tarea "${taskTitle}"?`)) {
      return;
    }

    try {
      const result = await taskService.deleteTask(taskId);
      
      if (result.success) {
        // Eliminar la tarea del estado local
        setTasks(prevTasks => prevTasks.filter(task => task._id !== taskId));
      } else {
        setError(result.message || 'Error al eliminar la tarea');
      }
    } catch (error) {
      console.error('Error al eliminar tarea:', error);
      setError('Error al eliminar la tarea');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pendiente': return '#ffc107';
      case 'en progreso': return '#007bff';
      case 'completada': return '#28a745';
      default: return '#6c757d';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'alta': return '#dc3545';
      case 'media': return '#fd7e14';
      case 'baja': return '#6c757d';
      default: return '#6c757d';
    }
  };

  // Obtener fecha mínima (hoy)
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  if (loading) {
    return <div className="loading">Cargando tareas...</div>;
  }

  return (
    <div className="task-list-container">
      <div className="task-header">
        <h1>Mis Tareas</h1>
        <button 
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="submit"
          style={{ width: 'auto', padding: '10px 20px' }}
        >
          {showCreateForm ? 'Cancelar' : '+ Nueva Tarea'}
        </button>
      </div>
      
      {error && <div className="alert alert-danger">{error}</div>}

      {/* Formulario de creación */}
      {showCreateForm && (
        <div className="form" style={{ marginBottom: '30px' }}>
          <h3>Crear Nueva Tarea</h3>
          <form onSubmit={handleCreateTask}>
            <div className="centrado">
              <label htmlFor="title">Título de la tarea</label>
              <input
                type="text"
                id="title"
                name="title"
                className="text"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Ej: Comprar ingredientes para la cena"
                required
              />
            </div>

            <div className="centrado">
              <label htmlFor="description">Descripción</label>
              <textarea
                id="description"
                name="description"
                className="text"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe los detalles de tu tarea..."
                rows="3"
                required
              />
            </div>

            <div className="centrado">
              <label htmlFor="dueDate">Fecha de vencimiento</label>
              <input
                type="date"
                id="dueDate"
                name="dueDate"
                className="text"
                value={formData.dueDate}
                onChange={handleInputChange}
                min={getMinDate()}
                required
              />
            </div>

            <div className="centrado">
              <label htmlFor="city">Ciudad</label>
              <input
                type="text"
                id="city"
                name="city"
                className="text"
                value={formData.city}
                onChange={handleInputChange}
                placeholder="Ej: Madrid, Barcelona, Valencia..."
                required
              />
            </div>

            <div className="centrado">
              <label htmlFor="priority">Prioridad</label>
              <select
                id="priority"
                name="priority"
                className="text"
                value={formData.priority}
                onChange={handleInputChange}
              >
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
              </select>
            </div>

            <div className="buttons-container">
              <button
                type="submit"
                className="submit"
                disabled={creating}
              >
                {creating ? 'Creando...' : 'Crear Tarea'}
              </button>
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setShowCreateForm(false)}
                disabled={creating}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de tareas */}
      {tasks.length === 0 ? (
        <div className="task-placeholder">
          <h2>¡Bienvenido a TaskPlanner!</h2>
          <p>No tienes tareas aún. ¡Crea tu primera tarea para comenzar!</p>
          <button 
            onClick={() => setShowCreateForm(true)}
            className="submit"
            style={{ marginTop: '20px' }}
          >
            Crear Primera Tarea
          </button>
        </div>
      ) : (
        <div className="tasks-list">
          {tasks.map(task => (
            <div key={task._id} className="task-item" style={{
              border: '1px solid #ddd',
              borderRadius: '10px',
              padding: '20px',
              marginBottom: '20px',
              backgroundColor: '#fff',
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>{task.title}</h3>
                  <p style={{ margin: '0 0 10px 0', color: '#666' }}>{task.description}</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: 'white',
                    backgroundColor: getPriorityColor(task.priority)
                  }}>
                    {task.priority.toUpperCase()}
                  </span>
                  <button
                    onClick={() => handleDeleteTask(task._id, task.title)}
                    style={{
                      background: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      padding: '5px 10px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <strong>📅 Vencimiento:</strong> {formatDate(task.dueDate)}
                </div>
                <div>
                  <strong>📍 Ciudad:</strong> {task.city}
                </div>
                {task.weatherData && (
                  <div>
                    <strong>🌤️ Clima:</strong> {task.weatherData.temperature}°C, {task.weatherData.description}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <strong>Estado:</strong>
                <select
                  value={task.status}
                  onChange={(e) => handleUpdateTaskStatus(task._id, e.target.value)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '5px',
                    border: `2px solid ${getStatusColor(task.status)}`,
                    backgroundColor: 'white',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="en progreso">En Progreso</option>
                  <option value="completada">Completada</option>
                </select>
                {task.status === 'completada' && task.completedAt && (
                  <span style={{ color: '#28a745', fontSize: '14px', marginLeft: '10px' }}>
                    ✅ Completada el {formatDate(task.completedAt)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Botón para recargar */}
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <button 
          onClick={loadTasks} 
          className="submit"
          style={{ width: 'auto', padding: '10px 20px' }}
        >
          🔄 Recargar Tareas
        </button>
      </div>
    </div>
  );
};

export default TaskList;