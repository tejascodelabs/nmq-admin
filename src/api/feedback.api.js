import api from "./axios";


// Get all feedbacks API call
export const getFeedbacksApi = async (params = {}) => {
  try {
    const response = await api.get("/feedback", {
      params: {
        page: params.page || 1,
        limit: params.limit || 10,
        ...(params.shopId && params.shopId !== "ALL"
          ? { shopId: params.shopId }
          : {}),
        ...(params.shopName?.trim()
          ? { shopName: params.shopName.trim() }
          : {}),
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error fetching feedbacks:", error);
    throw error;
  }
};