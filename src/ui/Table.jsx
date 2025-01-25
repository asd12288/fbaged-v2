import { createContext, useContext } from "react";
import styled, { css } from "styled-components";

const StyledTable = styled.table`
  ${(props) =>
    props.type === "regular" &&
    css`
      border: 1px solid var(--color-grey-200);
      font-size: 1.6rem;
      background-color: var(--color-grey-50);
      border-radius: 7px;
      align-items: center;
    `}

  ${(props) =>
    props.type === "compact" &&
    css`
      font-size: 1.1rem;
      border: 1px solid var(--color-grey-200);
      background-color: var(--color-grey-50);
      border-radius: 6px;
      text-align: center;
      overflow-x: auto;
      padding: 0.4rem;
    `}
`;

// Also reduce CommonRow gaps for more compact columns
const CommonRow = styled.div`
  display: grid;
  grid-template-columns: ${(props) => props.columns};
  column-gap: 1.2rem;
  align-items: center;
  transition: none;
`;

const StyledHeader = styled(CommonRow)`
  padding: 1.2rem 2.4rem;

  background-color: var(--color-grey-200);
  border-bottom: 1px solid var(--color-grey-400);
  text-transform: uppercase;
  letter-spacing: 0.4px;
  font-weight: 600;
  color: var(--color-grey-600);

  ${(props) =>
    props.type === "compact" &&
    css`
      font-size: 1.1rem;
      border-radius: 6px;
      text-align: center;
      overflow-x: auto;
      gap: 0.8rem;
      padding: 1.5rem 2.8rem;
    `}
`;

const StyledRow = styled(CommonRow)`
  padding: 1.2rem 2.4rem;

  ${(props) =>
    props.type === "compact" &&
    css`
      font-size: 1.1rem;
      gap: 0.8rem;
      letter-spacing: 0.4px;
    `}

  &:not(:last-child) {
    border-bottom: 1px solid var(--color-grey-100);
  }
`;

const StyledBody = styled.section`
  margin: 0.4rem 0;
`;

const StyledFooter = styled.footer`
  background-color: var(--color-grey-100);
  display: flex;
  padding: 1.2rem;
`;

const Empty = styled.p`
  font-size: 1.6rem;
  text-align: center;
  font-weight: 500;
  margin: 2.4rem;
`;

StyledTable.defaultProps = {
  type: "regular",
};

const TableContext = createContext();

function Table({ columns, children, type = "regular" }) {
  return (
    <TableContext.Provider value={{ columns }}>
      <StyledTable type={type}>{children}</StyledTable>
    </TableContext.Provider>
  );
}

function Header({ children, type = "regular" }) {
  const { columns } = useContext(TableContext);
  return (
    <StyledHeader type={type} role="row" columns={columns} as="header">
      {children}
    </StyledHeader>
  );
}

function Row({ children, type = "regular" }) {
  const { columns } = useContext(TableContext);
  return (
    <StyledRow type={type} role="row" columns={columns}>
      {children}
    </StyledRow>
  );
}

function Body({ data, render }) {
  if (!data.length) return <Empty>Empty</Empty>;

  return <StyledBody>{data.map(render)}</StyledBody>;
}

function Footer({ data, render }) {
  return <StyledFooter>{render}</StyledFooter>;
}

Table.Header = Header;
Table.Row = Row;
Table.Body = Body;
Table.Footer = Footer;

export default Table;
