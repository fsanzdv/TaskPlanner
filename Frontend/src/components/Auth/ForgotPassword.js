import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import authService from '../../services/authService';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setError('');
      setMessage('');
      setLoading(true);
      
      if (!email) {
        setError('Por favor ingresa tu correo electrónico');
        return;
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError('Por favor ingresa un correo electrónico válido');
        return;
      }
      
      const result = await authService.forgotPassword(email);
      
      if (result.success) {
        setMessage('Se ha enviado un enlace de recuperación a tu correo electrónico. Revisa tu bandeja de entrada.');
        setEmail('');
      } else {
        setError(result.message || 'Error al procesar la solicitud');
      }
    } catch (error) {
      console.error('Error al solicitar recuperación:', error);
      setError('Error al procesar la solicitud. Por favor intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Recuperar Contraseña</h2>
        <p>Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.</p>
        
        {error && <div className="alert alert-danger">{error}</div>}
        {message && <div className="alert alert-success" style={{backgroundColor: '#d4edda', color: '#155724', border: '1px solid #c3e6cb'}}>{message}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Correo electrónico</label>
            <input
              type="email"
              id="email"
              name="email"
              className="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <button
              type="submit"
              className="submit"
              disabled={loading}
            >
              {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
            </button>
          </div>
          
          <div className="auth-links">
            <Link to="/login">Volver al inicio de sesión</Link>
            <span className="separator">|</span>
            <Link to="/register">Crear cuenta nueva</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;