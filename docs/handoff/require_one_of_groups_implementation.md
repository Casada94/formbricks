# Implementing One-of groups

Builds `docs/handoff/require_one_of_groups.md`. Do that behavior. This file is the order, the signatures, and the tests.

Respondent display follows `docs/handoff/require_one_of_groups_design_updates.md` where it disagrees with step 5 and the verify list. The standing "At least one of …" lines under the headline are not part of the build. A real-group label ends with a superscript `*N`.

Node and build traps from `adding_require_one_of.md` still apply. Use Node 22 (`/home/clayton/.nvm/versions/node/v22.23.4`) and `corepack pnpm`. `@formbricks/surveys` is consumed from `dist/` and copied to `apps/web/public/js/`. Unit tests run against source. A running app does not show this until:

```shell
pnpm build --filter=@formbricks/surveys... --force
```

Then hard-refresh. Build `@formbricks/i18n-utils` before running `composite-required.test.ts` outside Turbo. Root `pnpm test` does that through `dependsOn`.

## Order

Each step should typecheck against the step before it. Shared group resolution lands first so the three call sites do not each invent a default.

### 1. Group number on the shared schema

In `packages/types/surveys/elements.ts`, next to `ZToggleInputConfig`:

```ts
export const OR_REQUIRED_GROUPS = [1, 2, 3, 4, 5] as const;
export type TOrRequiredGroup = (typeof OR_REQUIRED_GROUPS)[number];

export const orRequiredGroupNumber = (field: {
  orRequired?: boolean;
  orRequiredGroup?: number;
}): TOrRequiredGroup | undefined => {
  if (!field.orRequired) return undefined;
  const group = field.orRequiredGroup;
  if (group === 1 || group === 2 || group === 3 || group === 4 || group === 5) return group;
  return 1;
};
```

`ZToggleInputConfig` gains `orRequiredGroup: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional()`. A literal union is the stored type. `z.number().int().min(1).max(5)` would also accept values the editor never writes and would widen the inferred type to `number`.

Update the comment above the schema. Membership is per group number.

`packages/types/surveys/types.ts` already imports this schema for the v1 questions. No second copy.

`packages/types/surveys/elements.or-required.test.ts`:

- A contact field with `orRequired: true` and `orRequiredGroup: 2` parses and keeps `2`.
- Omitting `orRequiredGroup` leaves it undefined. `orRequiredGroupNumber` then returns `1` for that field.
- `orRequiredGroup: 6` fails parse.
- `orRequiredGroupNumber({ orRequired: false, orRequiredGroup: 2 })` is `undefined`.
- `orRequiredGroupNumber({ orRequired: true })` is `1`.

### 2. Editor flags

`apps/web/modules/ui/components/element-toggle-table/requirement.ts`

`requirementAttributes` takes an optional `TOrRequiredGroup`:

- `"oneOf"` → `{ required: true, orRequired: true, orRequiredGroup: group ?? 1 }`.
- `"required"` → `{ required: true, orRequired: false }`. The group key is absent.
- `"optional"` → `{ required: false, orRequired: false }`. The group key is absent.

`fieldRequirement` stays as it is. One of wins whenever `orRequired` is set, with or without a group. Add `fieldRequirementGroup`, which returns `orRequiredGroupNumber(field)` so the menu does not reimplement the default.

`compositeElementIsRequired` stays. A shown One of field of any group makes the question required.

`requirement.test.ts` currently expects `requirementAttributes("oneOf")` to equal `{ required: true, orRequired: true }`. Change that expectation to include `orRequiredGroup: 1`. Add:

- `requirementAttributes("oneOf", 3)` writes group 3 and `required: true`.
- `requirementAttributes("required")` and `"optional"` have no `orRequiredGroup` key.
- `fieldRequirement({ required: true, orRequired: true, orRequiredGroup: 4 })` is `"oneOf"`.
- `fieldRequirementGroup` reads `4`, and reads `1` when the key is missing.

The contact and address editor forms spread each element field into the table (`...element.firstName`, and the same for address). Once the type includes `orRequiredGroup`, the table sees it. Leave those forms alone. Their `compositeElementIsRequired` effects stay.

### 3. Validation

`packages/surveys/src/lib/validation/composite-required.ts`

Add `group: TOrRequiredGroup` to `TOrRequiredField`. `shownOrRequiredFields` sets it with `orRequiredGroupNumber`. A field with `orRequired` unset stays excluded. A hidden field stays excluded.

Replace `orRequiredGroupSummary` with:

```ts
export interface TOrRequiredGroupSummary {
  group: TOrRequiredGroup;
  summary: string;
}

export const orRequiredGroupSummaries = (
  element: TSurveyElement,
  languageCode: string
): TOrRequiredGroupSummary[]
```

