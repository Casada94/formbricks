import { describe, expect, test } from "vitest";
import { compositeElementIsRequired, fieldRequirement, requirementAttributes } from "./requirement";

describe("field requirement", () => {
  test("maps the three modes onto the stored flags", () => {
    expect(requirementAttributes("optional")).toEqual({ required: false, orRequired: false });
    expect(requirementAttributes("required")).toEqual({ required: true, orRequired: false });
    expect(requirementAttributes("oneOf")).toEqual({ required: true, orRequired: true });
  });

  test("reads One of ahead of the required flag", () => {
    expect(fieldRequirement({ required: true, orRequired: true })).toBe("oneOf");
    expect(fieldRequirement({ required: true })).toBe("required");
    expect(fieldRequirement({ required: false })).toBe("optional");
  });

  test("a shown One-of field makes the question required", () => {
    expect(
      compositeElementIsRequired([
        { show: true, required: false, orRequired: true },
        { show: true, required: false },
      ])
    ).toBe(true);
  });

  test("hidden fields do not make the question required", () => {
    expect(compositeElementIsRequired([{ show: false, required: true, orRequired: true }])).toBe(false);
  });

  test("every shown field optional leaves the question optional", () => {
    expect(
      compositeElementIsRequired([
        { show: true, required: false },
        { show: false, required: true },
      ])
    ).toBe(false);
  });
});
