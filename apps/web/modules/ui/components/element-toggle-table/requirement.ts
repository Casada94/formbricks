export type TFieldRequirement = "optional" | "required" | "oneOf";

interface TRequirementFlags {
  required: boolean;
  orRequired?: boolean;
}

/**
 * `required` stays true for a One-of field so the question is still required when the group is
 * the only requirement. `orRequired` is what joins the field to the group.
 */
export const fieldRequirement = (field: TRequirementFlags): TFieldRequirement => {
  if (field.orRequired) return "oneOf";
  return field.required ? "required" : "optional";
};

export const requirementAttributes = (
  mode: TFieldRequirement
): { required: boolean; orRequired: boolean } => {
  if (mode === "oneOf") return { required: true, orRequired: true };
  if (mode === "required") return { required: true, orRequired: false };
  return { required: false, orRequired: false };
};

export const compositeElementIsRequired = (
  fields: { show: boolean; required: boolean; orRequired?: boolean }[]
): boolean => fields.some((field) => field.show && (field.required || field.orRequired === true));
