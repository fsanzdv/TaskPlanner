import { io } from 'socket.io-client';
import authService from './authService';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.connected = false;
  }
  
  connect() {
    return new Promise((resolve, reject) => {
      if (this.connected && this.socket) {
        resolve();
        return;
      }
      
      const token = localStorage.getItem('token');
      
      if (!token) {
        reject(new Error('No hay sesión activa'));
        return;
      }
      
      this.socket = io(process.env.REACT_APP_WEBSOCKET_URL || window.location.origin, {
        auth: {
          token
        }
      });
      
      this.socket.on('connect', () => {
        console.log('WebSocket conectado');
        this.connected = true;
        resolve();
      });
      
      this.socket.on('connect_error', (error) => {
        console.error('Error de conexión WebSocket:', error.message);
        this.connected = false;
        reject(error);
      });
      
      this.socket.on('disconnect', (reason) => {
        console.log('WebSocket desconectado:', reason);
        this.connected = false;
        
        if (authService.isAuthenticated()) {
          setTimeout(() => {
            this.connect().catch(console.error);
          }, 3000);
        }
      });
      
      this.setupDefaultListeners();
    });
  }
  
  setupDefaultListeners() {
    this.socket.on('notification', (data) => {
      this.triggerListeners('notification', data);
    });
    
    this.socket.on('task:created', (data) => {
      this.triggerListeners('task:created', data);
    });
    
    this.socket.on('task:updated', (data) => {
      this.triggerListeners('task:updated', data);
    });
    
    this.socket.on('task:deleted', (data) => {
      this.triggerListeners('task:deleted', data);
    });
    
    this.socket.on('event:created', (data) => {
      this.triggerListeners('event:created', data);
    });
    
    this.socket.on('event:updated', (data) => {
      this.triggerListeners('event:updated', data);
    });
    
    this.socket.on('event:deleted', (data) => {
      this.triggerListeners('event:deleted', data);
    });
  }
  
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.listeners.clear();
    }
  }
  
  addListener(event, callback, id = null) {
    const listenerId = id || `${event}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Map());
    }
    
    this.listeners.get(event).set(listenerId, callback);
    
    return listenerId;
  }
  
  removeListener(event, id) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(id);
    }
  }
  
  triggerListeners(event, data) {
    if (this.listeners.has(event)) {
      for (const callback of this.listeners.get(event).values()) {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error en listener de ${event}:`, error);
        }
      }
    }
  }
  
  subscribeToTask(taskId) {
    if (this.connected && this.socket) {
      this.socket.emit('task:subscribe', taskId);
    }
  }
  
  unsubscribeFromTask(taskId) {
    if (this.connected && this.socket) {
      this.socket.emit('task:unsubscribe', taskId);
    }
  }
  
  subscribeToEvent(eventId) {
    if (this.connected && this.socket) {
      this.socket.emit('event:subscribe', eventId);
    }
  }
  
  unsubscribeFromEvent(eventId) {
    if (this.connected && this.socket) {
      this.socket.emit('event:unsubscribe', eventId);
    }
  }
}

const websocketService = new WebSocketService();

export default websocketService;