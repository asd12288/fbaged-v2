import styled from "styled-components";
import Table from "../../../ui/Table";
import { useCampaigns } from "../useCampaigns";
import Spinner from "../../../ui/Spinner";
import { formatCurrency } from "../../../utils/helpers";
import { useState } from "react";

const TableContainer = styled.div`
  background-color: var(--color-grey-0);
  border: 1px solid var(--color-grey-200);
  border-radius: var(--border-radius-md);
  padding: 2.4rem;
  margin-bottom: 3.2rem;
`;

const Title = styled.h2`
  font-size: 2rem;
  font-weight: 600;
  margin-bottom: 2.4rem;
`;

const TotalSection = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 1.6rem;
  padding-top: 1.6rem;
  border-top: 1px solid var(--color-grey-200);

  p {
    font-size: 1.6rem;
    font-weight: 600;
  }

  span {
    margin-left: 0.8rem;
    color: var(--color-brand-600);
  }
`;

function DailyCostTable() {
  const { data: campaigns, isPending } = useCampaigns();
  const [date] = useState(new Date().toLocaleDateString());

  if (isPending) return <Spinner />;

  // Filter only active campaigns
  const activeCampaigns = campaigns?.filter(
    (campaign) => campaign.status === "Active" || campaign.status === "Learning"
  );

  // Calculate totals
  const totalDailyCost = activeCampaigns?.reduce(
    (sum, campaign) => sum + Number(campaign.dailyBudget || 0),
    0
  );

  const totalDailyLeads = activeCampaigns?.reduce(
    (sum, campaign) => sum + Number(campaign.dailyResults || 0),
    0
  );

  return (
    <TableContainer>
      <Title>Daily Campaign Performance - {date}</Title>
      <Table columns="2fr 1fr 1fr 1fr">
        <Table.Header>
          <div>Campaign Name</div>
          <div>Daily Cost</div>
          <div>Daily Leads</div>
          <div>Cost Per Lead</div>
        </Table.Header>
        <Table.Body
          data={activeCampaigns}
          render={(campaign) => {
            const costPerLead =
              campaign.dailyResults > 0
                ? campaign.dailyBudget / campaign.dailyResults
                : 0;

            return (
              <Table.Row key={campaign.id}>
                <div>{campaign.campaignName}</div>
                <div>{formatCurrency(campaign.dailyBudget || 0)}</div>
                <div>{campaign.dailyResults || 0}</div>
                <div>{formatCurrency(costPerLead)}</div>
              </Table.Row>
            );
          }}
        />
      </Table>

      <TotalSection>
        <p>
          Total Daily Cost: <span>{formatCurrency(totalDailyCost)}</span>
        </p>
        <p style={{ marginLeft: "2rem" }}>
          Total Daily Leads: <span>{totalDailyLeads}</span>
        </p>
      </TotalSection>
    </TableContainer>
  );
}

export default DailyCostTable;
