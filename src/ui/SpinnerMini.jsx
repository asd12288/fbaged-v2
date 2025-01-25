import { BiLoaderAlt } from "react-icons/bi";
import styled, { keyframes } from "styled-components";

const roatate = keyframes`
to {
    transform: rotate(1turn);
}`;

const SpinnerMini = styled(BiLoaderAlt)`
  width: 2.4rem;
  height: 2.4rem;
  animation: ${roatate} 1s linear infinite;
`;

export default SpinnerMini;
