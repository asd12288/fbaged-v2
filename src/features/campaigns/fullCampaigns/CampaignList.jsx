import { useCampaigns } from "../useCampaigns";
import Table from "../../../ui/Table";
import CampaignRow from "./CampaignRow";
import Tooltip from "../../../ui/Tooltip";
import Spinner from "../../../ui/Spinner";
import { useState } from "react";
import styled from "styled-components";

const FilterContainer = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1.6rem;
  align-items: center;
`;

const FilterLabel = styled.label`
  font-weight: 500;
  font-size: 1.4rem;
`;

const StatusFilter = styled.select`
  font-size: 1.4rem;
  padding: 0.8rem 1.2rem;
  border: 1px solid var(--color-grey-300);
  border-radius: var(--border-radius-sm);
  background-color: var(--color-grey-0);
  font-weight: 500;
  box-shadow: var(--shadow-sm);
`;

function CampaignList() {
  const [statusFilter, setStatusFilter] = useState("Active");
  const { isPending, data: campaigns } = useCampaigns();

  if (isPending) return <Spinner />;

  // Filter campaigns based on selected status
  const filteredCampaigns =
    statusFilter === "All"
      ? campaigns
      : campaigns.filter((campaign) => campaign.status === statusFilter);

  return (
    <>
      <FilterContainer>
        <FilterLabel htmlFor="statusFilter">Filter by status:</FilterLabel>
        <StatusFilter
          id="statusFilter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="All">All</option>
          <option value="Active">Active</option>
          <option value="Paused">Paused</option>
          <option value="Learning">Learning</option>
          <option value="Canceled">Canceled</option>
        </StatusFilter>
      </FilterContainer>

      <Table
        type="compact"
        columns="2fr 1.2fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr"
      >
        <Table.Header>
          <Tooltip content="Campaign Name">
            <div>Campaign Name</div>
          </Tooltip>
          <Tooltip content="The current status (e.g., active, paused)">
            <div>Status</div>
          </Tooltip>
          <Tooltip content="leads generated from the campaign on the last 24 hours">
            <div>Daily Results</div>
          </Tooltip>
          <Tooltip content="Number of results generated">
            <div>Results</div>
          </Tooltip>
          <Tooltip content="Number of unique people who saw your ads">
            <div>Reaches</div>
          </Tooltip>
          <Tooltip content="Total ad impressions">
            <div>Impressions</div>
          </Tooltip>
          <Tooltip content="Number of link clicks on the ad">
            <div>Link Clicks</div>
          </Tooltip>
          <Tooltip content="Cost per 1,000 impressions">
            <div>CPM</div>
          </Tooltip>
          <Tooltip content="Cost per click on the link">
            <div>CPC</div>
          </Tooltip>
          <Tooltip content="Click-through rate">
            <div>CTR</div>
          </Tooltip>
          <Tooltip content="Total clicks on your ad">
            <div>Clicks</div>
          </Tooltip>
          <Tooltip content="Cost per result">
            <div>CPR</div>
          </Tooltip>
          <Tooltip content="Total amount spent on this campaign">
            <div>Amount Spent</div>
          </Tooltip>
          <Tooltip content="Daily budget allocated for this campaign">
            <div>Daily Budget</div>
          </Tooltip>
          <div>Image</div>
        </Table.Header>
        <Table.Body
          data={filteredCampaigns}
          render={(campaign) => (
            <CampaignRow key={campaign.id} campaign={campaign} />
          )}
        />
      </Table>
    </>
  );
}

export default CampaignList;
