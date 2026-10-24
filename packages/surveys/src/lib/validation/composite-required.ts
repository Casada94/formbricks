import type { TFunction } from "i18next";
import type { TResponseDataValue } from "@formbricks/types/responses";
import type { TSurveyElement } from "@formbricks/types/surveys/elements";
import { TSurveyElementTypeEnum } from "@formbricks/types/surveys/elements";
import type { TValidationError } from "@formbricks/types/surveys/validation-rules";
import { ZAddressField, ZContactInfoField } from "@formbricks/types/surveys/validation-rules";
import { getLocalizedValue } from "@/lib/i18n";

interface TToggleField {
  show: boolean;
  required: boolean;
  orRequired?: boolean;
  placeholder: Parameters<typeof getLocalizedValue>[0];
}

/**
 * Strip trailing whitespace and colons from a field label.
 *
 * The label comes from the author's placeholder, which often already ends with a colon
 * ("Nombre:"), so a separator appended after it would otherwise render a double colon.
 */
export const stripTrailingLabelColon = (label: string): string => {
  let end = label.length;
  while (end > 0) {
    const char = label[end - 1];
    if (char !== ":" && char !== "：" && char.trim() !== "") break;
    end--;
  }
  return label.slice(0, end);
};

const textAt = (value: TResponseDataValue, index: number): string => {
  if (!Array.isArray(value) || index < 0 || index >= value.length) return "";
  const entry = value[index];
  return typeof entry === "string" ? entry.trim() : "";
};

const toggleFields = (element: TSurveyElement): TToggleField[] | null => {
  if (element.type === TSurveyElementTypeEnum.Address && "addressLine1" in element) {
    return ZAddressField.options.map((id) => element[id]);
  }

  if (element.type === TSurveyElementTypeEnum.ContactInfo && "firstName" in element) {
    return ZContactInfoField.options.map((id) => element[id]);
  }

  return null;
};

export interface TOrRequiredField {
  id: string;
  index: number;
  label: string;
}

/**
 * Shown fields the author marked One of. Hidden fields stay out of the group, so turning a
 * field off does not leave the respondent required to fill something they cannot see.
 */
export const shownOrRequiredFields = (element: TSurveyElement, languageCode: string): TOrRequiredField[] => {
  const fields = toggleFields(element);
  if (!fields) return [];

  const ids =
    element.type === TSurveyElementTypeEnum.Address ? ZAddressField.options : ZContactInfoField.options;

  return fields.flatMap((field, index) => {
    if (!field.show || !field.orRequired) return [];
    return [
      {
        id: ids[index],
        index,
        label: stripTrailingLabelColon(getLocalizedValue(field.placeholder, languageCode)),
      },
    ];
  });
};

/**
 * Joined labels of a One-of group of at least two shown fields. `null` when the question has no
 * such group, including when only one shown field is marked One of (that field is required alone).
 */
export const orRequiredGroupSummary = (element: TSurveyElement, languageCode: string): string | null => {
  const group = shownOrRequiredFields(element, languageCode);
  if (group.length < 2) return null;

  const names = group.map((field) => field.label).filter((label) => label !== "");
  return (names.length > 0 ? names : group.map((field) => field.id)).join(", ");
};

const groupHasValue = (group: TOrRequiredField[], value: TResponseDataValue): boolean =>
  group.some((field) => textAt(value, field.index) !== "");

/**
 * A One-of group fails only when every shown member is blank. Filling one member passes, and
 * filling several passes too. One marked field is not a group: the per-field required check covers it.
 */
export const validateOrRequiredGroup = (
  element: TSurveyElement,
  value: TResponseDataValue,
  languageCode: string,
  t: TFunction
): TValidationError | null => {
  const group = shownOrRequiredFields(element, languageCode);
  if (group.length < 2 || groupHasValue(group, value)) return null;

  return {
    ruleId: "required",
    ruleType: "minLength",
    message: t("errors.fill_in_at_least_one_of", { fields: orRequiredGroupSummary(element, languageCode) }),
  };
};
