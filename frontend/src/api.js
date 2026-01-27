import axios from 'axios';

const api = axios.create({
    baseURL: '', // The Vite proxy will handle this
});

// Add a request interceptor to include the API key
api.interceptors.request.use((config) => {
    const apiKey = import.meta.env.VITE_API_KEY || '';
    if (apiKey) {
        config.headers['X-API-KEY'] = apiKey;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default api;
