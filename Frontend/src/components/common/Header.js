import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Header = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  return (
    <header className="app-header">
      <div className="header-container">
        <div className="logo-container">
          <Link to="/" className="logo">
            <h1>TaskPlanner</h1>
          </Link>
        </div>
        
        <nav className="main-nav">
          {user ? (
            <>
              <Link to="/" className="nav-link">Tareas</Link>
              {isAdmin() && (
                <Link to="/admin" className="nav-link admin-link">Admin</Link>
              )}
              <div className="user-menu">
                <div className="user-info">
                  {user.profilePicture ? (
                    <img 
                      src={`${process.env.REACT_APP_API_URL}/${user.profilePicture}`} 
                      alt="Profile" 
                      className="user-avatar"
                    />
                  ) : (
                    <div className="user-avatar-placeholder">
                      {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                  <span className="username">{user.username}</span>
                </div>
                <div className="dropdown-menu">
                  <Link to="/profile" className="dropdown-item">Mi Perfil</Link>
                  <button onClick={handleLogout} className="dropdown-item logout-btn">
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Iniciar Sesión</Link>
              <Link to="/register" className="nav-link">Registrarse</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;