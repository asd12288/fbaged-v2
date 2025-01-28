import { useState, useRef } from "react";
import {
  useFloating,
  offset,
  flip,
  shift,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  FloatingArrow,
  arrow,
} from "@floating-ui/react";

function Tooltip({ children, content, placement = "top" }) {
  const [isOpen, setIsOpen] = useState(false);
  const arrowRef = useRef(null);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement,
    middleware: [offset(10), flip(), shift(), arrow({ element: arrowRef })],
  });

  const hover = useHover(context);
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "tooltip" });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role,
  ]);

  return (
    <>
      <span
        ref={refs.setReference}
        {...getReferenceProps()}
        style={{ cursor: "pointer" }}
      >
        {children}
      </span>
      {isOpen && (
        <div
          ref={refs.setFloating}
          style={{
            ...floatingStyles,
            backgroundColor: "black",
            color: "white",
            padding: "10px 10px",
            borderRadius: "4px",
            zIndex: 1,
          }}
          {...getFloatingProps()}
        >
          {content}
          <FloatingArrow
            ref={arrowRef}
            context={context}
            style={{
              color: "#059669",
            }}
          />
        </div>
      )}
    </>
  );
}

export default Tooltip;
