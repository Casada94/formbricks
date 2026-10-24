import type { TFunction } from "i18next";
import { describe, expect, test } from "vitest";
import { TSurveyElementTypeEnum } from "@formbricks/types/surveys/elements";
import type { TSurveyAddressElement, TSurveyContactInfoElement } from "@formbricks/types/surveys/elements";
import { orRequiredGroupSummary, validateOrRequiredGroup } from "./composite-required";

const t = ((key: string, params?: { fields?: string }) =>
  params?.fields ? `${key}:${params.fields}` : key) as TFunction;

const field = (placeholder: string, orRequired = false, show = true) => ({
  show,
  required: orRequired,
  orRequired,
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
    expect(orRequiredGroupSummary(contact(), "default")).toBe("Email, Phone");
  });

  test("a single shown One-of field is not a group", () => {
    const element = contact({ phone: field("Phone") });

    expect(orRequiredGroupSummary(element, "default")).toBeNull();
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

    expect(orRequiredGroupSummary(element, "default")).toBeNull();
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

    expect(orRequiredGroupSummary(element, "default")).toBe("Street, City, Zip");
    expect(validateOrRequiredGroup(element, ["", "", "", "", "", ""], "default", t)?.message).toBe(
      "errors.fill_in_at_least_one_of:Street, City, Zip"
    );
    expect(validateOrRequiredGroup(element, ["", "", "Berlin", "", "", ""], "default", t)).toBeNull();
  });

  test("an empty response fails the group", () => {
    expect(validateOrRequiredGroup(contact(), undefined, "default", t)?.ruleId).toBe("required");
  });
});
