# One-of groups design updates

Changes to `docs/handoff/require_one_of_groups.md`. Each entry supersedes the part it names. Where this file and the groups doc or `docs/handoff/require_one_of_groups_implementation.md` disagree, this file wins. Editor, stored shape, and enforcement stay as written there unless an entry here says otherwise.

## 2026-10-24 — Group marker on the field label

Supersedes **Respondent copy** in the groups doc, the sentence in **Enforcement** that says a real-group member gets no per-field asterisk, implementation step 5 where it renders `orGroupHints` under the headline, and the verify bullet that says a real-group field has no asterisk.

### Was

Each real group renders one line between the headline and the inputs: "At least one of {fields}" (`common.at_least_one_of`). A contact question with First Name and Last Name in one group shows "At least one of First Name, Last Name" before the respondent has done anything. A second group gets a second line. Fields in that group have no mark of their own.

### Now

Nothing about the group is written out while the question is valid. The lines under the headline are not rendered.

A shown field in a real group ends its label with a superscript `*N`. `N` is that field's group number, the same `1`–`5` the author picked. The whole `*N` is the superscript, at the end of the label:

- First Name<sup>&#42;1</sup>
- Last Name<sup>&#42;1</sup>
- Email<sup>&#42;2</sup>
- Phone<sup>&#42;2</sup>

The same number means those fields share one requirement. Different numbers are different requirements.

The marker is only for a real group: two or more shown fields with that number. A One of field that is alone in its group is required on its own and keeps the plain trailing asterisk it already has (`First Name*`). A Required field keeps that same plain asterisk. An Optional field has neither.

The Required chip above the headline stays. It still comes from `element.required`.

`*N` is not the HTML `required` attribute. Members of a real group still do not get that attribute, so the browser does not demand every field in the group.

When a real group fails validation, the "at least one of" sentence is the element error above the inputs, which is where a failed group is already reported. The string stays `errors.fill_in_at_least_one_of`: "Please fill in at least one of {fields}". One sentence per blank group, group-number order, joined with a space. A group that has a value is left out. The shorter "At least one of {fields}" line is not brought back next to that error.

### Reading the marker

The superscript is part of the label. Its accessible name includes the group number, so the marker is not only a visual star. The input stays not individually required.

The standing hint id goes away with the hint, so a real-group input no longer has `aria-describedby` pointing at "At least one of …". The shared element error stays unlinked from the inputs. The live region above the fields announces it when validation fails.

### Unchanged

The author still sets the group in the Requirement cell. Stored `orRequired` and `orRequiredGroup` do not change. A missing group number is still group 1. Filling one field in the group still satisfies it. Two blank groups still produce one error. A singleton is still enforced with HTML `required`, and the evaluator still does not special-case it.
