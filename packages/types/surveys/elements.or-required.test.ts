import { describe, expect, test } from "vitest";
import { ZSurveyContactInfoElement, ZToggleInputConfig, orRequiredGroupNumber } from "./elements";

describe("ZSurveyContactInfoElement", () => {
  test("keeps orRequired on a contact field and leaves it off when omitted", () => {
    const field = { show: true, required: false, placeholder: { default: "Field" } };
    const parsed = ZSurveyContactInfoElement.parse({
      id: "contact1",
      type: "contactInfo",
      headline: { default: "Contact" },
      required: true,
      firstName: field,
      lastName: field,
      email: { ...field, required: true, orRequired: true },
      phone: { ...field, required: true, orRequired: true },
      company: { ...field, show: false },
    });

    expect(parsed.email.orRequired).toBe(true);
    expect(parsed.phone.orRequired).toBe(true);
    expect(parsed.firstName.orRequired).toBeUndefined();
  });

  test("keeps an explicit One-of group and defaults a missing one", () => {
    const field = { show: true, required: true, placeholder: { default: "Field" } };
    const parsed = ZSurveyContactInfoElement.parse({
      id: "contact1",
      type: "contactInfo",
      headline: { default: "Contact" },
      required: true,
      firstName: field,
      lastName: field,
      email: { ...field, orRequired: true, orRequiredGroup: 2 },
      phone: { ...field, orRequired: true },
      company: { ...field, show: false },
    });

    expect(parsed.email.orRequiredGroup).toBe(2);
    expect(parsed.phone.orRequiredGroup).toBeUndefined();
    expect(orRequiredGroupNumber(parsed.phone)).toBe(1);
    expect(orRequiredGroupNumber({ orRequired: false, orRequiredGroup: 2 })).toBeUndefined();
    expect(orRequiredGroupNumber({ orRequired: true })).toBe(1);
  });

  test("rejects a One-of group outside 1 through 5", () => {
    const result = ZToggleInputConfig.safeParse({
      show: true,
      required: true,
      orRequired: true,
      orRequiredGroup: 6,
      placeholder: { default: "Email" },
    });

    expect(result.success).toBe(false);
  });
});
