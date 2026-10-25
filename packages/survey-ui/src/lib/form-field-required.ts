export interface TRequirementField {
  required?: boolean;
  /** Member of a One-of group: at least one shown member must be filled. */
  orRequired?: boolean;
  /** One-of group number. Omitted on a One-of field means group 1. */
  orRequiredGroup?: number;
  show?: boolean;
}

/**
 * Same rule as `orRequiredGroupNumber` in `@formbricks/types`. This package does not depend on it.
 * A One-of field with no group number is group 1. Any other field has no group.
 */
export const orRequiredGroupNumber = (field: {
  orRequired?: boolean;
  orRequiredGroup?: number;
}): 1 | 2 | 3 | 4 | 5 | undefined => {
  if (!field.orRequired) return undefined;
  const group = field.orRequiredGroup;
  if (group === 1 || group === 2 || group === 3 || group === 4 || group === 5) return group;
  return 1;
};

/**
 * Group number for a shown field that shares a One-of group with at least one other shown field.
 * A lone One-of field, a field required on its own, and an optional field have no group marker.
 */
export const realOrRequiredGroup = (
  field: TRequirementField,
  fields: readonly TRequirementField[]
): 1 | 2 | 3 | 4 | 5 | undefined => {
  const group = orRequiredGroupNumber(field);
  if (group === undefined) return undefined;

  const shownInGroup = fields.filter(
    (candidate) => candidate.show !== false && orRequiredGroupNumber(candidate) === group
  ).length;

  return shownInGroup >= 2 ? group : undefined;
};

/**
 * Whether one input should carry the HTML `required` attribute and a plain trailing asterisk.
 *
 * A One-of group of two or more shown fields is required as a group, so none of those inputs is
 * required on its own. Those labels carry a superscript `*N` from `realOrRequiredGroup` instead.
 * Fields in another group do not count. A single shown One-of field is required on its own. When
 * the question is required and every visible field is optional, each visible field is required.
 */
export const isFormFieldRequired = (
  field: TRequirementField,
  fields: readonly TRequirementField[],
  elementRequired: boolean
): boolean => {
  const visible = fields.filter((candidate) => candidate.show !== false);

  if (realOrRequiredGroup(field, fields) !== undefined) return false;

  if (field.required || field.orRequired) {
    return true;
  }

  const allOptional = visible.every((candidate) => !candidate.required && !candidate.orRequired);
  return allOptional && elementRequired;
};
