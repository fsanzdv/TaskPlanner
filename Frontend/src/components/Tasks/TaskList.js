import React, { useState, useEffect } from 'react';
import taskService from '../../services/taskService';

const TaskList = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  if (loading) {
    return <div className="loading">Cargando tareas...</div>;
  }

  if (error) {
    return (
      <div className="task-list-container">
        <div className="alert alert-danger">{error}</div>
        <button onClick={loadTasks} className="submit">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="task-list-container">
      <h1>Mis Tareas</h1>
      
      {tasks.length === 0 ? (
        <div className="task-placeholder">
          <h2>¡Bienvenido a TaskPlanner!</h2>
          <p>No tienes tareas aún. ¡Crea tu primera tarea para comenzar!</p>
          <p>Tu backend está conectado correctamente.</p>
        </div>
      ) : (
        <div className="tasks-list">
          {tasks.map(task => (
            <div key={task._id} className="task-item">
              <h3>{task.title}</h3>
              <p>{task.description}</p>
              <p><strong>Estado:</strong> {task.status}</p>
              <p><strong>Ciudad:</strong> {task.city}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskList;