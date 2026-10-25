import { type TOrRequiredGroup, orRequiredGroupNumber } from "@formbricks/types/surveys/elements";

export type TFieldRequirement = "optional" | "required" | "oneOf";

interface TRequirementFlags {
  required: boolean;
  orRequired?: boolean;
  orRequiredGroup?: number;
}

/**
 * `required` stays true for a One-of field so the question is still required when the group is
 * the only requirement. `orRequired` is what joins the field to the group.
 */
export const fieldRequirement = (field: TRequirementFlags): TFieldRequirement => {
  if (field.orRequired) return "oneOf";
  return field.required ? "required" : "optional";
};

/** The field's One-of group, or undefined when the field is not One of. Omitted number is group 1. */
export const fieldRequirementGroup = (field: TRequirementFlags): TOrRequiredGroup | undefined =>
  orRequiredGroupNumber(field);

export const requirementAttributes = (
  mode: TFieldRequirement,
  group?: TOrRequiredGroup
): { required: boolean; orRequired: boolean; orRequiredGroup?: TOrRequiredGroup } => {
  if (mode === "oneOf") return { required: true, orRequired: true, orRequiredGroup: group ?? 1 };
  if (mode === "required") return { required: true, orRequired: false };
  return { required: false, orRequired: false };
};

export const compositeElementIsRequired = (
  fields: { show: boolean; required: boolean; orRequired?: boolean }[]
): boolean => fields.some((field) => field.show && (field.required || field.orRequired === true));
