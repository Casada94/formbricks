What the user asked for

Contact Info and Address are the only questions with per-field required toggles. The user wants an OR group on those sub-fields: two or more fields where at least one must be filled, and filling more than one is valid. Both blank is invalid. Whitespace counts as blank.

This is inside one question. It is not cross-question logic, and it is not the existing validation-rule logic: "and" | "or" (executeAndLogic / executeOrLogic in packages/surveys/src/lib/validation/evaluator.ts). Those still mean format/length rules. Leave them alone.

The flag design

required stays a boolean. Changing it would break stored surveys and the API.

A new optional boolean, orRequired, marks group membership.

┌─────────────┬────────────────────────────────────────┐
│ Editor mode │ Stored flags                           │
├─────────────┼────────────────────────────────────────┤
│ Optional    │ { required: false, orRequired: false } │
├─────────────┼────────────────────────────────────────┤
│ Required    │ { required: true, orRequired: false }  │
├─────────────┼────────────────────────────────────────┤
│ One of      │ { required: true, orRequired: true }   │
└─────────────┴────────────────────────────────────────┘

required stays true on One-of fields so older readers, and the question-level asterisk, still see the question as required. orRequired is the only thing that joins the group. The editor always writes both flags together through requirementAttributes in apps/web/modules/ui/components/element-toggle-table/requirement.ts. A payload with orRequired: true and required: false is not what the editor writes, but readers still treat a lone orRequired as required.

A group exists only when two or more shown fields have orRequired. One shown One-of field is required on its own (HTML required). Hidden fields do not count, and their orRequired is kept so showing them again puts them back in the group.

The question-level element.required is true when any shown field has required or orRequired. The contact and address editor forms already had a useEffect for this. They now call compositeElementIsRequired.

Where enforcement lives, and why it is split

Strict per-field required was, and still is, HTML5 only. checkRequiredField treats a value as empty only when it is undefined, null, "", a zero-length array, or an empty object. An array of empty strings is not empty. Contact and address answers are always positional string arrays, so the generic required check never sees them as empty. The browser required attribute is what blocks submit, via form.checkValidity() after validateBlockResponses in packages/surveys/src/components/general/block-conditional.tsx.

Do not close that hole as part of this feature. Server-enforcing every strict sub-field would change API behavior for surveys that already rely on the client-only check.

The OR group cannot use HTML required. The browser would require every member. So:

• Members of a real group (two or more shown orRequired fields) must not get the HTML required attribute and must not get a per-field asterisk.
• A single shown One-of field does get HTML required. The evaluator does not special-case a group of size 1, so that case has the same server hole as ordinary required.
• The group itself is enforced in validateOrRequiredGroup, which validateElementResponse calls. That function is the client submit path and the API path (validateResponseData → validateBlockResponses). A blank group fails even when other fields in the question are filled.

When the group fails, validateElementResponse pushes that error and skips checkRequiredField, so the messages do not stack. Other rules still run after a group failure. A filled member is still format-checked. Empty email and phone still skip the implicit format validators, because those validators already treat an empty string as valid.

If the group fails and a strict required neighbor is also empty, only the OR error comes back from the evaluator. HTML required on the strict field is never reached, because validation returns early. The next submit, after one OR field is filled, lets HTML catch the strict field.

Answer shape and field order

Contact order is ZContactInfoField.options: firstName, lastName, email, phone, company.

Address order is ZAddressField.options: addressLine1, addressLine2, city, state, zip, country.

Both enums live in packages/types/surveys/validation-rules.ts. getFieldValue in the evaluator and toggleFields in composite-required.ts both index the answer array with .options. That replaced two local order arrays in the evaluator. Keep those enums, the element field objects, and the answer arrays in the same order. Adding a field id that is not a toggle config will break the element[id] lookup.

textAt only counts a trimmed string. A non-string entry is blank. undefined value fails a real group.

Labels come from the field placeholder via getLocalizedValue, then stripTrailingLabelColon, which strips trailing :, fullwidth ：, and whitespace. That helper used to be private in the evaluator (stripTrailingColon). It moved to composite-required.ts because the hint and the error both need it. The evaluator's field-prefixed rule messages call the same function.

If every label is empty, the summary falls back to the field ids. Otherwise empty labels are dropped and the rest are joined with ", ".

Respondent copy and accessibility

Hint, shown only when there is a real group: common.at_least_one_of = "At least one of {fields}".

Error: errors.fill_in_at_least_one_of = "Please fill in at least one of {fields}".

The hint is a <p className="label-description"> with id ${elementId}-or-requirement, between the headline and the inputs, so the survey theme styles it. It is not a <label>.

aria-describedby points at that hint only on inputs whose own orRequired is set. The shared element error is deliberately not linked from every input. The existing comment in form-field.tsx explains why: one flattened message would be read as the description of the wrong field.

