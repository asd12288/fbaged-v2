import { cloneElement, createContext, useContext, useState } from "react";
import { createPortal } from "react-dom";
import { HiX } from "react-icons/hi";
import styled from "styled-components";
import { useOutsideClick } from "../hooks/useOutsideClick";

// Export the context
export const ModalContext = createContext();

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 1000;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const StyledModal = styled.div`
  background-color: var(--color-grey-0);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-lg);
  max-width: 90%;
  transition: all 0.3s;
  overflow: hidden;
  max-height: 90vh;
  position: relative;

  width: ${(props) => props.width || "80rem"};
`;

const CloseButton = styled.button`
  position: absolute;
  top: 1.6rem;
  right: 1.6rem;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 2.4rem;
  color: var(--color-grey-500);
  transition: all 0.2s;
  z-index: 10;

  &:hover {
    color: var(--color-grey-800);
  }
`;

const ModalBody = styled.div`
  padding: 3.2rem;
  overflow-y: auto;
  max-height: 90vh;
`;

function Modal({ children, width }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  return (
    <ModalContext.Provider value={{ isOpen, open, close }}>
      {children}
    </ModalContext.Provider>
  );
}

function Open({ children, opens: opensWindow }) {
  const { open } = useContext(ModalContext);

  return cloneElement(children, { onClick: () => open(opensWindow) });
}

function Window({ children, width }) {
  const { isOpen, close } = useContext(ModalContext);
  const ref = useOutsideClick(close);

  if (!isOpen) return null;

  return createPortal(
    <Overlay>
      <StyledModal width={width} ref={ref}>
        <CloseButton onClick={close}>
          <HiX />
        </CloseButton>
        <ModalBody>{children}</ModalBody>
      </StyledModal>
    </Overlay>,
    document.body
  );
}

Modal.Open = Open;
Modal.Window = Window;

export default Modal;
