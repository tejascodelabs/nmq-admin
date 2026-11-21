import api from "./axios";

const BASE_PATH = "/policies";

// Get all policies (supports optional params like { active: true })
export const getAllPolicies = (params) => api.get(BASE_PATH, { params });

// Get policy by slug/type (e.g., "terms", "privacy", "TERMS")
export const getPolicyBySlug = (slug) =>
  api.get(`${BASE_PATH}/${encodeURIComponent(String(slug).toLowerCase())}`);

// Create a new policy
export const createPolicy = (data) => api.post(BASE_PATH, data);

// Update an existing policy by ID
export const updatePolicy = (id, data) => api.put(`${BASE_PATH}/${id}`, data);

// Update policy status ("active" / "inactive" or { isActive: boolean })
export const updatePolicyStatus = (id, payload) =>
  api.patch(`${BASE_PATH}/${id}/status`, payload);

// Delete a policy by ID
export const deletePolicy = (id) => api.delete(`${BASE_PATH}/${id}`);