Group the shown fields by `group`. Keep a bucket only when it has two or more fields. Sort by group number. The summary string keeps today's label rule: strip the trailing colon, drop empty labels, fall back to field ids when every label is empty, join with `", "`.

`validateOrRequiredGroup` still returns `TValidationError | null`. Collect the real groups whose every member is blank (`textAt` unchanged). No failing group returns null. Otherwise one error:

```ts
{
  ruleId: "required",
  ruleType: "minLength",
  message: failing
    .map((group) => t("errors.fill_in_at_least_one_of", { fields: group.summary }))
    .join(" "),
}
```

Use the summary already computed for that failing group.

`validateElementResponse` keeps a single push and still skips `checkRequiredField` when that error is non-null. Leave `getFirstErrorMessage` as it is. Two errors would hide the second group, because the survey renders only the first message.

`composite-required.test.ts` calls `orRequiredGroupSummary`. Point those expectations at `orRequiredGroupSummaries`. The existing contact fixture has no group number, so email and phone are both group 1 and the summary is still `"Email, Phone"`. Same for the address fixture: one summary, `"Street, City, Zip"`.

Add:

- Email and phone in group 1, first name and last name in group 2. Filling only the phone fails, and the message names First name and Last name. Filling one field in each group returns null. Filling neither names both groups, group 1's sentence first.
- Email in group 1 and phone in group 2, one field each. Summaries are empty and validation returns null. Both are singletons.
- A hidden phone with group 2 does not complete a group 2 pair.
- `orRequired: true` with no group number shares group 1 with an explicit `orRequiredGroup: 1`.

`evaluator.test.ts`, inside `"one-of required fields"`: one element with two real groups. Leaving both blank yields `errors` of length 1. The mock `t` returns the key, so the message is the key twice, separated by a space. Filling one group and leaving the other blank is invalid. Filling one field in each group is valid. The existing single-group tests stay, and they still expect one error whose message is `errors.fill_in_at_least_one_of`.

### 4. HTML required

`packages/survey-ui/src/lib/form-field-required.ts`

`TRequirementField` gains `orRequiredGroup?: number`. `isFormFieldRequired` counts visible fields whose `orRequiredGroupNumber` equals this field's group. Two or more means this input is not required. A One of field in another group does not add to the count. The fallback that requires every visible field, when the question is required and every field looks optional, stays. It still treats any `orRequired` as "not optional", so a real group does not force `required` onto the untouched fields.

`form-field-required.test.ts`. The current pair of One of fields has no group number, so they remain one group and the existing tests stay green. Add:

- Email and phone in group 1, company One of in group 2 alone. Email and phone are not individually required. Company is.
- Email One of with no group, phone One of in group 2. Each is required. This is the case the old global count would get wrong.

### 5. Respondent form

`packages/survey-ui/src/components/elements/form-field.tsx`

`FormFieldConfig` gains `orRequiredGroup?: number`.

Replace `orGroupHint?: string` with:

```ts
orGroupHints?: readonly { group: number; text: string }[];
```

Render one `<p className="label-description">` per hint, id `${elementId}-or-requirement-${hint.group}`. An input's `aria-describedby` is that id only when `orRequiredGroupNumber(field)` equals `hint.group`. No hint for that group means no `aria-describedby`, which is the singleton case. Leave the comment that explains why the element error is not linked.

`form-field.stories.tsx`: `OneOfRequired` passes `orGroupHints: [{ group: 1, text: "At least one of Email, Phone" }]` and `orRequiredGroup: 1` on email and phone. Extend that story with a second hint and two fields on group 2, so both paragraphs and both ids are visible in Storybook.

`packages/surveys/src/components/elements/contact-info-element.tsx` and `address-element.tsx`:

- Pass `orRequiredGroup` on every field config, from the element.
- Replace the single `orGroupHint` with `orGroupHints` mapped from `orRequiredGroupSummaries`: `{ group, text: t("common.at_least_one_of", { fields: summary }) }`.
- Leave the rest of these elements alone. Address already reads one label as `placeholder[languageCode]` while contact uses `getLocalizedValue`.

No new respondent string. `common.at_least_one_of` and `errors.fill_in_at_least_one_of` are reused per group.

### 6. Editor table

`apps/web/modules/ui/components/element-toggle-table/index.tsx`

`TToggleField` gains `orRequiredGroup?: number`.

`onShowToggle` copies `orRequiredGroup` the same way it copies `orRequired`.

`onRequirementChange` writes `requirementAttributes("oneOf", 1)` when the new mode is One of. That same update sets `orRequiredGroup: 1`, so the group menu mounts with 1 selected. The author does not take a second step, and the control is never blank. A field that is already One of keeps its group. The group menu is a separate control, so changing the number does not go through the mode menu. Switching to Optional or Required uses `requirementAttributes` without a group, which omits the key. Choosing One of again after that starts at group 1 once more.

