# One-of groups

Extends `docs/handoff/adding_require_one_of.md`. That work shipped one One-of group per contact or address question. This change gives the author up to five independent groups inside the same question.

Respondent display of a group is updated in `docs/handoff/require_one_of_groups_design_updates.md`. Where that file and this one disagree, the design updates file wins.

A group stays inside one question. It is not cross-question logic, and it is not the validation-rule `and` / `or` in `packages/surveys/src/lib/validation/evaluator.ts`. Leave those alone.

## Editor

The column header changes from "Required" to "Requirement". The menu options stay Optional, Required, and One of. "Required" remains the option for a field that is required on its own, so the header gets its own string. The existing `workspace.surveys.edit.required` key stays the option label.

When a row is One of, a second menu appears in that same cell, to the right of the first. Its options are only 1, 2, 3, 4, and 5. There is no blank option and no placeholder. A visible "Group" label sits with it, because the closed menu would otherwise show only a number. The second menu has no column of its own. It is hidden for Optional and Required.

Choosing One of writes group 1 in that same update, and the group menu appears with 1 already selected. The author does not have to open it to finish the choice. Changing the number updates that field only. Switching the row to Optional or Required clears the group. Choosing One of again after that starts at group 1 once more. Hiding a field keeps its mode and its group, and disables both menus. Showing it again puts it back in the same group.

The requirement column is widened so both menus fit beside the label. The table stays `table-fixed`. Other editor selects in this form do not set `type="button"`. Match that.

The note under the table follows the groups:

- If any group has two or more shown fields: "Respondents must fill in at least one field in each One of group. They may fill in more than one."
- If any group has only one shown field: "A One of group with only one field is required on its own until another field joins it."

Both notes can show at once. One sentence covers every singleton.

## Stored shape

`required` and `orRequired` stay booleans. A new optional integer, `orRequiredGroup`, names the group. The editor writes it only together with One of, through `requirementAttributes`.

| Mode | Stored |
| --- | --- |
| Optional | `{ required: false, orRequired: false }` |
| Required | `{ required: true, orRequired: false }` |
| One of, group 3 | `{ required: true, orRequired: true, orRequiredGroup: 3 }` |

`required` stays true on One-of fields so older readers, and the question-level asterisk, still see the question as required.

A saved One of field with no `orRequiredGroup` is group 1. Surveys stored by the first change keep a single group. The editor writes `orRequiredGroup: 1` explicitly for new One of rows, including group 1.

`orRequiredGroup` is read only when `orRequired` is true. Optional and Required omit the key. The field object is replaced wholesale by `updateElement`, so a leftover key would survive. The Show toggle copies `orRequiredGroup` through, so hiding a field keeps its group.

A payload with `orRequired: true` and `required: false` is still not what the editor writes. Readers still treat a lone `orRequired` as required, in group 1 when the group key is missing, or in the numbered group when it is present.

The question-level `element.required` rule does not change. `compositeElementIsRequired` stays true when any shown field has `required` or `orRequired`.

Zod `z.object` strips unknown keys. Publish uses `ZSurvey`. Drafts use loose `ZSurveyDraft`, so an unknown key survives a draft and disappears on publish. `orRequiredGroup` has to be on `ZToggleInputConfig` or publishing deletes it. That schema is shared by the current address and contact elements and by the deprecated v1 question schemas. Add the key once.

v3 survey writes reject unknown keys before Zod, in `apps/web/app/api/v3/surveys/schemas.ts`. `TOGGLE_INPUT_KEYS` must include `orRequiredGroup`. Leaving it out makes a v3 write return 400 `unsupported_field`.

OpenAPI source is `docs/api-v3-reference/src/components/schemas/SurveyToggleInputConfig.yml`. `orRequiredGroup` is an optional integer from 1 to 5, not in `required`, and `additionalProperties: false` stays. Edit the source, then regenerate the bundle with `pnpm api:v3:bundle`. `SurveyToggleInputConfig` is not in the generated `packages/api-v3-schemas` package, because the surveys tag is not adopted. `pnpm api:v3:schemas:check` staying green does not mean a Zod file changed.

The schema rejects a group outside 1–5 on parse. Readers of an already-loaded element still collapse a missing or unusable group to 1 when `orRequired` is set, so a draft that has not been republished keeps the old single group.

## Enforcement

Shown One of fields are split by group number. Hidden fields stay out of the count and keep their number.

A group exists only when two or more shown fields share that number. Each such group must have at least one non-blank value. Whitespace counts as blank, same as today. Filling group 1 does not satisfy group 2. Filling more than one field in a group is valid.

A group of one shown field is required on its own through the HTML `required` attribute and a per-field asterisk. The evaluator does not special-case it. That case keeps the same server hole as ordinary per-field required.

Members of a real group (two or more shown fields with the same number) must not get the HTML `required` attribute and must not get a per-field asterisk. The count is per group. Two One of fields in different groups are two singletons, and each one is required on its own.

`isFormFieldRequired` order becomes:

1. `orRequired`, and two or more visible fields in the same group → false.
2. `required` or a lone `orRequired` → true.
3. Every visible field lacks both flags, and the element is required → true (the old fallback).

The group check runs in `validateOrRequiredGroup`, which `validateElementResponse` already calls. That path is the client submit and the API. When one or more real groups are entirely blank, the function still returns one error. The survey UI shows only the first error (`getFirstErrorMessage`), so one message carries every blank group. Sentences stay in group-number order, joined with a space, each one the existing string:

`errors.fill_in_at_least_one_of` = "Please fill in at least one of {fields}".

Example: "Please fill in at least one of Email, Phone. Please fill in at least one of City, State."

Groups that have a value are left out of the message. Build each sentence from the group that just failed.

When any real group fails, `validateElementResponse` still skips `checkRequiredField`, so the messages do not stack. Other rules still run. A filled member is still format-checked. HTML `required` on a strict neighbor, or on a singleton group, is not reached until the next submit, after every failing group has a value.

## Respondent copy

The hint is still `common.at_least_one_of` = "At least one of {fields}". There is one hint per real group, between the headline and the inputs, each a `<p className="label-description">`. The id is `${elementId}-or-requirement-${group}`.

`aria-describedby` points at that group's hint only on inputs whose own group matches. Inputs in a singleton group do not point at a hint. The shared element error stays unlinked from the inputs, for the reason already commented in `form-field.tsx`.

The question asterisk stays on the headline through `element.required`. Real-group members do not get their own asterisks. Singleton One of fields do.

## Docs and i18n

`docs/surveys/question-type/contact-info.mdx` and `address.mdx` gain one sentence: fields with the same group number share a requirement, and different numbers are separate.

English only, in the files that already hold the One of strings:

- `apps/web/locales/en-US.json`: column header "Requirement", "Group", the group menu's accessible name, and the two updated hints.
- Respondent strings in `packages/surveys/locales/en-US.json` stay as they are. Each group reuses them.

Other locale files and `packages/surveys/i18n.lock` stay machine-generated. Missing keys fall back to English. CI still fails until someone with credentials runs `pnpm i18n`.

## What stays out

Email preview, prefill validators, and server-side enforcement of ordinary per-field required stay out, as in the first change. No component unit test for the TSX. The new behavior is proved in the `.ts` modules. No second E2E spec. Verify the menus and a respondent submit in the browser and say so.

How to build this is in `docs/handoff/require_one_of_groups_implementation.md`.
