import api from './api';

const taskService = {
  getTasks: async (filters = {}) => {
    const params = new URLSearchParams();
    
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    if (filters.fromDate) params.append('fromDate', filters.fromDate);
    if (filters.toDate) params.append('toDate', filters.toDate);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.sort) params.append('sort', filters.sort);
    
    const response = await api.get(`/tasks?${params.toString()}`);
    return response.data;
  },
  
  getTaskById: async (taskId) => {
    const response = await api.get(`/tasks/${taskId}`);
    return response.data;
  },
  
  createTask: async (taskData) => {
    const response = await api.post('/tasks', taskData);
    return response.data;
  },
  
  updateTask: async (taskId, taskData) => {
    const response = await api.put(`/tasks/${taskId}`, taskData);
    return response.data;
  },
  
  deleteTask: async (taskId) => {
    const response = await api.delete(`/tasks/${taskId}`);
    return response.data;
  },
  
  addAttachment: async (taskId, file) => {
    const formData = new FormData();
    formData.append('taskAttachment', file);
    
    const response = await api.post(`/tasks/${taskId}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data;
  },
  
  removeAttachment: async (taskId, attachmentId) => {
    const response = await api.delete(`/tasks/${taskId}/attachments/${attachmentId}`);
    return response.data;
  }
};

export default taskService;