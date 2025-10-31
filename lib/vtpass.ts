import axios from "axios";
import Constants from "expo-constants";

const { manifest } = Constants;



// VTpass Config (replace with your sandbox keys)
const VTPASS_API_KEY = process.env.EXPO_PUBLIC_VTPASS_API_KEY || "";
const VTPASS_SECRET_KEY = process.env.EXPO_PUBLIC_VTPASS_SECRET_KEY || "";
const VTPASS_PUBLIC_KEY = process.env.EXPO_PUBLIC_VTPASS_PUBLIC_KEY || ""; // optional
const VTPASS_BASE_URL = "https://sandbox.vtpass.com/api";

// Generate unique request ID
function generateRequestId() {
  const now = new Date();
  const lagosTime = new Date(now.getTime() + 60 * 60 * 1000); // GMT+1
  const year = lagosTime.getUTCFullYear();
  const month = (lagosTime.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = lagosTime.getUTCDate().toString().padStart(2, "0");
  const hours = lagosTime.getUTCHours().toString().padStart(2, "0");
  const minutes = lagosTime.getUTCMinutes().toString().padStart(2, "0");
  return `${year}${month}${day}${hours}${minutes}${Math.floor(
    Math.random() * 100000
  )
    .toString()
    .padStart(5, "0")}`;
}

// ------------------------ Airtime ------------------------
export async function buyAirtime({
  serviceID,
  amount,
  phone,
}: {
  serviceID: string;
  amount: number;
  phone: string;
}) {
  const requestId = generateRequestId();
  try {
    const res = await axios.post(
      `${VTPASS_BASE_URL}/pay`,
      { request_id: requestId, serviceID, amount, phone },
      { headers: { "api-key": VTPASS_API_KEY, "secret-key": VTPASS_SECRET_KEY, "Content-Type": "application/json" } }
    );

    if (res.data?.code !== "000") {
      await new Promise((r) => setTimeout(r, 3000));
      return await queryTransactionStatus(requestId);
    }
    return res.data;
  } catch (err: any) {
    console.error("Airtime Error:", err.response?.data || err.message);
    throw new Error(err.response?.data?.response_description || "Airtime failed");
  }
}

// ------------------------ Data ------------------------
export type DataPlan = {
  name: string;
  variation_code: string;
  variation_amount: string;
};

export async function getDataPlans(serviceID: string): Promise<DataPlan[]> {
  try {
    const res = await axios.get(
      `${VTPASS_BASE_URL}/service-variations?serviceID=${serviceID}`,
      { headers: { "api-key": VTPASS_API_KEY, "public-key": VTPASS_PUBLIC_KEY } }
    );
    return res.data?.content?.variations || res.data?.content?.varations || [];
  } catch (err: any) {
    console.error("Data Plans Error:", err.response?.data || err.message);
    throw new Error(err.response?.data?.response_description || "Failed to fetch data plans");
  }
}

export async function buyData({
  serviceID,
  billersCode,
  variation_code,
  amount,
  phone,
}: {
  serviceID: string;
  billersCode: string;
  variation_code: string;
  amount: number;
  phone: string;
}) {
  const requestId = generateRequestId();
  try {
    const res = await axios.post(
      `${VTPASS_BASE_URL}/pay`,
      { request_id: requestId, serviceID, billersCode, variation_code, amount, phone },
      { headers: { "api-key": VTPASS_API_KEY, "secret-key": VTPASS_SECRET_KEY, "Content-Type": "application/json" } }
    );

    if (res.data?.code !== "000") {
      await new Promise((r) => setTimeout(r, 3000));
      return await queryTransactionStatus(requestId);
    }
    return res.data;
  } catch (err: any) {
    console.error("Data Purchase Error:", err.response?.data || err.message);
    throw new Error(err.response?.data?.response_description || "Data purchase failed");
  }
}

// ------------------------ Electricity ------------------------
export async function verifyMeterNumber({
  serviceID,
  billersCode,
}: {
  serviceID: string;
  billersCode: string;
}): Promise<{ Customer_Name: string; Address: string }> {
  try {
    const res = await axios.post(
      `${VTPASS_BASE_URL}/merchant-verify`,
      { serviceID, billersCode },
      { headers: { "api-key": VTPASS_API_KEY, "secret-key": VTPASS_SECRET_KEY, "Content-Type": "application/json" } }
    );
    if (res.data?.content?.Customer_Name) return res.data.content;
    throw new Error(res.data?.content?.error || res.data?.response_description || "Invalid meter");
  } catch (err: any) {
    console.error("Meter Verification Error:", err.response?.data || err.message);
    throw new Error(err.response?.data?.response_description || "Meter verification failed");
  }
}

export async function buyElectricity({
  serviceID,
  billersCode,
  variation_code,
  amount,
  phone,
}: {
  serviceID: string;
  billersCode: string;
  variation_code: "prepaid" | "postpaid";
  amount: number;
  phone: string;
}) {
  const requestId = generateRequestId();
  try {
    const res = await axios.post(
      `${VTPASS_BASE_URL}/pay`,
      { request_id: requestId, serviceID, billersCode, variation_code, amount, phone },
      { headers: { "api-key": VTPASS_API_KEY, "secret-key": VTPASS_SECRET_KEY, "Content-Type": "application/json" } }
    );

    if (res.data?.code !== "000") {
      await new Promise((r) => setTimeout(r, 3000));
      return await queryTransactionStatus(requestId);
    }
    return res.data;
  } catch (err: any) {
    console.error("Electricity Purchase Error:", err.response?.data || err.message);
    throw new Error(err.response?.data?.response_description || "Electricity purchase failed");
  }
}

// ------------------------ Transaction Query ------------------------
export async function queryTransactionStatus(request_id: string) {
  try {
    const res = await axios.post(
      `${VTPASS_BASE_URL}/requery`,
      { request_id },
      { headers: { "api-key": VTPASS_API_KEY, "secret-key": VTPASS_SECRET_KEY, "Content-Type": "application/json" } }
    );
    return res.data;
  } catch (err: any) {
    console.error("Transaction Query Error:", err.response?.data || err.message);
    throw new Error(err.response?.data?.response_description || "Transaction query failed");
  }
}
