/* eslint-disable react/prop-types */
import { useEffect, useState, useContext } from "react";
import { useForm } from "react-hook-form";
import styled from "styled-components";
import Heading from "../../ui/Heading";
import FormRowVertical from "../../ui/FormRowVertical";
import Input from "../../ui/Input";
import { useCampaign } from "../campaigns/useCampaign";
import Button from "../../ui/Button";
import { useEditCampaign } from "../campaigns/useEditCampaign";
import SpinnerMini from "../../ui/SpinnerMini";
import Spinner from "../../ui/Spinner";
import toast from "react-hot-toast";
import { HiCurrencyDollar, HiPhotograph, HiUsers, HiEye } from "react-icons/hi";
import { ModalContext } from "../../ui/Modal";
import { useAdminScope } from "./AdminScopeContext";

const FormContainer = styled.form`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2.4rem 5rem;
  padding: 2.4rem;
  background-color: var(--color-grey-0);
  border-radius: var(--border-radius-md);
`;

const Column = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.6rem;
`;

const StyledSelect = styled.select`
  font-size: 1.4rem;
  padding: 0.8rem 1.2rem;
  border: 1px solid var(--color-grey-300);
  border-radius: var(--border-radius-sm);
  background-color: var(--color-grey-0);
  font-weight: 500;
  box-shadow: var(--shadow-sm);
  width: 100%;
`;

const ImagePreviewContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  margin-top: 1rem;
  width: 100%;
  background-color: var(--color-grey-0);
  border-radius: var(--border-radius-sm);
  border: 1px dashed var(--color-grey-300);
  padding: 1.6rem;
`;

const ImagePreview = styled.img`
  max-width: 100%;
  height: auto;
  border-radius: var(--border-radius-sm);
  object-fit: cover;
  box-shadow: var(--shadow-sm);
  max-height: 20rem;
`;

const PlaceholderImage = styled.div`
  width: 100%;
  height: 15rem;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: var(--color-grey-100);
  border-radius: var(--border-radius-sm);
  color: var(--color-grey-500);

  svg {
    width: 4rem;
    height: 4rem;
  }
`;

const ErrorMessage = styled.p`
  color: var(--color-red-700);
  font-size: 1.2rem;
  margin-top: 0.5rem;
`;

const InputGroup = styled.div`
  position: relative;

  svg {
    position: absolute;
    top: 50%;
    left: 1rem;
    transform: translateY(-50%);
    color: var(--color-grey-500);
    width: 2rem;
    height: 2rem;
  }
`;

const IconInput = styled(Input)`
  padding-left: 3rem;
`;

const SuccessMessage = styled.div`
  background-color: var(--color-green-100);
  color: var(--color-green-700);
  padding: 1.2rem;
  border-radius: var(--border-radius-sm);
  margin-bottom: 1.6rem;
  font-weight: 500;
  grid-column: 1 / -1;
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 1.2rem;
  grid-column: span 2;
  margin-top: 1.6rem;
`;

