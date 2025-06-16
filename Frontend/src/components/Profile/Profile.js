import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setError('');
      setSuccess('');
      setLoading(true);

      const result = await updateProfile(formData);
      
      if (result.success) {
        setSuccess('Perfil actualizado correctamente');
      } else {
        setError(result.message || 'Error al actualizar perfil');
      }
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      setError('Error al actualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div>Cargando perfil...</div>;
  }

  return (
    <div className="profile-container">
      <h1>Mi Perfil</h1>
      
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success" style={{backgroundColor: '#d4edda', color: '#155724', border: '1px solid #c3e6cb'}}>{success}</div>}
      
      <div className="profile-info">
        <div className="current-profile">
          <h3>Información del Usuario</h3>
          <div className="profile-display">
            {user.profilePicture ? (
              <img 
                src={`${process.env.REACT_APP_API_URL}/${user.profilePicture}`} 
                alt="Foto de perfil" 
                className="profile-image-large"
              />
            ) : (
              <div className="profile-placeholder-large">
                {user.username?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <div className="profile-details">
              <p><strong>Usuario:</strong> {user.username}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Rol:</strong> {user.role}</p>
            </div>
          </div>
        </div>
      </div>

      <form className="form" onSubmit={handleSubmit}>
        <h3>Actualizar Información</h3>
        
        <div className="centrado">
          <label htmlFor="username">Nombre de usuario</label>
          <input
            type="text"
            id="username"
            name="username"
            className="text"
            value={formData.username}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="centrado">
          <label htmlFor="email">Correo electrónico</label>
          <input
            type="email"
            id="email"
            name="email"
            className="text"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        
        <button
          type="submit"
          className="submit"
          disabled={loading}
        >
          {loading ? 'Actualizando...' : 'Actualizar Perfil'}
        </button>
      </form>
    </div>
  );
};

export default Profile;