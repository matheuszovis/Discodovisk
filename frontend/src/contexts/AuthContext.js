import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

/**
 * Context API do React para gerenciar o estado de autenticação
 * Isso permite que qualquer componente acesse os dados do usuário
 */
const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Carrega o usuário do localStorage quando a aplicação inicia
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (token && savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          connectSocket(token);
        } catch (error) {
          console.error('Erro ao carregar usuário:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    };

    loadUser();
  }, []);

  /**
   * Registra um novo usuário
   */
  const register = async (username, email, password) => {
    try {
      const response = await api.post('/auth/register', {
        username,
        email,
        password
      });

      const { token, user } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      connectSocket(token);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.error || 'Erro ao registrar'
      };
    }
  };

  /**
   * Faz login do usuário
   */
  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', {
        email,
        password
      });

      const { token, user } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      connectSocket(token);

      return { success: true, mustChangePassword: user.mustChangePassword };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.error || 'Erro ao fazer login'
      };
    }
  };

  const changePassword = async (password) => {
    try {
      const response = await api.post('/auth/change-password', { password });
      const updatedUser = response.data.user;
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.error || 'Erro ao alterar senha' };
    }
  };

  /**
   * Faz logout do usuário
   */
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      disconnectSocket();
    }
  };

  /**
   * Atualiza o perfil do usuário
   */
  const updateProfile = async (updates) => {
    try {
      const response = await api.put('/auth/profile', updates);
      const updatedUser = response.data.user;
      
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.error || 'Erro ao atualizar perfil'
      };
    }
  };

  const value = {
    user,
    loading,
    register,
    login,
    logout,
    updateProfile,
    changePassword
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
