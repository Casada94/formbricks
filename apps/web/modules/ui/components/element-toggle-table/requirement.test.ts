import { describe, expect, test } from "vitest";
import {
  compositeElementIsRequired,
  fieldRequirement,
  fieldRequirementGroup,
  requirementAttributes,
} from "./requirement";

describe("field requirement", () => {
  test("maps the three modes onto the stored flags", () => {
    expect(requirementAttributes("optional")).toEqual({ required: false, orRequired: false });
    expect(requirementAttributes("required")).toEqual({ required: true, orRequired: false });
    expect(requirementAttributes("oneOf")).toEqual({ required: true, orRequired: true, orRequiredGroup: 1 });
    expect(requirementAttributes("oneOf", 3)).toEqual({
      required: true,
      orRequired: true,
      orRequiredGroup: 3,
    });
    expect(requirementAttributes("required")).not.toHaveProperty("orRequiredGroup");
    expect(requirementAttributes("optional")).not.toHaveProperty("orRequiredGroup");
  });

  test("reads One of ahead of the required flag", () => {
    expect(fieldRequirement({ required: true, orRequired: true })).toBe("oneOf");
    expect(fieldRequirement({ required: true, orRequired: true, orRequiredGroup: 4 })).toBe("oneOf");
    expect(fieldRequirementGroup({ required: true, orRequired: true, orRequiredGroup: 4 })).toBe(4);
    expect(fieldRequirementGroup({ required: true, orRequired: true })).toBe(1);
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
