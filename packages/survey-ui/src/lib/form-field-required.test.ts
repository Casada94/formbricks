import { describe, expect, test } from "vitest";
import { type TRequirementField, isFormFieldRequired, realOrRequiredGroup } from "./form-field-required";

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

  test("a One-of field in another group does not count toward this group", () => {
    const companyOneOf: TRequirementField = {
      required: true,
      orRequired: true,
      orRequiredGroup: 2,
      show: true,
    };
    const fields = [{ ...email, orRequiredGroup: 1 }, { ...phone, orRequiredGroup: 1 }, companyOneOf];

    expect(isFormFieldRequired(fields[0], fields, true)).toBe(false);
    expect(isFormFieldRequired(fields[1], fields, true)).toBe(false);
    expect(isFormFieldRequired(companyOneOf, fields, true)).toBe(true);
  });

  test("One-of fields in different groups are each required", () => {
    const emailAlone: TRequirementField = { required: true, orRequired: true, show: true };
    const phoneGroup2: TRequirementField = {
      required: true,
      orRequired: true,
      orRequiredGroup: 2,
      show: true,
    };
    const fields = [emailAlone, phoneGroup2];

    expect(isFormFieldRequired(emailAlone, fields, true)).toBe(true);
    expect(isFormFieldRequired(phoneGroup2, fields, true)).toBe(true);
  });
});

describe("realOrRequiredGroup", () => {
  test("two shown fields with no group number share group 1", () => {
    const fields = [email, phone];

    expect(realOrRequiredGroup(email, fields)).toBe(1);
    expect(realOrRequiredGroup(phone, fields)).toBe(1);
  });

  test("a shown field in group 2 carries that number when another shown field shares it", () => {
    const firstName: TRequirementField = {
      required: true,
      orRequired: true,
      orRequiredGroup: 2,
      show: true,
    };
    const lastName: TRequirementField = {
      required: true,
      orRequired: true,
      orRequiredGroup: 2,
      show: true,
    };
    const fields = [firstName, lastName, email];

    expect(realOrRequiredGroup(firstName, fields)).toBe(2);
    expect(realOrRequiredGroup(lastName, fields)).toBe(2);
    expect(realOrRequiredGroup(email, fields)).toBeUndefined();
  });

  test("a lone shown One-of field has no group marker", () => {
    const hiddenPhone: TRequirementField = { required: true, orRequired: true, show: false };
    const fields = [email, hiddenPhone];

    expect(realOrRequiredGroup(email, fields)).toBeUndefined();
  });

  test("a field required on its own and an optional field have no group marker", () => {
    const firstName: TRequirementField = { required: true, show: true };
    const fields = [firstName, email, phone, company];

    expect(realOrRequiredGroup(firstName, fields)).toBeUndefined();
    expect(realOrRequiredGroup(company, fields)).toBeUndefined();
    expect(realOrRequiredGroup(email, fields)).toBe(1);
  });

  test("One-of fields in different groups are each unmarked when they are alone", () => {
    const phoneGroup2: TRequirementField = {
      required: true,
      orRequired: true,
      orRequiredGroup: 2,
      show: true,
    };
    const fields = [email, phoneGroup2];

    expect(realOrRequiredGroup(email, fields)).toBeUndefined();
    expect(realOrRequiredGroup(phoneGroup2, fields)).toBeUndefined();
  });

  test("a missing group number shares group 1 with an explicit group 1", () => {
    const explicit: TRequirementField = { required: true, orRequired: true, orRequiredGroup: 1, show: true };
    const fields = [email, explicit];

    expect(realOrRequiredGroup(email, fields)).toBe(1);
    expect(realOrRequiredGroup(explicit, fields)).toBe(1);
  });
});
