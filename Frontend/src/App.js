import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ForgotPassword from './components/Auth/ForgotPassword';
import ResetPassword from './components/Auth/ResetPassword';
import TaskList from './components/Tasks/TaskList';
import Profile from './components/Profile/Profile';
import AdminDashboard from './components/Admin/Dashboard';
import NotFound from './components/common/NotFound';
import './styles.css';

// Ruta protegida que requiere autenticación
const PrivateRoute = ({ children }) => {
  const { user, loading, initialized } = useAuth();
  
  if (!initialized || loading) {
    return <div className="loading-screen">Cargando...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Ruta protegida que requiere rol de administrador
const AdminRoute = ({ children }) => {
  const { user, isAdmin, loading, initialized } = useAuth();
  
  if (!initialized || loading) {
    return <div className="loading-screen">Cargando...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (!isAdmin()) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// Ruta pública que solo es accesible si NO hay usuario autenticado
const PublicOnlyRoute = ({ children }) => {
  const { user, loading, initialized } = useAuth();
  
  if (!initialized || loading) {
    return <div className="loading-screen">Cargando...</div>;
  }
  
  if (user) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app-container">
          <Header />
          
          <main className="main-content">
            <Routes>
              {/* Rutas públicas solo para usuarios no autenticados */}
              <Route path="/login" element={
                <PublicOnlyRoute>
                  <Login />
                </PublicOnlyRoute>
              } />
              
              <Route path="/register" element={
                <PublicOnlyRoute>
                  <Register />
                </PublicOnlyRoute>
              } />
              
              <Route path="/forgot-password" element={
                <PublicOnlyRoute>
                  <ForgotPassword />
                </PublicOnlyRoute>
              } />
              
              <Route path="/reset-password/:token" element={
                <PublicOnlyRoute>
                  <ResetPassword />
                </PublicOnlyRoute>
              } />
              
              {/* Rutas protegidas para usuarios autenticados */}
              <Route path="/" element={
                <PrivateRoute>
                  <TaskList />
                </PrivateRoute>
              } />
              
              <Route path="/profile" element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              } />
              
              {/* Rutas protegidas para administradores */}
              <Route path="/admin" element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              } />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;