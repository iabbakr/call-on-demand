

'use server';
import axios from 'axios';
import { config } from 'dotenv';
import { verifyBankAccount as verifyWithPaystack } from './paystack';

config();

// VTPass Config
const VTPASS_API_KEY = process.env.VTPASS_API_KEY;
const VTPASS_SECRET_KEY = process.env.VTPASS_SECRET_KEY;
const VTPASS_PUBLIC_KEY = process.env.VTPASS_PUBLIC_KEY;
const VTPASS_BASE_URL = 'https://sandbox.vtpass.com/api';

// Generates a unique request ID (required by VTPass)
function generateRequestId() {
    const now = new Date();
    const lagosTime = new Date(now.getTime() + 60 * 60 * 1000); // GMT+1
    const year = lagosTime.getUTCFullYear();
    const month = (lagosTime.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = lagosTime.getUTCDate().toString().padStart(2, '0');
    const hours = lagosTime.getUTCHours().toString().padStart(2, '0');
    const minutes = lagosTime.getUTCMinutes().toString().padStart(2, '0');
    return `${year}${month}${day}${hours}${minutes}${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
}

// --- TRANSACTION STATUS QUERY ---
interface QueryTransactionParams {
    request_id: string;
}

export async function queryTransactionStatus(params: QueryTransactionParams) {
    if (!VTPASS_API_KEY || !VTPASS_SECRET_KEY) {
        throw new Error('VTPass API keys are not configured.');
    }

    try {
        const response = await axios.post(`${VTPASS_BASE_URL}/requery`, 
            { request_id: params.request_id }, 
            {
                headers: {
                    'api-key': VTPASS_API_KEY,
                    'secret-key': VTPASS_SECRET_KEY,
                    'Content-Type': 'application/json',
                }
            }
        );

        return response.data;
    } catch (error: any) {
        console.error("VTPass Requery Error:", error.response?.data || error.message);
        throw new Error(error.response?.data?.response_description || 'Failed to query transaction status.');
    }
}


// --- AIRTIME ---
interface BuyAirtimeParams {
    serviceID: string; // e.g., 'mtn', 'glo', 'etisalat'
    amount: number;
    phone: string;     // The phone number to top-up
}

export async function buyAirtime(params: BuyAirtimeParams) {
    if (!VTPASS_API_KEY || !VTPASS_SECRET_KEY) {
        throw new Error('VTPass API keys are not configured.');
    }

    const requestId = generateRequestId();
    const requestBody = {
        request_id: requestId,
        serviceID: params.serviceID,
        amount: Number(params.amount), // Ensure amount is a number
        phone: params.phone,
    };

    try {
        const response = await axios.post(`${VTPASS_BASE_URL}/pay`, requestBody, {
            headers: {
                'api-key': VTPASS_API_KEY,
                'secret-key': VTPASS_SECRET_KEY,
                'Content-Type': 'application/json',
            }
        });
        
        // If the transaction is not an instant success, requery for the final status.
        if (response.data?.code !== '000') {
            await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds before requerying
            const statusResponse = await queryTransactionStatus({ request_id: requestId });
            // Return the result of the requery
            return statusResponse;
        }
        
        // If it was an instant success, return the original response
        return response.data;

    } catch (error: any) {
        console.error("VTPass Airtime Error:", error.response?.data || error.message);
        throw new Error(error.response?.data?.response_description || 'Airtime purchase failed.');
    }
}

// --- DATA ---
export type DataPlan = {
    name: string;
    variation_code: string;
    variation_amount: string;
};

export async function getDataPlans(serviceID: string): Promise<DataPlan[]> {
    if (!VTPASS_API_KEY || !VTPASS_PUBLIC_KEY) {
        throw new Error('VTPass API keys are not configured.');
    }

    try {
        const response = await axios.get(`${VTPASS_BASE_URL}/service-variations?serviceID=${serviceID}`, {
            headers: {
                'api-key': VTPASS_API_KEY,
                'public-key': VTPASS_PUBLIC_KEY,
            }
        });

        // Handle potential typo in API response key ('variations' vs 'varations')
        if (response.data?.content) {
            return response.data.content.variations || response.data.content.varations || [];
        }
        return [];
    } catch (error: any) {
        console.error("VTPass Data Plans Error:", error.response?.data || error.message);
        throw new Error(error.response?.data?.response_description || 'Data plans fetch failed.');
    }
}

interface BuyDataParams {
    serviceID: string;
    billersCode: string;
    variation_code: string;
    amount: number;
    phone: string;
}

export async function buyData(params: BuyDataParams) {
    if (!VTPASS_API_KEY || !VTPASS_SECRET_KEY) {
        throw new Error('VTPass API keys are not configured.');
    }

    const requestId = generateRequestId();
    const requestBody = {
        request_id: requestId,
        serviceID: params.serviceID,
        billersCode: params.billersCode,
        variation_code: params.variation_code,
        amount: params.amount,
        phone: params.phone,
    };

    try {
        const response = await axios.post(`${VTPASS_BASE_URL}/pay`, requestBody, {
            headers: {
                'api-key': VTPASS_API_KEY,
                'secret-key': VTPASS_SECRET_KEY,
                'Content-Type': 'application/json',
            }
        });

        if (response.data?.code !== '000') {
            await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds before requerying
            return await queryTransactionStatus({ request_id: requestId });
        }
        
        return response.data;

    } catch (error: any) {
        console.error("VTPass Data Purchase Error:", error.response?.data || error.message);
        throw new Error(error.response?.data?.response_description || 'Data purchase failed.');
    }
}

// --- ELECTRICITY ---
interface VerifyMeterParams {
    serviceID: string; // e.g. 'ikeja-electric'
    billersCode: string; // This is the meter number
}

export async function verifyMeterNumber(params: VerifyMeterParams): Promise<{ Customer_Name: string; Address: string; }> {
     if (!VTPASS_API_KEY || !VTPASS_SECRET_KEY) {
        throw new Error('VTPass API keys are not configured.');
    }
    
    try {
        const response = await axios.post(`${VTPASS_BASE_URL}/merchant-verify`, 
        {
            serviceID: params.serviceID,
            billersCode: params.billersCode
        }, 
        {
            headers: {
                'api-key': VTPASS_API_KEY,
                'secret-key': VTPASS_SECRET_KEY,
                 'Content-Type': 'application/json',
            }
        });
        
        if (response.data && response.data.content && response.data.content.Customer_Name) {
            return response.data.content;
        } else {
             throw new Error(response.data.content.error || response.data.response_description || 'Invalid meter number or service.');
        }

    } catch (error: any) {
        console.error("VTPass Meter Verification Error:", error.response?.data || error.message);
        throw new Error(error.response?.data?.response_description || 'Meter verification failed.');
    }
}


interface BuyElectricityParams {
    serviceID: string;
    billersCode: string;
    variation_code: 'prepaid' | 'postpaid';
    amount: number;
    phone: string;
}

export async function buyElectricity(params: BuyElectricityParams) {
    if (!VTPASS_API_KEY || !VTPASS_SECRET_KEY) {
        throw new Error('VTPass API keys are not configured.');
    }

    const requestId = generateRequestId();
    const requestBody = {
        request_id: requestId,
        serviceID: params.serviceID,
        billersCode: params.billersCode,
        variation_code: params.variation_code,
        amount: params.amount,
        phone: params.phone,
    };

    try {
        const response = await axios.post(`${VTPASS_BASE_URL}/pay`, requestBody, {
            headers: {
                'api-key': VTPASS_API_KEY,
                'secret-key': VTPASS_SECRET_KEY,
                'Content-Type': 'application/json',
            }
        });

        if (response.data?.code !== '000') {
             await new Promise(resolve => setTimeout(resolve, 3000));
             const statusResponse = await queryTransactionStatus({ request_id: requestId });
             return statusResponse;
        }

        return response.data;
    } catch (error: any) {
        console.error("VTPass Electricity Purchase Error:", error.response?.data || error.message);
        throw new Error(error.response?.data?.response_description || 'Electricity purchase failed.');
    }
}

// --- BANK ACCOUNT VERIFICATION ---
interface VerifyBankAccountParams {
    account_number: string;
    bank_code: string;
}

export async function verifyBankAccount(params: VerifyBankAccountParams) {
    // Re-routing to Paystack for more reliable verification
    try {
        return await verifyWithPaystack({
            account_number: params.account_number,
            bank_code: params.bank_code,
        });
    } catch (error: any) {
        // Re-throw the error to be caught by the calling function
        throw new Error(error.message || 'Bank account verification failed via Paystack.');
    }
}

