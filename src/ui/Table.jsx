import { createContext, useContext } from "react";
import styled, { css } from "styled-components";
import React from "react";

const StyledTable = styled.table`
  ${(props) =>
    props.type === "regular" &&
    css`
      border: 1px solid var(--color-grey-200);
      font-size: 1.6rem;
      background-color: var(--color-grey-50);
      border-radius: 7px;
      overflow: hidden;
      width: 100%;
    `}

  ${(props) =>
    props.type === "compact" &&
    css`
      font-size: 1.1rem;
      border: 1px solid var(--color-grey-200);
      background-color: var(--color-grey-50);
      border-radius: 6px;
      text-align: center;
    `}

    ${(props) =>
    props.type === "center" &&
    css`
      text-align: center;
    `}
`;

const TableWrapper = styled.div`
  overflow-x: auto;
`;

const StyledThead = styled.thead`
  background-color: var(--color-grey-200);
  border-bottom: 1px solid var(--color-grey-400);
  text-transform: uppercase;
  letter-spacing: 0.4px;
  font-weight: 600;
  color: var(--color-grey-600);
`;

const StyledTbody = styled.tbody`
  font-size: 1.4rem;
`;

const StyledTr = styled.tr`
  &:not(:last-child) {
    border-bottom: 1px solid var(--color-grey-100);
  }

  ${(props) =>
    props.type === "compact" &&
    css`
      font-size: 1.1rem;
      letter-spacing: 0.4px;
    `}
`;

const StyledTh = styled.th`
  padding: 1.2rem 2.4rem;
  text-align: ${(props) => props.align || "left"};

  ${(props) =>
    props.type === "compact" &&
    css`
      padding: 0.8rem 1.2rem;
    `}
`;

const StyledTd = styled.td`
  padding: 1.2rem 2.4rem;
  text-align: ${(props) => props.align || "left"};

  ${(props) =>
    props.type === "compact" &&
    css`
      padding: 0.8rem 1.2rem;
    `}
`;

const Empty = styled.div`
  font-size: 1.6rem;
  font-weight: 500;
  text-align: center;
  margin: 2.4rem;
`;

const TableContext = createContext();

function Table({ columns, children, type = "regular" }) {
  return (
    <TableContext.Provider value={{ columns, type }}>
      <TableWrapper>
        <StyledTable type={type}>{children}</StyledTable>
      </TableWrapper>
    </TableContext.Provider>
  );
}

function Header({ children, type }) {
  const { columns, type: contextType } = useContext(TableContext);
  const headerType = type || contextType;

  return (
    <StyledThead>
      <StyledTr type={headerType}>
        {React.Children.map(children, (child, i) => {
          // If consumer passed a <th>, render its children only to avoid <th> inside <th>
          const content =
            React.isValidElement(child) && child.type === "th"
              ? child.props.children
              : child;
          return (
            <StyledTh key={i} type={headerType}>
              {content}
            </StyledTh>
          );
        })}
      </StyledTr>
    </StyledThead>
  );
}

function Row({ children, type }) {
  const { columns, type: contextType } = useContext(TableContext);
  const rowType = type || contextType;

  return (
    <StyledTr type={rowType}>
      {React.Children.map(children, (child, i) => (
        <StyledTd key={i} type={rowType}>
          {child}
        </StyledTd>
      ))}
    </StyledTr>
  );
}

function Body({ data, render, type }) {
  const { type: contextType } = useContext(TableContext);
  const bodyType = type || contextType;

  if (!data || data.length === 0) {
    return (
      <StyledTbody>
        <StyledTr>
          <StyledTd colSpan="100%">
            <Empty>No data to display</Empty>
          </StyledTd>
        </StyledTr>
      </StyledTbody>
    );
  }

  return (
    <StyledTbody>
      {data.map((item, index) => (
        <React.Fragment key={item.id || `row-${index}`}>
          {render(item, index)}
        </React.Fragment>
      ))}
    </StyledTbody>
  );
}

function Footer({ children }) {
  return <tfoot>{children}</tfoot>;
}

Table.Header = Header;
Table.Row = Row;
Table.Body = Body;
Table.Footer = Footer;

export default Table;
