import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions();

/** Generic API response type */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  vtpass?: T;
  [key: string]: any;
}

/** Helper wrapper */
async function callFn<T = any>(name: string, data: any): Promise<ApiResponse<T>> {
  const fn = httpsCallable(functions, name);
  const res = await fn(data);
  return res.data as ApiResponse<T>;
}

/** Service functions */
export async function getDataPlans(serviceID: string) {
  return await callFn("getDataPlans", { serviceID });
}

export async function buyAirtime(params: {
  serviceID: string;
  amount: number;
  phone: string;
}) {
  return await callFn("buyAirtime", params);
}

export async function buyData(params: {
  serviceID: string;
  billersCode: string;
  variation_code: string;
  amount: number;
  phone: string;
}) {
  return await callFn("buyData", params);
}

export async function buyElectricity(params: {
  serviceID: string;
  billersCode: string;
  variation_code: string;
  amount: number;
  phone: string;
}) {
  return await callFn("buyElectricity", params);
}

export async function buyEducation(params: {
  serviceID: string;
  quantity: number;
  amount: number;
  phone: string;
}) {
  return await callFn("buyEducation", params);
}

export async function verifyMeter(serviceID: string, billersCode: string) {
  return await callFn("verifyMeter", { serviceID, billersCode });
}

/** Paystack */
export async function createPaystackTransaction(amount: number, email: string) {
  return await callFn("createPaystackTransaction", { amount, email });
}

export async function verifyPaystackAndCredit(reference: string, amount: number) {
  return await callFn("verifyPaystackAndCredit", { reference, amount });
}
