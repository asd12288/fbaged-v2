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
`;

const Title = styled.h2`
  font-size: 2rem;
  font-weight: 600;
  margin-bottom: 2.4rem;
`;

const TotalSection = styled.div`
  display: flex;
  justify-content: space-between;
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

function DailyCampaignStats() {
  const { data: campaigns, isPending } = useCampaigns();
  const [date] = useState(new Date().toLocaleDateString());

  if (isPending) return <Spinner />;

  // Filter only active campaigns
  const activeCampaigns = campaigns?.filter(
    (campaign) => campaign.status === "Active" || campaign.status === "Learning"
  );

  // Calculate totals
  const totalDailyLeads = activeCampaigns?.reduce(
    (sum, campaign) => sum + Number(campaign.dailyResults || 0),
    0
  );

  const totalDailySpend = activeCampaigns?.reduce((sum, campaign) => {
    const spend =
      Number(campaign.dailyResults || 0) * Number(campaign.costPerResults || 0);
    return sum + spend;
  }, 0);

  return (
    <TableContainer>
      <Title>Daily Campaign Stats - {date}</Title>
      <Table columns="2fr 1fr 1fr 1fr">
        <Table.Header>
          <div>Campaign Name</div>
          <div>Daily Leads</div>
          <div>Cost Per Result</div>
          <div>Daily Spend</div>
        </Table.Header>
        <Table.Body
          data={activeCampaigns}
          render={(campaign) => {
            // Calculate the daily spend based on leads and CPR
            const dailySpend =
              (campaign.dailyResults || 0) * (campaign.costPerResults || 0);

            return (
              <Table.Row key={campaign.id}>
                <div>{campaign.campaignName}</div>
                <div>{campaign.dailyResults || 0}</div>
                <div>{formatCurrency(campaign.costPerResults || 0)}</div>
                <div>{formatCurrency(dailySpend)}</div>
              </Table.Row>
            );
          }}
        />
      </Table>

      <TotalSection>
        <p>
          Total Daily Leads: <span>{totalDailyLeads}</span>
        </p>
        <p>
          Total Daily Spend: <span>{formatCurrency(totalDailySpend)}</span>
        </p>
        <p>
          Average CPR:{" "}
          <span>
            {totalDailyLeads > 0
              ? formatCurrency(totalDailySpend / totalDailyLeads)
              : formatCurrency(0)}
          </span>
        </p>
      </TotalSection>
    </TableContainer>
  );
}

export default DailyCampaignStats;
