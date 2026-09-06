import axios from 'axios';

/**
 * Configuração do Axios para fazer requisições HTTP
 * Axios é uma biblioteca que facilita fazer requisições para o backend
 */
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://discodovisk-backend.onrender.com/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Interceptor para adicionar o token JWT em todas as requisições
 * Isso mantém o usuário autenticado
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Interceptor para tratar erros de autenticação
 * Se o token expirar, redireciona para o login
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
