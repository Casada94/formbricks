import type { TFunction } from "i18next";
import { describe, expect, test } from "vitest";
import { TSurveyElementTypeEnum } from "@formbricks/types/surveys/elements";
import type {
  TOrRequiredGroup,
  TSurveyAddressElement,
  TSurveyContactInfoElement,
} from "@formbricks/types/surveys/elements";
import { orRequiredGroupSummaries, validateOrRequiredGroup } from "./composite-required";

const t = ((key: string, params?: { fields?: string }) =>
  params?.fields ? `${key}:${params.fields}` : key) as TFunction;

const field = (placeholder: string, orRequired = false, show = true, orRequiredGroup?: TOrRequiredGroup) => ({
  show,
  required: orRequired,
  orRequired,
  ...(orRequiredGroup === undefined ? {} : { orRequiredGroup }),
  placeholder: { default: placeholder },
});

const contact = (overrides: Partial<TSurveyContactInfoElement> = {}): TSurveyContactInfoElement =>
  ({
    id: "contact1",
    type: TSurveyElementTypeEnum.ContactInfo,
    headline: { default: "Contact" },
    required: true,
    firstName: field("First name"),
    lastName: field("Last name"),
    email: field("Email:", true),
    phone: field("Phone", true),
    company: field("Company"),
    ...overrides,
  }) as TSurveyContactInfoElement;

describe("or required group", () => {
  test("names the shown One-of fields and drops a trailing colon", () => {
    expect(orRequiredGroupSummaries(contact(), "default")).toEqual([{ group: 1, summary: "Email, Phone" }]);
  });

  test("a single shown One-of field is not a group", () => {
    const element = contact({ phone: field("Phone") });

    expect(orRequiredGroupSummaries(element, "default")).toEqual([]);
    expect(validateOrRequiredGroup(element, ["", "", "", "", ""], "default", t)).toBeNull();
  });

  test("fails when every field in the group is blank, including whitespace", () => {
    const result = validateOrRequiredGroup(contact(), ["", "", "  ", " ", "Acme"], "default", t);

    expect(result).toEqual({
      ruleId: "required",
      ruleType: "minLength",
      message: "errors.fill_in_at_least_one_of:Email, Phone",
    });
  });

  test("passes when one field in the group is filled", () => {
    expect(validateOrRequiredGroup(contact(), ["", "", "", "+1 555 0100", ""], "default", t)).toBeNull();
  });

  test("passes when every field in the group is filled", () => {
    expect(
      validateOrRequiredGroup(contact(), ["", "", "ada@example.com", "+1 555 0100", ""], "default", t)
    ).toBeNull();
  });

  test("ignores a hidden One-of field", () => {
    const element = contact({ email: field("Email", true, false) });

    expect(orRequiredGroupSummaries(element, "default")).toEqual([]);
  });

  test("fails an address group until one of its fields is filled", () => {
    const element = {
      id: "address1",
      type: TSurveyElementTypeEnum.Address,
      headline: { default: "Address" },
      required: true,
      addressLine1: field("Street", true),
      addressLine2: field("Apt"),
      city: field("City", true),
      state: field("State"),
      zip: field("Zip", true),
      country: field("Country"),
    } as TSurveyAddressElement;

    expect(orRequiredGroupSummaries(element, "default")).toEqual([
      { group: 1, summary: "Street, City, Zip" },
    ]);
    expect(validateOrRequiredGroup(element, ["", "", "", "", "", ""], "default", t)?.message).toBe(
      "errors.fill_in_at_least_one_of:Street, City, Zip"
    );
    expect(validateOrRequiredGroup(element, ["", "", "Berlin", "", "", ""], "default", t)).toBeNull();
  });

  test("an empty response fails the group", () => {
    expect(validateOrRequiredGroup(contact(), undefined, "default", t)?.ruleId).toBe("required");
  });

  test("fails each blank group and names group 1 first", () => {
    const element = contact({
      firstName: field("First name", true, true, 2),
      lastName: field("Last name", true, true, 2),
      email: field("Email:", true, true, 1),
      phone: field("Phone", true, true, 1),
    });

    expect(validateOrRequiredGroup(element, ["", "", "", "555", ""], "default", t)?.message).toBe(
      "errors.fill_in_at_least_one_of:First name, Last name"
    );
    expect(validateOrRequiredGroup(element, ["Ada", "", "", "555", ""], "default", t)).toBeNull();
    expect(validateOrRequiredGroup(element, ["", "", "", "", ""], "default", t)?.message).toBe(
      "errors.fill_in_at_least_one_of:Email, Phone\nerrors.fill_in_at_least_one_of:First name, Last name"
    );
  });

  test("one field in each group is not a group", () => {
    const element = contact({
      email: field("Email", true, true, 1),
      phone: field("Phone", true, true, 2),
    });

    expect(orRequiredGroupSummaries(element, "default")).toEqual([]);
    expect(validateOrRequiredGroup(element, ["", "", "", "", ""], "default", t)).toBeNull();
  });

  test("a hidden field does not complete another group's pair", () => {
    const element = contact({
      phone: field("Phone", true, false, 2),
      firstName: field("First name", true, true, 2),
    });

    expect(orRequiredGroupSummaries(element, "default")).toEqual([]);
  });

  test("a missing group number shares group 1 with an explicit group 1", () => {
    const element = contact({
      email: field("Email:", true),
      phone: field("Phone", true, true, 1),
    });

    expect(orRequiredGroupSummaries(element, "default")).toEqual([{ group: 1, summary: "Email, Phone" }]);
  });
});
