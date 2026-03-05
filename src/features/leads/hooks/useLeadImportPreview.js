import { useMutation } from "@tanstack/react-query";
import { previewLeadImport } from "../../../services/leadsApi";

export function useLeadImportPreview() {
  const { mutateAsync: previewImport, isPending: isPreviewing, error } =
    useMutation({
      mutationFn: previewLeadImport,
    });

  return { previewImport, isPreviewing, error };
}
