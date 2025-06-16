import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

const AdminDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="admin-dashboard">
      <div style={{ 
        maxWidth: '800px', 
        margin: '0 auto', 
        padding: '20px',
        textAlign: 'center' 
      }}>
        <h1>Panel de Administrador</h1>
        <p>Bienvenido, {user?.username}!</p>
        
        <div style={{
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '10px',
          padding: '30px',
          margin: '20px 0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ color: '#7E9C2C', marginBottom: '20px' }}>
            🚧 Dashboard en Desarrollo
          </h3>
          
          <div style={{ textAlign: 'left', maxWidth: '500px', margin: '0 auto' }}>
            <h4>Funcionalidades futuras:</h4>
            <ul style={{ lineHeight: '1.8' }}>
              <li>📊 Estadísticas del sistema</li>
              <li>👥 Gestión de usuarios</li>
              <li>📋 Gestión de tareas globales</li>
              <li>🔧 Configuración del sistema</li>
              <li>📝 Logs y monitoreo</li>
              <li>📧 Gestión de notificaciones</li>
            </ul>
          </div>
          
          <div style={{ 
            marginTop: '20px', 
            padding: '15px', 
            backgroundColor: '#d4edda',
            borderRadius: '5px',
            border: '1px solid #c3e6cb'
          }}>
            <strong style={{ color: '#155724' }}>
              ✅ Sistema funcionando correctamente
            </strong>
            <br />
            <small>El backend está conectado y las funcionalidades básicas están operativas.</small>
          </div>
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px',
          marginTop: '30px'
        }}>
          <div style={{
            padding: '20px',
            backgroundColor: '#fff',
            borderRadius: '8px',
            border: '1px solid #e9ecef',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h4 style={{ color: '#7E9C2C' }}>Estado del Sistema</h4>
            <p style={{ color: '#28a745', fontWeight: 'bold' }}>🟢 Online</p>
          </div>
          
          <div style={{
            padding: '20px',
            backgroundColor: '#fff',
            borderRadius: '8px',
            border: '1px solid #e9ecef',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h4 style={{ color: '#7E9C2C' }}>Tu Rol</h4>
            <p style={{ fontWeight: 'bold' }}>👑 Administrador</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;