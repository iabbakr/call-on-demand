// lib/api.ts
import axios from "axios";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL; 
// e.g. "https://your-cloud-function-url" or "https://your-nextjs-site.com/api"

export async function buyAirtime(params: {
  serviceID: string;
  amount: number;
  phone: string;
}) {
  try {
    const response = await axios.post(`${API_BASE_URL}/vtpass/airtime`, params);
    return response.data;
  } catch (error: any) {
    console.error("Airtime API Error:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || "Airtime purchase failed");
  }
}

export async function buyData(params: {
  serviceID: string;
  billersCode: string;
  variation_code: string;
  amount: number;
  phone: string;
}) {
  try {
    const response = await axios.post(`${API_BASE_URL}/vtpass/data`, params);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Data purchase failed");
  }
}

export async function buyElectricity(params: {
  serviceID: string;
  billersCode: string;
  variation_code: string;
  amount: number;
  phone: string;
}) {
  try {
    const response = await axios.post(`${API_BASE_URL}/vtpass/electricity`, params);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Electricity purchase failed");
  }
}

export async function getDataPlans(serviceID: string) {
  try {
    const response = await axios.get(`${API_BASE_URL}/vtpass/data-plans?serviceID=${serviceID}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch data plans");
  }
}
