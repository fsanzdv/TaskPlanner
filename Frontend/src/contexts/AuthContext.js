import React, { createContext, useState, useEffect, useContext } from 'react';
import authService from '../services/authService';
import websocketService from '../services/websocketService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedUser = authService.getCurrentUser();
        if (storedUser) {
          setUser(storedUser);
          await websocketService.connect().catch(console.error);
        }
      } catch (error) {
        console.error('Error al inicializar la autenticación:', error);
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      setLoading(true);
      const result = await authService.login(email, password);
      setUser(result.data.user);
      
      await websocketService.connect().catch(console.error);
      
      return { success: true };
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Error al iniciar sesión'
      };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      const result = await authService.register(userData);
      setUser(result.data.user);
      
      await websocketService.connect().catch(console.error);
      
      return { success: true };
    } catch (error) {
      console.error('Error al registrarse:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Error al registrarse'
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    websocketService.disconnect();
    authService.logout();
    setUser(null);
  };

  const updateProfile = async (profileData) => {
    try {
      setLoading(true);
      const result = await authService.updateProfile(profileData);
      setUser(result.data);
      return { success: true };
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Error al actualizar perfil'
      };
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = () => {
    return user && user.role === 'admin';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        initialized,
        login,
        register,
        logout,
        updateProfile,
        isAdmin
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

export default AuthContext;