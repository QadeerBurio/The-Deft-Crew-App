// api/profileApi.js
import api from './api';

export const getMyProfessionalProfile = async () => {
  const res = await api.get('/professional-profile/me');
  return res.data; // { profile, hasProfile }
};

export const getProfessionalProfileByUserId = async (userId) => {
  const res = await api.get(`/professional-profile/${userId}`);
  return res.data; // { profile }
};

export const saveProfessionalProfile = async (payload) => {
  const res = await api.post('/professional-profile', payload);
  return res.data; // { profile, hasProfile }
};

export const completeProfessionalProfile = async () => {
  const res = await api.patch('/professional-profile/complete');
  return res.data; // { profile }
};

export const deleteProfessionalProfile = async () => {
  const res = await api.delete('/professional-profile');
  return res.data; // { success }
};