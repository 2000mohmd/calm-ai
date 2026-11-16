// Shared dialog behaviour: focus moves into the dialog on mount, Escape closes
// it, and focus returns to whatever opened it on unmount. Put the returned ref
// on the element with role="dialog" (it also needs tabIndex={-1}).
import { useEffect, useRef } from "react";

export function useDialogA11y(onClose: () => void) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      opener?.focus();
    };
  }, []);

  return dialogRef;
}
