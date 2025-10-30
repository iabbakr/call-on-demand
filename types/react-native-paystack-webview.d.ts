declare module "react-native-paystack-webview" {
  import React from "react";
  import { ViewProps } from "react-native";

  interface PaystackWebViewProps extends ViewProps {
    paystackKey: string;
    amount: number;
    billingEmail: string;
    activityIndicatorColor?: string;
    onCancel: () => void;
    onSuccess: (response: any) => void;
    autoStart?: boolean;
  }

  const PaystackWebView: React.FC<PaystackWebViewProps>;

  export default PaystackWebView;
}
