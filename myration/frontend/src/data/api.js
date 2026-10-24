/* ======================================================
  API HELPER — Connects frontend to the PHP REST API
   ======================================================
   All API calls go through this file.
  BASE_URL points to the PHP API running on port 8000.
   ====================================================== */

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
const API_ORIGIN = BASE_URL.replace(/\/api\/?$/, "");

export function getUploadedFileUrl(filename) {
  return `${API_ORIGIN}/uploads/${encodeURIComponent(filename)}`;
}

// ---- Helper to make API calls ----
async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem("token");

  const config = {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  // If body is FormData (for file uploads), remove Content-Type header
  if (options.body instanceof FormData) {
    delete config.headers["Content-Type"];
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config);
    
    // Check if response is JSON
    const contentType = response.headers.get("Content-Type");
    let data;
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}...`);
    }

    if (!response.ok) {
      throw new Error(data.message || "Something went wrong");
    }

    return data;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error.message);
    throw error;
  }
}

// ============ AUTH APIs ============

export async function loginAPI(username, password) {
  return apiCall("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function registerUserAPI(formData) {
  return apiCall("/auth/register/user", {
    method: "POST",
    body: formData, // FormData for file upload
  });
}

export async function registerShopkeeperAPI(data) {
  return apiCall("/auth/register/shopkeeper", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function checkUsernameAPI(username) {
  return apiCall(`/auth/check-username/${encodeURIComponent(username)}`);
}

export async function checkAadhaarAPI(aadhaar) {
  return apiCall(`/auth/check-aadhaar/${encodeURIComponent(aadhaar)}`);
}

export async function checkLicenseAPI(licenseNo) {
  return apiCall(`/auth/check-license/${encodeURIComponent(licenseNo)}`);
}

// ---- Public/Common APIs ----
export async function getPublicShops() {
  return apiCall("/auth/shops"); // Public route to list shops for registration
}

// ============ USER (BENEFICIARY) APIs ============

export async function getUserProfile() {
  return apiCall("/user/profile");
}

export async function getUserQuota() {
  return apiCall("/user/quota");
}

export async function getUserHistory() {
  return apiCall("/user/history");
}

export async function getAssignedShop() {
  return apiCall("/user/shop");
}

export async function getUserShopStock(shopId) {
  return apiCall(`/user/shop/${shopId}/stock`);
}

export async function bookSlot(date, time) {
  return apiCall("/user/book-slot", {
    method: "POST",
    body: JSON.stringify({ date, time }),
  });
}

export async function getUserSlots() {
  return apiCall("/user/slots");
}

export async function submitComplaint(data) {
  return apiCall("/user/complaint", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getUserAlerts() {
  return apiCall("/user/alerts");
}

// ============ SHOPKEEPER APIs ============

export async function getShopkeeperDashboard() {
  return apiCall("/shopkeeper/dashboard");
}

export async function getPendingVerifications() {
  return apiCall("/shopkeeper/pending");
}

export async function getVerifiedBeneficiaries() {
  return apiCall("/shopkeeper/verified");
}

export async function verifyUser(registrationId, action) {
  return apiCall(`/shopkeeper/verify/${registrationId}`, {
    method: "POST",
    body: JSON.stringify({ action }), // "approve" or "reject"
  });
}

export async function getShopkeeperStock() {
  return apiCall("/shopkeeper/stock");
}

export async function updateStock(itemId, quantity) {
  return apiCall(`/shopkeeper/stock/${itemId}`, {
    method: "PUT",
    body: JSON.stringify({ quantity }),
  });
}

export async function sellStock(itemId, quantity) {
  return apiCall(`/shopkeeper/stock/${itemId}/sell`, {
    method: "PUT",
    body: JSON.stringify({ quantity }),
  });
}

export async function toggleShopStatus(isOpen) {
  return apiCall("/shopkeeper/shop-status", {
    method: "PUT",
    body: JSON.stringify({ is_open: isOpen }),
  });
}

// ============ ADMIN APIs ============

export async function getAdminDashboard() {
  return apiCall("/admin/dashboard");
}

export async function getShopsAPI() {
  return apiCall("/admin/shops");
}

export async function getPendingApprovals() {
  return apiCall("/admin/pending");
}

export async function approveRegistration(id, type, action) {
  return apiCall(`/admin/approve/${id}`, {
    method: "POST",
    body: JSON.stringify({ type, action }), // type: "user"/"shopkeeper", action: "approve"/"reject"
  });
}

export async function getQuotaSettings() {
  return apiCall("/admin/quota");
}

export async function updateQuota(cardType, items) {
  return apiCall("/admin/quota", {
    method: "PUT",
    body: JSON.stringify({ card_type: cardType, items }),
  });
}

export async function addNewQuotaItem(data) {
  return apiCall("/admin/quota/new-item", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function removeQuotaItemAPI(cardType, itemName) {
  return apiCall(`/admin/quota/${cardType}/${itemName}`, {
    method: "DELETE",
  });
}

export async function getQuotaHistoryAPI(page = 1) {
  return apiCall(`/user/quota-history?page=${page}`);
}

export async function getBeneficiaryQuotaAPI(userId) {
  return apiCall(`/shopkeeper/beneficiary-quota/${userId}`);
}

export async function collectRationAPI(data) {
  return apiCall("/shopkeeper/collect-ration", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getShopkeeperStockHistoryAPI() {
  return apiCall("/shopkeeper/stock-history");
}

export async function getShopDemandAPI(shopId) {
  return apiCall(`/admin/shops/${shopId}/demand`);
}

export async function allocateStockAPI(shopId, items) {
  return apiCall(`/admin/shops/${shopId}/allocate`, {
    method: "POST",
    body: JSON.stringify({ items }),
  });
}

export async function getAssignedStockAPI() {
  return apiCall("/shopkeeper/assigned-stock");
}

export async function receiveStockAPI(assignmentId) {
  return apiCall("/shopkeeper/receive-stock", {
    method: "POST",
    body: JSON.stringify({ assignmentId }),
  });
}

export async function getComplaints() {
  return apiCall("/admin/complaints");
}

export async function resolveComplaint(id, action, warning) {
  return apiCall(`/admin/complaints/${id}`, {
    method: "PUT",
    body: JSON.stringify({ action, warning }), // action: "resolve"/"dismiss"/"warn"
  });
}

export async function getAllUsers() {
  return apiCall("/admin/users");
}

export async function getShopkeeperBookingsAPI() {
  return apiCall("/shopkeeper/bookings");
}

export async function updateShopkeeperBookingAPI(id, status) {
  return apiCall(`/shopkeeper/bookings/${id}`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}
