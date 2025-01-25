import styled, { css } from "styled-components";

const Heading = styled.h1`
  font-size: 2.4rem;
  ${(props) =>
    props.as === "h1" &&
    css`
      font-size: 3rem;
    `}
  ${(props) =>
    props.as === "h2" &&
    css`
      font-size: 2rem;
      margin-bottom: 1.6rem;
    `}

    ${(props) =>
    props.as === "h4" &&
    css`
      font-size: 3rem;
      text-align: center;
      margin: 0;
    `}
`;

export default Heading;