function EditCreateCampaignForm({ id }) {
  const [showSuccess, setShowSuccess] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Get access to modal close function if in a modal
  const modalContext = useContext(ModalContext);
  const closeModal = modalContext?.close;

  // Only fetch campaign if editing
  const { data: campaign, isPending: isLoadingCampaign } = useCampaign(id, {
    enabled: !!id,
  });
  const { isPending: isEditing, editCampaign } = useEditCampaign();
  const { selectedUserId } = useAdminScope();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm();

  // Watch the file input for previews
  const imageFile = watch("image");

  // Create a preview URL when a file is selected
  useEffect(() => {
    if (imageFile?.[0] instanceof File) {
      const url = URL.createObjectURL(imageFile[0]);
      setPreviewUrl(url);

      // Clean up the URL when the component unmounts or when the file changes
      return () => URL.revokeObjectURL(url);
    }
  }, [imageFile]);

  useEffect(() => {
    if (!isLoadingCampaign && campaign && id) {
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
        amountSpent: campaign.amountSpent ?? 0,
        dailyResults: campaign.dailyResults ?? 0,
      });

      // Set preview to the existing campaign image
      if (campaign.image) setPreviewUrl(campaign.image);
    }
  }, [campaign, id, isLoadingCampaign, reset]);

  const onSubmit = (data) => {
    // Calculate derived metrics
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

    // Handle image files appropriately
    const image =
      typeof data.image === "string" ? data.image : data.image?.[0] ?? null;

    // If id is provided, update existing campaign; otherwise, create a new one
    if (!id && !selectedUserId) {
      toast.error("Select a user first");
      return;
    }

    const payload = !id
      ? { ...finalData, image, user_id: selectedUserId }
      : { ...finalData, image };

    editCampaign(
      { newCampaign: payload, id },
      {
        onSuccess: () => {
          toast.success(
            id
              ? "Campaign updated successfully"
              : "Campaign created successfully"
          );
          setShowSuccess(true);
          if (!id) {
            reset();
            setPreviewUrl(null);
          }

          // Close modal if in a modal
          if (closeModal) {
            setTimeout(() => {
              closeModal();
            }, 1500);
          }
        },
        onError: (error) => {
          toast.error(error.message || "An error occurred");
        },
      }
    );
  };

  if (isLoadingCampaign && id) return <Spinner />;

  return (
    <>
      <Heading as="h2">{id ? "Edit Campaign" : "Create Campaign"}</Heading>
      <FormContainer onSubmit={handleSubmit(onSubmit)}>
        {showSuccess && (
          <SuccessMessage>
            Campaign {id ? "updated" : "created"} successfully!
          </SuccessMessage>
        )}

        <Column>
          <FormRowVertical>
            <label htmlFor="campaignName">Campaign Name</label>
            <Input
              id="campaignName"
              {...register("campaignName", {
                required: "Campaign name is required",
              })}
              disabled={isEditing}
            />
            {errors.campaignName && (
              <ErrorMessage>{errors.campaignName.message}</ErrorMessage>
            )}
          </FormRowVertical>

          <FormRowVertical>
            <label htmlFor="status">Status</label>
            <StyledSelect
              id="status"
              {...register("status", {
                required: "Status is required",
              })}
              disabled={isEditing}
            >
              <option value="Active">Active</option>
              <option value="Paused">Paused</option>
              <option value="Learning">Learning</option>
              <option value="Canceled">Canceled</option>
            </StyledSelect>
            {errors.status && (
              <ErrorMessage>{errors.status.message}</ErrorMessage>
            )}
          </FormRowVertical>

          <FormRowVertical>
            <label htmlFor="dailyBudget">Daily Budget</label>
            <InputGroup>
              <HiCurrencyDollar />
              <IconInput
                id="dailyBudget"
                type="number"
                step="0.01"
                min="0"
                {...register("dailyBudget", {
                  required: "Daily Budget is required",
                  min: {
                    value: 0,
                    message: "Budget must be positive",
                  },
                  valueAsNumber: true,
                })}
                disabled={isEditing}
              />
            </InputGroup>
            {errors.dailyBudget && (
              <ErrorMessage>{errors.dailyBudget.message}</ErrorMessage>
            )}
          </FormRowVertical>

          <FormRowVertical>
            <label htmlFor="dailyResults">Daily Results</label>
            <Input
              id="dailyResults"
              type="number"
              min="0"
              {...register("dailyResults", {
                valueAsNumber: true,
                min: 0,
              })}
              disabled={isEditing}
            />
            {errors.dailyResults && (
              <ErrorMessage>{errors.dailyResults.message}</ErrorMessage>
            )}
          </FormRowVertical>

          <FormRowVertical>
            <label htmlFor="results">Total Results</label>
            <Input
              id="results"
              type="number"
              min="0"
              {...register("results", {
                valueAsNumber: true,
                min: 0,
              })}
              disabled={isEditing}
            />
            {errors.results && (
              <ErrorMessage>{errors.results.message}</ErrorMessage>
            )}
          </FormRowVertical>

          <FormRowVertical>
            <label htmlFor="reaches">Reaches</label>
            <InputGroup>
              <HiUsers />
              <IconInput
                id="reaches"
                type="number"
                min="0"
                {...register("reaches", {
                  valueAsNumber: true,
                  min: 0,
                })}
                disabled={isEditing}
              />
            </InputGroup>
            {errors.reaches && (
              <ErrorMessage>{errors.reaches.message}</ErrorMessage>
            )}
          </FormRowVertical>

          <FormRowVertical>
            <label htmlFor="impressions">Impressions</label>
            <InputGroup>
              <HiEye />
              <IconInput
                id="impressions"
                type="number"
                min="0"
                {...register("impressions", {
                  valueAsNumber: true,
                  min: 0,
                })}
                disabled={isEditing}
              />
            </InputGroup>
            {errors.impressions && (
              <ErrorMessage>{errors.impressions.message}</ErrorMessage>
            )}
          </FormRowVertical>
        </Column>

        <Column>
          <FormRowVertical>
            <label htmlFor="linkClicks">Link Clicks</label>
            <Input
              id="linkClicks"
              type="number"
              min="0"
              {...register("linkClicks", {
                valueAsNumber: true,
                min: 0,
              })}
              disabled={isEditing}
            />
            {errors.linkClicks && (
              <ErrorMessage>{errors.linkClicks.message}</ErrorMessage>
            )}
          </FormRowVertical>

          <FormRowVertical>
            <label htmlFor="clicks">Clicks</label>
            <Input
              id="clicks"
              type="number"
              min="0"
              {...register("clicks", {
                valueAsNumber: true,
                min: 0,
              })}
              disabled={isEditing}
            />
            {errors.clicks && (
              <ErrorMessage>{errors.clicks.message}</ErrorMessage>
            )}
          </FormRowVertical>

          <FormRowVertical>
            <label htmlFor="costPerResults">Cost per Result</label>
            <InputGroup>
              <HiCurrencyDollar />
              <IconInput
                id="costPerResults"
                type="number"
                step="0.01"
                min="0"
                {...register("costPerResults", {
                  valueAsNumber: true,
                  min: 0,
                })}
                disabled={isEditing}
              />
            </InputGroup>
            {errors.costPerResults && (
              <ErrorMessage>{errors.costPerResults.message}</ErrorMessage>
            )}
          </FormRowVertical>

          <FormRowVertical>
            <label htmlFor="image">Campaign Image</label>
            <InputGroup>
              <HiPhotograph />
              <IconInput
                id="image"
                type="file"
                accept="image/*"
                {...register("image", {
                  validate: {
                    isImage: (files) => {
                      if (!files || !files[0] || id) return true; // Optional if editing
                      const file = files[0];
                      const allowedTypes = [
                        "image/jpeg",
                        "image/png",
                        "image/gif",
                        "image/webp",
                      ];
                      return allowedTypes.includes(file.type)
                        ? true
                        : "Please upload a valid image (JPEG, PNG, GIF, or WebP)";
                    },
                    fileSize: (files) => {
                      if (!files || !files[0]) return true;
                      const maxSize = 5 * 1024 * 1024; // 5MB
                      return files[0].size <= maxSize
                        ? true
                        : "Image must be less than 5MB";
                    },
                  },
                })}
              />
            </InputGroup>
            {errors.image && (
              <ErrorMessage>{errors.image.message}</ErrorMessage>
            )}

            <ImagePreviewContainer>
              {previewUrl ? (
                <ImagePreview src={previewUrl} alt="Campaign preview" />
              ) : (
                <PlaceholderImage>
                  <HiPhotograph />
                </PlaceholderImage>
              )}
            </ImagePreviewContainer>
          </FormRowVertical>

          <ButtonContainer>
            {closeModal && (
              <Button type="button" variant="secondary" onClick={closeModal}>
                Cancel
              </Button>
            )}

            <Button type="submit" disabled={isEditing}>
              {isEditing ? (
                <SpinnerMini />
              ) : id ? (
                "Update Campaign"
              ) : (
                "Create Campaign"
              )}
            </Button>
          </ButtonContainer>
        </Column>
      </FormContainer>
    </>
  );
}

export default EditCreateCampaignForm;
