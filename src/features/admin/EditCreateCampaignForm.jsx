import { useEffect } from "react";
import { useForm } from "react-hook-form";
import styled from "styled-components";

import GridBox from "../../ui/GridBox";
import Heading from "../../ui/Heading";
import FormRowVertical from "../../ui/FormRowVertical";
import Input from "../../ui/Input";
import { useCampaign } from "../campaigns/useCampaign";
import Button from "../../ui/Button";
import { useEditCampaign } from "../campaigns/useEditCampaign";
import SpinnerMini from "../../ui/SpinnerMini";

const FormContainer = styled.form`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  justify-content: center;
  align-items: center;

  gap: 1rem 5rem;
  padding: 2.4rem;
  background-color: var(--color-grey-100);
`;

const Column = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const StyledSelect = styled.select`
  font-size: 1.4rem;
  padding: 0.8rem 1.2rem;
  border: 1px solid;
  border-radius: var(--border-radius-sm);
  background-color: var(--color-grey-0);
  font-weight: 500;
  box-shadow: var(--shadow-sm);
`;

const ImageForm = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
`;

function EditCreateCampaignForm({ id }) {
  // Only fetch campaign if editing
  const { data: campaign, isPending } = useCampaign(id, {
    enabled: !!id,
  });
  const { isPending: isEditing, editCampaign } = useEditCampaign();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    if (!isPending && campaign && id) {
      reset({
        campaignName: campaign.campaignName ?? "",
        status: campaign.status ?? "Active",
        dailyBudget: campaign.dailyBudget ?? 0,
        results: campaign.results ?? 0,
        reaches: campaign.reaches ?? 0,
        impressions: campaign.impressions ?? 0,
        linkClicks: campaign.linkClicks ?? 0,
        clicks: campaign.clicks ?? 0,
        costPerResults: campaign.costPerResults ?? 0,
        cpm: 0,
        cpc: 0,
        ctr: 0,
        amountSpent: campaign.amountSpent ?? 0,
      });
    }
  }, [campaign, id, isPending, reset]);

  const onSubmit = (data) => {
    const finalData = {
      ...data,
      cpm:
        data.impressions > 0
          ? Number(((data.amountSpent / data.impressions) * 1000).toFixed(2))
          : 0,
      cpc:
        data.clicks > 0
          ? Number((data.amountSpent / data.clicks).toFixed(2))
          : 0,
      ctr:
        data.impressions > 0
          ? Number(((data.linkClicks / data.impressions) * 100).toFixed(2))
          : 0,
      amountSpent: data.results * data.costPerResults,
    };

    const image =
      typeof data.image === "string" ? data.image : data.image?.[0] ?? null;

    // If id is provided, update an existing campaign; otherwise, create a new campaign
    editCampaign(
      { newCampaign: { ...finalData, image }, id },
      { onSuccess: () => reset() }
    );
  };

  if (isPending && id) return <div>Loading...</div>;

  return (
    <GridBox>
      <Heading as="h2">{id ? "Edit Campaign" : "Create Campaign"}</Heading>
      <FormContainer onSubmit={handleSubmit(onSubmit)}>
        <Column>
          <FormRowVertical>
            <label>Campaign name</label>
            <Input
              {...register("campaignName", {
                required: "Campaign name is required",
                validate: {
                  // Example: ensure it's a non-empty string
                  isString: (value) =>
                    typeof value === "string" && value.trim() !== ""
                      ? true
                      : "Campaign name must be text",
                },
              })}
            />
            {errors.campaignName && (
              <span style={{ color: "red" }}>
                {errors.campaignName.message}
              </span>
            )}
          </FormRowVertical>

          <FormRowVertical>
            <label>Status</label>
            <StyledSelect
              {...register("status", {
                required: "Status is required",
                validate: (value) =>
                  ["Active", "Paused", "Learning", "Inactive"].includes(value)
                    ? true
                    : "Invalid status",
              })}
            >
              <option value="Active">Active</option>
              <option value="Paused">Paused</option>
              <option value="Learning">Learning</option>
              <option value="Inactive">Inactive</option>
            </StyledSelect>
            {errors.status && (
              <span style={{ color: "red" }}>{errors.status.message}</span>
            )}
          </FormRowVertical>

          <FormRowVertical>
            <label>Daily Budget</label>
            <Input
              type="number"
              {...register("dailyBudget", {
                required: "Daily Budget is required",
                valueAsNumber: true,
                validate: {
                  positive: (value) =>
                    value >= 0 || "Daily Budget must be a positive number",
                },
              })}
            />
            {errors.dailyBudget && (
              <span style={{ color: "red" }}>{errors.dailyBudget.message}</span>
            )}
          </FormRowVertical>

          <FormRowVertical>
            <label>Results</label>
            <Input
              type="number"
              {...register("results", {
                valueAsNumber: true,
                validate: {
                  nonNegative: (value) => value >= 0 || "Results must be >= 0",
                },
              })}
            />
            {errors.results && (
              <span style={{ color: "red" }}>{errors.results.message}</span>
            )}
          </FormRowVertical>

          <FormRowVertical>
            <label>Reaches</label>
            <Input
              type="number"
              {...register("reaches", {
                valueAsNumber: true,
                validate: {
                  nonNegative: (value) => value >= 0 || "Reaches must be >= 0",
                },
              })}
            />
            {errors.reaches && (
              <span style={{ color: "red" }}>{errors.reaches.message}</span>
            )}
          </FormRowVertical>
          <FormRowVertical>
            <label>Impressions</label>
            <Input
              type="number"
              {...register("impressions", {
                valueAsNumber: true,
                validate: {
                  nonNegative: (value) =>
                    value >= 0 || "Impressions must be >= 0",
                },
              })}
            />
            {errors.impressions && (
              <span style={{ color: "red" }}>{errors.impressions.message}</span>
            )}
          </FormRowVertical>
          <FormRowVertical>
            <label>Link Clicks</label>
            <Input
              type="number"
              {...register("linkClicks", {
                valueAsNumber: true,
                validate: {
                  nonNegative: (value) =>
                    value >= 0 || "Link Clicks must be >= 0",
                },
              })}
            />
            {errors.linkClicks && (
              <span style={{ color: "red" }}>{errors.linkClicks.message}</span>
            )}
          </FormRowVertical>
        </Column>

        <Column>
          {/* Clicks */}
          <FormRowVertical>
            <label>Clicks</label>
            <Input
              type="number"
              {...register("clicks", {
                valueAsNumber: true,
                validate: {
                  nonNegative: (value) => value >= 0 || "Clicks must be >= 0",
                },
              })}
            />
            {errors.clicks && (
              <span style={{ color: "red" }}>{errors.clicks.message}</span>
            )}
          </FormRowVertical>

          {/* Cost Per Results */}
          <FormRowVertical>
            <label>Cost per results</label>
            <Input
              type="number"
              step="any"
              {...register("costPerResults", {
                valueAsNumber: true,
                validate: {
                  nonNegative: (value) => value >= 0 || "Cost must be >= 0",
                },
              })}
            />
            {errors.costPerResults && (
              <span style={{ color: "red" }}>
                {errors.costPerResults.message}
              </span>
            )}
          </FormRowVertical>

          {/* Image */}
          <FormRowVertical>
            <label>Image</label>
            <Input
              type="file"
              accept="image/*"
              {...register("image", {
                // If you want to enforce an image file, you can do a custom validate
                validate: {
                  isImage: (files) => {
                    if (!files || !files[0]) return true; // It's optional
                    const file = files[0];
                    const allowedTypes = [
                      "image/jpeg",
                      "image/png",
                      "image/gif",
                    ];
                    return allowedTypes.includes(file.type)
                      ? true
                      : "Only JPG, PNG, or GIF files are allowed.";
                  },
                },
              })}
            />
            {errors.image && (
              <span style={{ color: "red" }}>{errors.image.message}</span>
            )}
            <Column>
              <ImageForm>
                {campaign?.image && (
                  <img
                    src={campaign.image}
                    alt="campaign"
                    style={{
                      width: "200px",
                      marginTop: "1rem",
                    }}
                  />
                )}
              </ImageForm>
            </Column>
          </FormRowVertical>

          {/* Submit Button */}
          <Button type="submit">
            {isEditing ? <SpinnerMini /> : "Submit"}
          </Button>
        </Column>
      </FormContainer>
    </GridBox>
  );
}

export default EditCreateCampaignForm;
