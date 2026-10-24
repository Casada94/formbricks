import * as React from "react";
import { ElementError, getElementErrorAria } from "@/components/general/element-error";
import { ElementHeader } from "@/components/general/element-header";
import { Input } from "@/components/general/input";
import { Label } from "@/components/general/label";
import { isFormFieldRequired } from "@/lib/form-field-required";

/**
 * Form field configuration
 */
export interface FormFieldConfig {
  /** Unique identifier for the field */
  id: string;
  /** Label text for the field */
  label: string;
  /** Placeholder text for the input */
  placeholder?: string;
  /** Input type (text, email, tel, number, url, etc.) */
  type?: "text" | "email" | "tel" | "number" | "url";
  /** Whether this field is required on its own */
  required?: boolean;
  /**
   * Member of a One-of group. Two or more shown members must have at least one filled in.
   * A single shown member is required on its own.
   */
  orRequired?: boolean;
  /** Whether this field should be shown */
  show?: boolean;
}

interface FormFieldProps {
  /** Unique identifier for the element container */
  elementId: string;
  /** The main element or prompt text displayed as the headline */
  headline: string;
  /** Optional descriptive text displayed below the headline */
  description?: string;
  /** Array of form field configurations */
  fields: FormFieldConfig[];
  /** Current values as a record mapping field IDs to their values */
  value?: Record<string, string>;
  /** Callback function called when any field value changes */
  onChange: (value: Record<string, string>) => void;
  /** Whether the entire form is required (shows asterisk indicator) */
  required?: boolean;
  /** Custom label for the required indicator */
  requiredLabel?: string;
  /**
   * Shown when two or more fields belong to a One-of group, so the respondent knows any one of
   * them satisfies the question. The One-of inputs point at it with aria-describedby.
   */
  orGroupHint?: string;
  /** Error message to display */
  errorMessage?: string;
  /** Text direction: 'ltr' (left-to-right), 'rtl' (right-to-left), or 'auto' (auto-detect from content) */
  dir?: "ltr" | "rtl" | "auto";
  /** Whether the controls are disabled */
  disabled?: boolean;
  /** Image URL to display above the headline */
  imageUrl?: string;
  /** Alt text for the image; empty or absent marks it decorative */
  imageAltText?: string;
  /** Video URL to display above the headline */
  videoUrl?: string;
}

function FormField({
  elementId,
  headline,
  description,
  fields,
  value = {},
  onChange,
  required = false,
  requiredLabel,
  orGroupHint,
  errorMessage,
  dir = "auto",
  disabled = false,
  imageUrl,
  imageAltText,
  videoUrl,
}: Readonly<FormFieldProps>): React.JSX.Element {
  // `value` defaults to {} in the destructuring above, so it is always an object here.
  const currentValues = value;

  // Handle field value change
  const handleFieldChange = (fieldId: string, fieldValue: string): void => {
    onChange({
      ...currentValues,
      [fieldId]: fieldValue,
    });
  };

  // Get visible fields
  const visibleFields = fields.filter((field) => field.show !== false);

  // This element has no single `inputId` — its inputs are keyed off `elementId` — so the error
  // region id follows the same `${elementId}-...` scheme the field ids already use.
  //
  // The region is deliberately NOT referenced by the individual inputs via aria-describedby. This
  // element receives one already-flattened message for the whole element, and for contact-info and
  // address that message is field-scoped ("Email: ..." — the evaluator prefixes the field
  // placeholder for rules that carry a `field`). Pointing every visible input at that single node
  // would make a screen reader read "Email: ..." as the description of "First name" or "Company" —
  // a confidently wrong description, which is worse than none. The inputs still expose
  // aria-invalid, so the state is conveyed, and the live region announces the message itself.
  const errorAria = getElementErrorAria(elementId, errorMessage);
  const orHintId = `${elementId}-or-requirement`;

  return (
    <div className="w-full space-y-4" id={elementId} dir={dir}>
      {/* Headline */}
      <ElementHeader
        headline={headline}
        description={description}
        required={required}
        requiredLabel={requiredLabel}
        imageUrl={imageUrl}
        imageAltText={imageAltText}
        videoUrl={videoUrl}
      />

      {orGroupHint ? (
        <p id={orHintId} className="label-description">
          {orGroupHint}
        </p>
      ) : null}

      {/* Form Fields */}
      <div className="relative" data-element-input>
        <ElementError errorMessage={errorMessage} dir={dir} id={errorAria.errorId} />
        <div className="space-y-3">
          {visibleFields.map((field) => {
            const fieldRequired = isFormFieldRequired(field, fields, required);
            const fieldValue = currentValues[field.id] ?? "";
            const fieldInputId = `${elementId}-${field.id}`;

            // Determine input type
            let inputType: "text" | "email" | "tel" | "number" | "url" = field.type ?? "text";
            if (field.id === "email" && !field.type) {
              inputType = "email";
            } else if (field.id === "phone" && !field.type) {
              inputType = "tel";
            }

            return (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={fieldInputId} variant="default">
                  {fieldRequired ? `${field.label}*` : field.label}
                </Label>
                <Input
                  id={fieldInputId}
                  type={inputType}
                  value={fieldValue}
                  onChange={(e) => {
                    handleFieldChange(field.id, e.target.value);
                  }}
                  required={fieldRequired}
                  disabled={disabled}
                  dir={dir}
                  aria-invalid={errorAria.ariaInvalid || undefined}
                  aria-describedby={field.orRequired && orGroupHint ? orHintId : undefined}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { FormField };
export type { FormFieldProps };
