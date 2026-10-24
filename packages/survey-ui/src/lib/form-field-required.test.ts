import { describe, expect, test } from "vitest";
import { type TRequirementField, isFormFieldRequired } from "./form-field-required";

const email: TRequirementField = { required: true, orRequired: true, show: true };
const phone: TRequirementField = { required: true, orRequired: true, show: true };
const company: TRequirementField = { required: false, show: true };

describe("isFormFieldRequired", () => {
  test("a One-of group of two or more fields is not required input by input", () => {
    const fields = [email, phone, company];

    expect(isFormFieldRequired(email, fields, true)).toBe(false);
    expect(isFormFieldRequired(phone, fields, true)).toBe(false);
    expect(isFormFieldRequired(company, fields, true)).toBe(false);
  });

  test("a field required on its own stays required next to a One-of group", () => {
    const firstName: TRequirementField = { required: true, show: true };
    const fields = [firstName, email, phone];

    expect(isFormFieldRequired(firstName, fields, true)).toBe(true);
    expect(isFormFieldRequired(email, fields, true)).toBe(false);
  });

  test("one shown One-of field is required on its own", () => {
    const hiddenPhone: TRequirementField = { required: true, orRequired: true, show: false };
    const fields = [email, hiddenPhone];

    expect(isFormFieldRequired(email, fields, true)).toBe(true);
  });

  test("a required question with only optional fields requires each visible field", () => {
    const fields = [company, { required: false, show: true }];

    expect(isFormFieldRequired(company, fields, true)).toBe(true);
    expect(isFormFieldRequired(company, fields, false)).toBe(false);
  });

  test("a One-of group does not turn the optional fields into required inputs", () => {
    const fields = [email, phone, company];

    expect(isFormFieldRequired(company, fields, true)).toBe(false);
  });
});
