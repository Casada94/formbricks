import type { TFunction } from "i18next";
import type { TResponseDataValue } from "@formbricks/types/responses";
import type { TOrRequiredGroup, TSurveyElement } from "@formbricks/types/surveys/elements";
import { TSurveyElementTypeEnum, orRequiredGroupNumber } from "@formbricks/types/surveys/elements";
import type { TValidationError } from "@formbricks/types/surveys/validation-rules";
import { ZAddressField, ZContactInfoField } from "@formbricks/types/surveys/validation-rules";
import { getLocalizedValue } from "@/lib/i18n";

interface TToggleField {
  show: boolean;
  required: boolean;
  orRequired?: boolean;
  orRequiredGroup?: number;
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
  group: TOrRequiredGroup;
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
    const group = orRequiredGroupNumber(field);
    if (group === undefined) return [];
    return [
      {
        id: ids[index],
        index,
        label: stripTrailingLabelColon(getLocalizedValue(field.placeholder, languageCode)),
        group,
      },
    ];
  });
};

export interface TOrRequiredGroupSummary {
  group: TOrRequiredGroup;
  summary: string;
}

/**
 * One summary per One-of group of at least two shown fields, ordered by group number.
 * A group of one is omitted: that field is required on its own.
 */
export const orRequiredGroupSummaries = (
  element: TSurveyElement,
  languageCode: string
): TOrRequiredGroupSummary[] => {
  const buckets = new Map<TOrRequiredGroup, TOrRequiredField[]>();
  for (const field of shownOrRequiredFields(element, languageCode)) {
    const bucket = buckets.get(field.group) ?? [];
    bucket.push(field);
    buckets.set(field.group, bucket);
  }

  return [...buckets.entries()]
    .filter(([, bucket]) => bucket.length >= 2)
    .sort(([left], [right]) => left - right)
    .map(([group, bucket]) => {
      const names = bucket.map((field) => field.label).filter((label) => label !== "");
      return {
        group,
        summary: (names.length > 0 ? names : bucket.map((field) => field.id)).join(", "),
      };
    });
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
  const summaries = orRequiredGroupSummaries(element, languageCode);
  if (summaries.length === 0) return null;

  const fields = shownOrRequiredFields(element, languageCode);
  const failing = summaries.filter((summary) => {
    const members = fields.filter((field) => field.group === summary.group);
    return !groupHasValue(members, value);
  });
  if (failing.length === 0) return null;

  // One error, one sentence per blank group. A newline puts each sentence on its own line.
  // Two errors would hide every group after the first: the survey shows only the first message.
  return {
    ruleId: "required",
    ruleType: "minLength",
    message: failing
      .map((group) => t("errors.fill_in_at_least_one_of", { fields: group.summary }))
      .join("\n"),
  };
};
