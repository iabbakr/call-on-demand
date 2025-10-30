import React from "react";
import { useSecureAction } from "../../../hooks/useSecureAction";
import PinDialog from "./PinDialog";

interface SecureActionWrapperProps {
  children: (triggerSecureAction: (action: () => void) => void) => React.ReactNode;
}

/**
 * A reusable wrapper that provides secureAction + PIN dialog context.
 * Usage: Wrap around your screen or button UI and get secureAction from the render prop.
 */
export default function SecureActionWrapper({ children }: SecureActionWrapperProps) {
  const { secureAction, showPinDialog, setShowPinDialog, verifyPin } = useSecureAction();

  return (
    <>
      {children(secureAction)}
      <PinDialog
        visible={showPinDialog}
        onClose={() => setShowPinDialog(false)}
        onSubmit={verifyPin}
      />
    </>
  );
}
