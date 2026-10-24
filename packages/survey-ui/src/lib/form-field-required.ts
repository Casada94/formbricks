export interface TRequirementField {
  required?: boolean;
  /** Member of a One-of group: at least one shown member must be filled. */
  orRequired?: boolean;
  show?: boolean;
}

/**
 * Whether one input should carry the HTML `required` attribute and its asterisk.
 *
 * A One-of group of two or more shown fields is required as a group, so none of those inputs is
 * required on its own. A single shown One-of field is required on its own. When the question is
 * required and every visible field is optional, each visible field is required.
 */
export const isFormFieldRequired = (
  field: TRequirementField,
  fields: readonly TRequirementField[],
  elementRequired: boolean
): boolean => {
  const visible = fields.filter((candidate) => candidate.show !== false);
  const orCount = visible.filter((candidate) => candidate.orRequired).length;

  if (field.orRequired && orCount >= 2) {
    return false;
  }

  if (field.required || field.orRequired) {
    return true;
  }

  const allOptional = visible.every((candidate) => !candidate.required && !candidate.orRequired);
  return allOptional && elementRequired;
};
