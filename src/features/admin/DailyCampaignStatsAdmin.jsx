import { useState } from "react";
import styled from "styled-components";
import Table from "../../ui/Table";
import { useCampaigns } from "../campaigns/useCampaigns";
import { useAdminScope } from "./AdminScopeContext";
import { HiPencil } from "react-icons/hi";
import Button from "../../ui/Button";
import Modal from "../../ui/Modal";
import Spinner from "../../ui/Spinner";
import { formatCurrency } from "../../utils/helpers";
import Heading from "../../ui/Heading";
import Form from "../../ui/Form";
import FormRowVertical from "../../ui/FormRowVertical";
import Input from "../../ui/Input";
import { useEditCampaign } from "../campaigns/useEditCampaign";
import toast from "react-hot-toast";
import PropTypes from "prop-types";

const AdminContainer = styled.div`
  background-color: var(--color-grey-0);
  border: 1px solid var(--color-grey-200);
  border-radius: var(--border-radius-md);
  padding: 2.4rem;
`;

const StyledForm = styled(Form)`
  padding: 2.4rem 4rem;

  & h3 {
    margin-bottom: 2.4rem;
  }
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2.4rem;
`;

function CampaignStatsForm({ campaign, onCloseModal }) {
  const { editCampaign, isEditing } = useEditCampaign();
  const [dailyLeads, setDailyLeads] = useState(campaign.dailyResults || 0);
  const [dailyBudget, setDailyBudget] = useState(campaign.dailyBudget || 0);

  function handleSubmit(e) {
    e.preventDefault();

    editCampaign(
      {
        newCampaign: {
          ...campaign,
          dailyResults: Number(dailyLeads),
          dailyBudget: Number(dailyBudget),
        },
        id: campaign.id,
      },
      {
        onSuccess: () => {
          toast.success("Campaign stats updated successfully");
          onCloseModal?.();
        },
        onError: () => {
          toast.error("Could not update campaign stats");
        },
      }
    );
  }

  return (
    <StyledForm onSubmit={handleSubmit}>
      <h3>Update Stats for {campaign.campaignName}</h3>

      <FormGrid>
        <FormRowVertical label="Daily Budget">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={dailyBudget}
            onChange={(e) => setDailyBudget(e.target.value)}
            disabled={isEditing}
          />
        </FormRowVertical>

        <FormRowVertical label="Daily Leads">
          <Input
            type="number"
            min="0"
            value={dailyLeads}
            onChange={(e) => setDailyLeads(e.target.value)}
            disabled={isEditing}
          />
        </FormRowVertical>
      </FormGrid>

      <div
        style={{
          marginTop: "2.4rem",
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <Button
          type="reset"
          variant="secondary"
          onClick={onCloseModal}
          disabled={isEditing}
        >
          Cancel
        </Button>
        <Button style={{ marginLeft: "1.2rem" }} disabled={isEditing}>
          {isEditing ? "Updating..." : "Update Stats"}
        </Button>
      </div>
    </StyledForm>
  );
}

CampaignStatsForm.propTypes = {
  campaign: PropTypes.shape({
    id: PropTypes.string.isRequired,
    campaignName: PropTypes.string.isRequired,
    dailyResults: PropTypes.number,
    dailyBudget: PropTypes.number,
  }).isRequired,
  onCloseModal: PropTypes.func.isRequired,
};

function DailyCampaignStatsAdmin() {
  const { selectedUserId } = useAdminScope();
  const { data: campaigns, isPending } = useCampaigns({
    filterUserId: selectedUserId,
  });

  if (isPending) return <Spinner />;

  return (
    <AdminContainer>
      <Heading as="h2">Manage Daily Campaign Stats</Heading>
      <p style={{ marginBottom: "2.4rem", color: "var(--color-grey-500)" }}>
        Update the daily budget and leads for each campaign.
      </p>

      <Table columns="2fr 1fr 1fr 1fr 1fr">
        <Table.Header>
          <div>Campaign Name</div>
          <div>Status</div>
          <div>Daily Budget</div>
          <div>Daily Leads</div>
          <div>Actions</div>
        </Table.Header>
        <Table.Body
          data={campaigns}
          render={(campaign) => (
            <Table.Row key={campaign.id}>
              <div>{campaign.campaignName}</div>
              <div>{campaign.status}</div>
              <div>{formatCurrency(campaign.dailyBudget || 0)}</div>
              <div>{campaign.dailyResults || 0}</div>
              <Modal>
                <Modal.Open>
                  <Button>
                    <HiPencil />
                    Edit Stats
                  </Button>
                </Modal.Open>
                <Modal.Window>
                  {(onClose) => (
                    <CampaignStatsForm
                      campaign={campaign}
                      onCloseModal={onClose}
                    />
                  )}
                </Modal.Window>
              </Modal>
            </Table.Row>
          )}
        />
      </Table>
    </AdminContainer>
  );
}

export default DailyCampaignStatsAdmin;
