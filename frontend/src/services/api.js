import axios from 'axios';

const rawBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const SERVER_ORIGIN = rawBase.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
export const API_BASE_URL = `${SERVER_ORIGIN}/api/v1`;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45000,
});

export const submitComplaint = async (formData) => {
  const response = await apiClient.post('/complaints', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const getComplaints = async (params = {}) => {
  const queryParams = typeof params === 'string' ? { email: params } : params;
  const response = await apiClient.get('/complaints', { params: queryParams });
  return response.data;
};

export const getComplaintDetails = async (id) => {
  const response = await apiClient.get(`/complaints/${id}`);
  return response.data;
};

export const getAnalyticsSummary = async () => {
  const response = await apiClient.get('/analytics/summary');
  return response.data;
};

export const getVolumeForecast = async () => {
  const response = await apiClient.get('/predictions/forecast-volume');
  return response.data;
};

export const getGISHotspots = async () => {
  const response = await apiClient.get('/predictions/gis-hotspots');
  return response.data;
};

export const getRiskForecast = async () => {
  const response = await apiClient.get('/predictions/7day-risk-forecast');
  return response.data;
};

export const getAgentLogs = async (complaintId) => {
  const response = await apiClient.get(`/agents/logs/${complaintId}`);
  return response.data;
};

export const processNLP = async (text, locationHint = '') => {
  const formData = new FormData();
  formData.append('text', text);
  formData.append('location_hint', locationHint);
  const response = await apiClient.post('/nlp/process', formData);
  return response.data;
};

export const processVoiceComplaint = async (spokenText, locationHint = '') => {
  const response = await apiClient.post('/nlp/voice-process', {
    spoken_text: spokenText,
    location_hint: locationHint
  });
  return response.data;
};

export const sendAIChat = async (query, history = []) => {
  const formData = new FormData();
  formData.append('query', query);
  if (Array.isArray(history) && history.length > 0) {
    formData.append('history', JSON.stringify(history));
  }
  const response = await apiClient.post('/nlp/chat', formData);
  return response.data;
};

export const deleteComplaint = async (id) => {
  const response = await apiClient.delete(`/complaints/${id}`);
  return response.data;
};

export const deleteUserComplaints = async (email) => {
  const response = await apiClient.delete(`/complaints/user/${email}`);
  return response.data;
};

export const setApiKeys = async (payload) => {
  const response = await apiClient.post('/auth/api-keys', payload);
  return response.data;
};

export const getApiKeysStatus = async () => {
  const response = await apiClient.get('/auth/api-keys');
  return response.data;
};

export const getSmtpStatus = async () => {
  const response = await apiClient.get('/auth/smtp-settings');
  return response.data;
};

export const updateSmtpSettings = async (payload) => {
  const response = await apiClient.post('/auth/smtp-settings', payload);
  return response.data;
};

export const registerUser = async (payload) => {
  const response = await apiClient.post('/auth/register', payload);
  return response.data;
};

export const loginUser = async (payload) => {
  const response = await apiClient.post('/auth/login', payload);
  return response.data;
};

export const updateUserProfile = async (payload) => {
  const response = await apiClient.put('/auth/profile', payload);
  return response.data;
};

export const getCurrentUser = async (email) => {
  const response = await apiClient.get('/auth/me', { params: { email } });
  return response.data;
};

export default apiClient;

