import { describe, expect, test } from "vitest";
import { ZSurveyContactInfoElement } from "./elements";

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
});
