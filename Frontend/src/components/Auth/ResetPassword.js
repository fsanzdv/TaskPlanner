import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import authService from '../../services/authService';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      setLoading(true);
      
      const { newPassword, confirmPassword } = formData;
      
      if (!newPassword || !confirmPassword) {
        setError('Por favor completa todos los campos');
        return;
      }
      
      if (newPassword !== confirmPassword) {
        setError('Las contraseñas no coinciden');
        return;
      }
      
      if (newPassword.length < 8) {
        setError('La contraseña debe tener al menos 8 caracteres');
        return;
      }
      
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
      if (!passwordRegex.test(newPassword)) {
        setError('La contraseña debe contener al menos una letra mayúscula, una minúscula y un número');
        return;
      }
      
      const result = await authService.resetPassword(token, newPassword);
      
      if (result.success) {
        alert('Contraseña restablecida exitosamente. Ahora puedes iniciar sesión.');
        navigate('/login');
      } else {
        setError(result.message || 'Error al restablecer la contraseña');
      }
    } catch (error) {
      console.error('Error al restablecer contraseña:', error);
      setError('Error al restablecer la contraseña. El enlace puede haber expirado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Restablecer Contraseña</h2>
        <p>Ingresa tu nueva contraseña.</p>
        
        {error && <div className="alert alert-danger">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="newPassword">Nueva contraseña</label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              className="text"
              value={formData.newPassword}
              onChange={handleChange}
              required
            />
            <small className="form-text text-muted">
              Debe tener al menos 8 caracteres, una letra mayúscula, una minúscula y un número.
            </small>
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmar contraseña</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              className="text"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <button
              type="submit"
              className="submit"
              disabled={loading}
            >
              {loading ? 'Restableciendo...' : 'Restablecer contraseña'}
            </button>
          </div>
          
          <div className="auth-links">
            <Link to="/login">Volver al inicio de sesión</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;