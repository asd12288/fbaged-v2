import { HiOutlineZoomIn } from "react-icons/hi";
import Table from "../../../ui/Table";
import Tag from "../../../ui/Tag";
import { formatCurrency } from "../../../utils/helpers";
import styled from "styled-components";
import { useState } from "react";

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
  transition: opacity 0.2s ease-in-out; /* Smooth transition */
  opacity: ${({ isVisible }) => (isVisible ? 1 : 0)}; /* Show/hide image */
  pointer-events: none; /* Prevent interaction with the image */
`;

function CampaignRow({
  campaign: {
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
  },
}) {
  const [isHovered, setIsHovered] = useState(false); // Track hover state

  function handleMouseEnter() {
    setIsHovered(true); // Show the image
  }

  function handleMouseExit() {
    setIsHovered(false); // Hide the image immediately
  }

  return (
    <Table.Row type="compact">
      <div>{campaignName}</div>

      <Tag size="small" variant={status}>
        {status}
      </Tag>
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

      {/* Hover logic */}
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseExit}
        style={{ position: "relative" }}
      >
        {/* Display zoom icon by default */}
        <HiOutlineZoomIn />

        {/* Conditionally render image with a fade effect */}
        {isHovered && (
          <Img src={image} alt="Campaign preview" isVisible={isHovered} />
        )}
      </div>
    </Table.Row>
  );
}

export default CampaignRow;
