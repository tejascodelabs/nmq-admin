import api from "./axios";

export const getShops = async (page = 1, limit = 10) => {
  const response = await api.get(`/shops?page=${page}&limit=${limit}`);

  return response.data;
};

export const getShopByIdApi = async (shopId) => {
  const response = await api.get(`/shops/join/${shopId}`);

  return response.data;
};