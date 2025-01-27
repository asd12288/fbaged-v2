import { useState } from "react";
import CampaignList from "../campaigns/fullCampaigns/CampaignList";
import Button from "../../ui/Button";
import EditCreateCampaignForm from "./EditCreateCampaignForm";
import { useCampaigns } from "../campaigns/useCampaigns";
import Heading from "../../ui/Heading";
import styled from "styled-components";

const ControlButtons = styled.div`
  display: flex;
  gap: 3rem;
  justify-content: center;
`;

function CampaignsAdminLayout() {
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const { data: campaigns } = useCampaigns();

  const handleEditClick = () => {
    setIsEditing((prev) => !prev);
    if (isAdding) setIsAdding(false);
  };

  const handleAddClick = () => {
    setIsAdding((prev) => !prev);
    if (isEditing) setIsEditing(false);
  };

  const handleCampaignChange = (event) => {
    setSelectedCampaignId(event.target.value);
  };

  return (
    <>
      <Heading as="h2">Campaigns</Heading>
      <CampaignList />
      <ControlButtons>
        <Button onClick={handleEditClick}>Edit</Button>
        <Button onClick={handleAddClick}>Add</Button>
        {isEditing && (
          <select onChange={handleCampaignChange}>
            <option value="" selected disabled>
              Select a campaign
            </option>
            {campaigns?.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.campaignName}
              </option>
            ))}
          </select>
        )}
      </ControlButtons>
      {isEditing && <EditCreateCampaignForm id={selectedCampaignId} />}
      {isAdding && <EditCreateCampaignForm />}
    </>
  );
}

export default CampaignsAdminLayout;