New `onRequirementGroupChange(field, group)` writes `requirementAttributes("oneOf", group)` and keeps `show` and `placeholder`.

The header cell uses a new key, `workspace.surveys.edit.requirement` = "Requirement". The option labeled Required keeps `workspace.surveys.edit.required`.

The requirement cell becomes a flex row with a small gap. The mode menu stays. When `fieldRequirement(field) === "oneOf"`, render a "Group" label (`workspace.surveys.edit.requirement_group`) and a second `Select`. Its items are only `OR_REQUIRED_GROUPS`. Its value is `String(fieldRequirementGroup(field))`, which is `"1"` through `"5"` and never empty. No placeholder and no empty item. Its accessible name is `workspace.surveys.edit.requirement_group_for_field` = "Group for {field}". Disable it when the field is hidden, same as the mode menu.

Widen the requirement column from `w-36`. `w-56` fits a mode menu plus a short group menu. Check it against the label input in the browser. If the label column collapses, take width from the field-name column before taking it from the label.

`RequirementHint` groups shown One of fields with `fieldRequirementGroup`.

- Any group with a count of 2 or more → `required_one_of_hint`.
- Any group with a count of 1 → `required_one_of_single_hint`.
- Neither → render nothing.

New English copy, same keys:

- `required_one_of_hint`: "Respondents must fill in at least one field in each One of group. They may fill in more than one."
- `required_one_of_single_hint`: "A One of group with only one field is required on its own until another field joins it."

Only `apps/web/locales/en-US.json`. Leave other locales alone. Skip `pnpm i18n` when there is no root `.env`. The keys fall back to English at runtime, and CI stays red until i18n is generated.

There is no component test for this table. The flag behavior is covered by `requirement.test.ts`. The hint's grouping uses `fieldRequirementGroup`, which that file covers.

### 7. API and docs

`apps/web/app/api/v3/surveys/schemas.ts`: add `"orRequiredGroup"` to `TOGGLE_INPUT_KEYS`.

`docs/api-v3-reference/src/components/schemas/SurveyToggleInputConfig.yml`: optional integer, minimum 1, maximum 5, not in `required`. Description: which One-of group this field belongs to. Read when `orRequired` is true. The same number means one group. Omitted means group 1. Also adjust the `orRequired` description so it describes per-group membership.

Regenerate with `pnpm api:v3:bundle`. Commit the bundle diff. Then `pnpm api:v3:schemas:check`.

`docs/surveys/question-type/contact-info.mdx` and `address.mdx`, in the existing One of paragraph: fields with the same group number share that requirement, and a different number is a separate requirement.

## Verify

Under Node 22 and corepack pnpm:

- `packages/types`: `elements.or-required.test.ts`
- `packages/surveys`: `composite-required.test.ts`, `evaluator.test.ts`
- `packages/survey-ui`: `form-field-required.test.ts`
- `apps/web`: `requirement.test.ts`
- `tsc --noEmit` in types, surveys, and survey-ui, after `i18n-utils` and `survey-ui` are built
- Package eslint on the touched files, through each package's own config
- `pnpm api:v3:bundle` and `pnpm api:v3:schemas:check`

Then `pnpm build --filter=@formbricks/surveys... --force` and hard-refresh.

Browser, contact and address, because both render this table and both submit through `validateOrRequiredGroup`:

- Choose One of on a field. The group menu appears in that same step with 1 selected. It has no blank option. Set a second field to One of the same way, then move two other fields to group 2. The group menu is visible only on One of rows. The note under the table is the "each One of group" sentence.
- Leave one field as the only member of group 3. Both notes show. That field is required on its own.
- Hide a group 2 field and show it again. It is still group 2.
- Switch a One of field to Required. The group menu disappears.
- On the respondent form, leave group 1 blank and fill one field of group 2. Submit is blocked, and the message names group 1's labels. Fill one field of group 1. Submit proceeds.
- Leave both groups blank. One message names both groups.
- A field in a real group ends its label with a superscript `*N` and has no HTML `required`. There is no "At least one of …" line under the headline. The Required chip on the question stays. A singleton One of field keeps the plain trailing asterisk. Submitting with a blank group shows "Please fill in at least one of …".

No new Playwright spec.

## Leave unchanged

- `orRequired` stays a boolean. Old surveys would fail parse if it became a number.
- HTML `required` stays off a member of a group of two or more.
- One of fields in different groups are counted apart.
- Two blank groups produce one validation error, with both sentences.
- The element error stays off `aria-describedby`. Each input points at its own group hint.
- One of still saves `required: true`.
- Optional and Required omit `orRequiredGroup`.
- Non-English locales, `i18n.lock`, and the OpenAPI bundle stay generated. Edit the source, then regenerate.
- No TSX unit test, no per-ticket E2E spec, and no server enforcement of ordinary per-field required.
