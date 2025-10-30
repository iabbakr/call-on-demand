declare module "react-native-paystack" {
  import * as React from "react";

  export interface PaystackPaymentProps {
    publicKey: string;
    amount: number;
    email: string;
    currency?: string;
    onSuccess?: (response: any) => void;
    onCancel?: () => void;
  }

  export interface PaystackProviderProps {
    publicKey: string;
    children: React.ReactNode;
  }

  export const PaystackProvider: React.FC<PaystackProviderProps>;

  export function usePaystackPayment(config: PaystackPaymentProps): {
    initializePayment: () => void;
  };
}
