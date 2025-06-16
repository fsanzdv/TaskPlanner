import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setError('');
      setLoading(true);
      
      const { username, email, password, confirmPassword } = formData;
      
      if (!username || !email || !password || !confirmPassword) {
        setError('Por favor completa todos los campos');
        return;
      }
      
      if (password !== confirmPassword) {
        setError('Las contraseñas no coinciden');
        return;
      }
      
      if (password.length < 8) {
        setError('La contraseña debe tener al menos 8 caracteres');
        return;
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
      
      if (!emailRegex.test(email)) {
        setError('Por favor ingresa un correo electrónico válido');
        return;
      }
      
      if (!passwordRegex.test(password)) {
        setError('La contraseña debe contener al menos una letra mayúscula, una minúscula y un número');
        return;
      }
      
      const result = await register({
        username,
        email,
        password
      });
      
      if (!result.success) {
        setError(result.message);
        return;
      }
      
      navigate('/');
    } catch (error) {
      console.error('Error al registrarse:', error);
      setError('Error al registrarse. Por favor intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <h2>Crear cuenta</h2>
        
        {error && <div className="alert alert-danger">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
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
          
          <div className="form-group">
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
          
          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              name="password"
              className="text"
              value={formData.password}
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
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </div>
          
          <div className="auth-links">
            <span>¿Ya tienes una cuenta?</span>
            <Link to="/login">Iniciar sesión</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Register;