The question asterisk stays on the headline through element.required. Group members do not get their own asterisks.

The FormField fallback trap

isFormFieldRequired in packages/survey-ui/src/lib/form-field-required.ts replaced an inline helper. Old behavior: if the element is required and every visible field looks optional, every visible field becomes required.

One-of fields store required: true but must not be individually required once they are in a group. If you only special-case the group and then run the old fallback, the fallback sees them as not individually required and forces HTML required back on. The fix is the order in isFormFieldRequired:

1. orRequired and two or more visible orRequired fields → false.
2. required or a lone orRequired → true.
3. Every visible field lacks both flags, and the element is required → true (the old fallback).

Hidden fields are excluded from the count (show !== false is visible).

Editor state

ElementToggleTable replaced the Required switch with a Radix select: Optional, Required, One of. The Show switch copies orRequired through. The select is disabled when the field is hidden. Other editor selects sit in the same <form> without type="button". Match that. Do not invent a submit-on-change fix.

onRequirementChange replaces the whole field object. updateElement / updateElementInBlock shallow-merge at the element, so the field object is replaced wholesale. Optional and Required must set orRequired: false, or a previous true survives. The Show toggle must pass orRequired through, or hiding a field drops it from the group forever.

The hint under the table counts shown orRequired fields. One field: "Mark One of on at least two fields. Until then, this field is required on its own." Two or more: "Respondents must fill in at least one field marked One of. They may fill in more than one."

fieldRequirement shows One of whenever orRequired is truthy, even if required is false.

Schema, publish, and the API

Zod z.object strips unknown keys. Publish uses ZSurvey in apps/web/modules/survey/editor/actions.ts. Drafts use loose ZSurveyDraft, so an unknown key survives a draft and disappears on publish. orRequired has to be on the schema or publishing deletes it.

ZToggleInputConfig is exported from packages/types/surveys/elements.ts and used by current address and contact elements. The deprecated v1 question schemas in packages/types/surveys/types.ts used to duplicate it. They now import the same schema, and TInputFieldConfig is re-exported from elements.ts. types.ts already imported elements.ts, so this is not a cycle. If you add a key to only one copy, v1 and v2 drift again.

v3 survey writes also reject unknown keys before Zod, in apps/web/app/api/v3/surveys/schemas.ts. TOGGLE_INPUT_KEYS is show, required, orRequired, placeholder. Leave orRequired out and a v3 write returns 400 unsupported_field.

OpenAPI source is docs/api-v3-reference/src/components/schemas/SurveyToggleInputConfig.yml. orRequired is an optional boolean, not in required, and additionalProperties: false stays. The committed bundle docs/api-v3-reference/openapi.yml was regenerated with pnpm api:v3:bundle and gained those three lines. SurveyToggleInputConfig is not in the generated packages/api-v3-schemas package because the surveys tag is not adopted, so pnpm api:v3:schemas:check staying green does not mean a Zod file changed. It means zod.gen.ts was already in sync. Edit the source YAML, then bundle. Do not hand-edit only the bundle.

Docs paragraphs are in docs/surveys/question-type/contact-info.mdx and address.mdx.

i18n

Only these English files were edited:

• apps/web/locales/en-US.json, under workspace.surveys.edit: required_for_field ("Requirement for {field}"), required_one_of ("One of"), required_one_of_hint, required_one_of_single_hint.
• packages/surveys/locales/en-US.json: common.at_least_one_of, errors.fill_in_at_least_one_of.

Interpolation is {fields} and {field}, the project's style, not ICU.

pnpm i18n was not run. There is no repo-root .env, and the Lingo.dev scripts are dotenv -e ../../.env. Do not hand-write the other locale files or packages/surveys/i18n.lock. The scan fails CI on incomplete translations and a stale lockfile. At runtime, missing keys fall back to English (fallbackLng), so the product works, and CI still fails until someone with credentials runs pnpm i18n.

Evaluator tests mock getTranslations to return the key, so those assertions expect errors.fill_in_at_least_one_of with no interpolation. composite-required.test.ts uses a fake t that returns key:fields, so those assertions include the labels.

Files

New:

• packages/surveys/src/lib/validation/composite-required.ts and its test. Group membership, summary, validation, colon stripping.
• packages/survey-ui/src/lib/form-field-required.ts and its test. HTML required decision.
• apps/web/modules/ui/components/element-toggle-table/requirement.ts and its test. Editor modes and question-level required.
• packages/types/surveys/elements.or-required.test.ts. Parse keeps the flag and leaves it undefined when omitted.

Changed:

• packages/types/surveys/elements.ts, packages/types/surveys/types.ts. Shared schema.
• packages/surveys/src/lib/validation/evaluator.ts and evaluator.test.ts. Group check first, shared field order, colon helper moved.
• packages/surveys/src/components/elements/contact-info-element.tsx and address-element.tsx. Pass orRequired and the hint into FormField.
• packages/survey-ui/src/components/elements/form-field.tsx and form-field.stories.tsx. orRequired on FormFieldConfig, hint, aria-describedby, OneOfRequired story.
• apps/web/modules/ui/components/element-toggle-table/index.tsx. Select and hint.
• apps/web/modules/survey/editor/components/contact-info-element-form.tsx and address-element-form.tsx. compositeElementIsRequired in the existing effect.
• apps/web/app/api/v3/surveys/schemas.ts. Allow the key.
• OpenAPI source and bundle, both MDX pages, both en-US.json files.

Out of scope on purpose: email preview (preview-email-template.tsx does not show per-field required), prefill validators, and server-side enforcement of ordinary per-field required.

Footguns

One group per question. Every shown orRequired field is in that one group. There are no independent groups and no cross-question OR.

Do not set HTML required on members of a group of two or more. Do not attach the OR error to every input with aria-describedby.

Do not drop required: true when saving One of. Question-level required and older clients depend on it.

Switching a field from One of back to Required or Optional must write orRequired: false. The field object is replaced, not patched.

validateOrRequiredGroup calls orRequiredGroupSummary again for the message. That call is non-null because the group length was already checked. Do not "simplify" it into a path that can pass null into the translation.

A whitespace-only email can fail the group and also fail the email format rule if the rest of the pipeline treats it as non-empty. A filled invalid email next to a valid phone fails the email rule. That is covered: not-an-email plus 5551234 is invalid with rule id __implicit_email_field__. The phone pattern is /^[\d+][\d+\- ]*\d$/, so 5551234 is a valid phone and invalid-phone is not.

toggleFields assumes every id in the Zod enum is a toggle config on the element. The "addressLine1" in element and "firstName" in element guards exist so a mismatched element type returns no group.

Contact and address elements already have an eslint react-hooks/purity warning on useState(performance.now()). Leave it.

apps/web/app/api/v3/surveys/schemas.ts has pre-existing unused and expression warnings. The key-set edit did not add them.

Survey-ui eslint ignores *.test.ts. Linting form-field-required.test.ts warns that the file is ignored. That is expected.

There is no component unit test for the TSX. The logic sits in the three .ts modules. Do not add a TSX test to raise coverage.

Build and runtime traps

@formbricks/surveys is consumed from dist/, and the bundle is copied to apps/web/public/js/. Unit tests run against source. A running Next app will not show this until:

pnpm build --filter=@formbricks/surveys... --force

Then hard-refresh. survey-ui and i18n-utils were built locally during verification. Their dist/ directories are gitignored. git status at handoff did not include them.

getLocalizedValue loads @formbricks/i18n-utils. composite-required.test.ts failed with Cannot find package '@formbricks/i18n-utils/survey-runtime-languages' until that package was built. The evaluator tests passed without it only because they mock @/lib/i18n. Build i18n-utils before running the composite tests directly. Turbo's dependsOn does this for pnpm test. Do not mock i18n out of the composite tests. The label path is what they cover.

This machine's default Node is v20.20.2. The repo wants pnpm@11.7.0, which needs Node >=22.13 and node:sqlite. Put Node v22.23.4 first:

export PATH="/home/clayton/.nvm/versions/node/v22.23.4/bin:$PATH"

Then use corepack pnpm. which pnpm can still point at v20's shim. Turbo may spawn /home/clayton/.nvm/versions/node/v20.20.2/bin/pnpm and fail. Root turbo typecheck also runs @formbricks/database#generate, which needs DATABASE_URL. There is no root .env. Do not treat that failure as a regression in this feature. After building i18n-utils and survey-ui, tsc --noEmit inside surveys, survey-ui, and types was clean.

There is no root eslint.config. Lint through the package: corepack pnpm --filter @formbricks/surveys exec eslint <relative paths>, and the same for survey-ui, types, and web. That run had 0 errors.

What was verified

Passed, under Node 22 and corepack pnpm:

• packages/surveys: composite-required.test.ts (8), evaluator.test.ts (62)
• packages/survey-ui: form-field-required.test.ts (5), tsc --noEmit
• packages/types: elements.or-required.test.ts (1), tsc --noEmit
• apps/web: requirement.test.ts (5)
• packages/surveys tsc --noEmit after the two dependency builds
• Package eslint, 0 errors
• pnpm api:v3:bundle and pnpm api:v3:schemas:check

Not verified: browser click-through of the editor select or the respondent form. No dev server was started. pnpm i18n was not run. No commit and no PR.