import { HiOutlineZoomIn } from "react-icons/hi";
import Table from "../../../ui/Table";
import Tag from "../../../ui/Tag";
import { formatCurrency } from "../../../utils/helpers";
import styled from "styled-components";
import { useState } from "react";
import React from "react";

// Styled image with smooth transitions
const Img = styled.img`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 100;
  width: 500px;
  height: auto;
  box-shadow: var(--box-shadow);
  border: 2px solid white;
  transition: opacity 0.2s ease-in-out;
  opacity: ${({ isVisible }) => (isVisible ? 1 : 0)};
  pointer-events: none;
`;

const ZoomContainer = styled.div`
  position: relative;
  cursor: pointer;
`;

function CampaignRow({
  campaign: {
    id,
    campaignName,
    status,
    dailyBudget,
    results,
    reaches,
    impressions,
    linkClicks,
    cpm,
    cpc,
    ctr,
    clicks,
    costPerResults,
    amountSpent,
    image,
    dailyResults,
  },
}) {
  const [isHovered, setIsHovered] = useState(false);

  function handleMouseEnter() {
    setIsHovered(true);
  }

  function handleMouseExit() {
    setIsHovered(false);
  }

  return (
    <Table.Row>
      <div>{campaignName}</div>
      <Tag size="small" variant={status}>
        {status}
      </Tag>
      <div>{dailyResults}</div>
      <div>{results}</div>
      <div>{reaches}</div>
      <div>{impressions}</div>
      <div>{linkClicks}</div>
      <div>{formatCurrency(cpm)}</div>
      <div>{formatCurrency(cpc)}</div>
      <div>{ctr}%</div>
      <div>{clicks}</div>
      <div>{formatCurrency(costPerResults)}</div>
      <div>{formatCurrency(amountSpent)}</div>
      <div>{formatCurrency(dailyBudget)}</div>
      <ZoomContainer
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseExit}
      >
        <HiOutlineZoomIn />
        {isHovered && (
          <Img src={image} alt="Campaign preview" isVisible={isHovered} />
        )}
      </ZoomContainer>
    </Table.Row>
  );
}

export default CampaignRow;
