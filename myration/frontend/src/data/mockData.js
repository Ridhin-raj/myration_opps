/* ======================================================
   MOCK DATA — Indian Ration Management System
   ======================================================
   This file is used as FALLBACK data when backend is not running.
   In production, all data comes from the MySQL database via API.
   ====================================================== */

// ---- Location Data ----
export const states = ["Karnataka", "Tamil Nadu", "Kerala", "Andhra Pradesh", "Maharashtra"];

export const districtsByState = {
  Karnataka: ["Bengaluru Urban", "Mysuru", "Dharwad", "Mangaluru", "Belagavi"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Salem", "Tiruchirappalli"],
  Kerala: ["Thiruvananthapuram", "Ernakulam", "Kozhikode", "Thrissur", "Kollam"],
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Tirupati", "Nellore"],
  Maharashtra: ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad"],
};

export const taluksByDistrict = {
  "Bengaluru Urban": ["Bengaluru North", "Bengaluru South", "Bengaluru East", "Anekal"],
  Mysuru: ["Mysuru", "Nanjangud", "T. Narasipura", "Hunsur"],
  Chennai: ["Egmore", "Mylapore", "Tondiarpet", "Ambattur"],
  Thiruvananthapuram: ["Thiruvananthapuram", "Neyyattinkara", "Nedumangad"],
  Mumbai: ["Andheri", "Borivali", "Kurla", "Dadar"],
  Pune: ["Haveli", "Mulshi", "Maval", "Bhor"],
};

// ---- Ration Card Types (India PDS) ----
export const cardTypes = [
  { code: "APL", name: "Above Poverty Line" },
  { code: "BPL", name: "Below Poverty Line" },
  { code: "AAY", name: "Antyodaya Anna Yojana" },
  { code: "PHH", name: "Priority Household" },
];

// ---- Monthly Ration Quota (per card type, per person) ----
export const defaultQuota = {
  APL: [
    { item: "Rice", qty: "5 kg", price: "₹15/kg" },
    { item: "Wheat", qty: "5 kg", price: "₹10/kg" },
    { item: "Sugar", qty: "1 kg", price: "₹13/kg" },
    { item: "Kerosene", qty: "3 L", price: "₹20/L" },
  ],
  BPL: [
    { item: "Rice", qty: "10 kg", price: "₹3/kg" },
    { item: "Wheat", qty: "10 kg", price: "₹2/kg" },
    { item: "Sugar", qty: "1 kg", price: "₹13/kg" },
    { item: "Kerosene", qty: "5 L", price: "₹15/L" },
    { item: "Dal", qty: "1 kg", price: "₹15/kg" },
  ],
  AAY: [
    { item: "Rice", qty: "15 kg", price: "₹2/kg" },
    { item: "Wheat", qty: "20 kg", price: "₹1/kg" },
    { item: "Sugar", qty: "1 kg", price: "₹13/kg" },
    { item: "Kerosene", qty: "5 L", price: "₹15/L" },
    { item: "Dal", qty: "2 kg", price: "₹10/kg" },
  ],
  PHH: [
    { item: "Rice", qty: "5 kg", price: "₹1/kg" },
    { item: "Wheat", qty: "5 kg", price: "₹2/kg" },
    { item: "Sugar", qty: "1 kg", price: "₹13/kg" },
    { item: "Kerosene", qty: "4 L", price: "₹15/L" },
  ],
};

// ---- Time Slots (for booking) ----
export const timeSlots = [
  "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM",
  "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM",
  "04:00 PM", "04:30 PM", "05:00 PM",
];

// ---- Dropdown options ----
export const genderOptions = ["Male", "Female", "Other"];
export const complaintTypes = ["Quality Issue", "Less Quantity", "Shopkeeper Misbehaviour", "Shop Closed During Hours", "Other"];

// ---- Mock Shops ----
export const mockShops = [
  { id: "RS001", name: "Janata Fair Price Shop", address: "MG Road, Bengaluru North", district: "Bengaluru Urban", taluk: "Bengaluru North" },
  { id: "RS002", name: "Seva Ration Store", address: "Bannerughatta Road", district: "Bengaluru Urban", taluk: "Bengaluru South" },
  { id: "RS003", name: "Namma Ration Kadai", address: "Indiranagar 100ft Road", district: "Bengaluru Urban", taluk: "Bengaluru East" },
  { id: "RS004", name: "Mysuru Mitra FPS", address: "Near Palace Grounds", district: "Mysuru", taluk: "Mysuru" },
];

