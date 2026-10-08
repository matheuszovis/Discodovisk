import axios from 'axios';

/**
 * Configuração do Axios para fazer requisições HTTP
 * Axios é uma biblioteca que facilita fazer requisições para o backend
 */
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://discodovisk-backend.onrender.com/api',
  timeout: 90000,
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
    const requestUrl = error.config?.url || '';
    // Senha incorreta no login (ou senha atual incorreta ao trocar) é um erro
    // do formulário, não uma sessão expirada. Não saia da tela nesses casos.
    const isCredentialForm = requestUrl.endsWith('/auth/login') || requestUrl.endsWith('/auth/change-password');
    if (error.response?.status === 401 && !isCredentialForm) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // A aplicação usa HashRouter; navegar para /login físico pode gerar 404
      // no servidor de hospedagem.
      window.location.hash = '#/login';
    }
    return Promise.reject(error);
  }
);

export default api;
