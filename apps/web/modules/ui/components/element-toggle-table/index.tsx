"use client";

import { useTranslation } from "react-i18next";
import { TI18nString } from "@formbricks/types/i18n";
import { TSurveyElement } from "@formbricks/types/surveys/elements";
import { TSurvey } from "@formbricks/types/surveys/types";
import { TUserLocale } from "@formbricks/types/user";
import { ElementFormInput } from "@/modules/survey/components/element-form-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/ui/components/select";
import { Switch } from "@/modules/ui/components/switch";
import { type TFieldRequirement, fieldRequirement, requirementAttributes } from "./requirement";

interface TToggleField {
  required: boolean;
  orRequired?: boolean;
  show: boolean;
  id: string;
  label: string;
  placeholder: TI18nString;
}

interface ElementToggleTableProps {
  type: "address" | "contact";
  fields: TToggleField[];
  localSurvey: TSurvey;
  elementIdx: number;
  isInvalid: boolean;
  updateElement: (elementIdx: number, updatedAttributes: Partial<TSurveyElement>) => void;
  locale: TUserLocale;
  isStorageConfigured: boolean;
}

export const ElementToggleTable = ({
  type,
  fields,
  localSurvey,
  elementIdx,
  isInvalid,
  updateElement,
  locale,
  isStorageConfigured,
}: ElementToggleTableProps) => {
  const onShowToggle = (field: TToggleField, show: boolean) => {
    updateElement(elementIdx, {
      [field.id]: {
        show,
        required: field.required,
        orRequired: field.orRequired,
        placeholder: field.placeholder,
      },
    });
  };

  const onRequirementChange = (field: TToggleField, mode: TFieldRequirement) => {
    updateElement(elementIdx, {
      [field.id]: {
        show: field.show,
        ...requirementAttributes(mode),
        placeholder: field.placeholder,
      },
    });
  };

  const { t } = useTranslation();
  return (
    <>
      <table className="mt-4 w-full table-fixed">
        <thead>
          <tr className="text-left text-slate-800">
            <th className="w-1/4 text-sm font-semibold">
              {type === "address"
                ? t("workspace.surveys.edit.address_fields")
                : t("workspace.surveys.edit.contact_fields")}
            </th>
            <th className="w-16 text-sm font-semibold">{t("common.show")}</th>
            <th className="w-36 text-sm font-semibold">{t("workspace.surveys.edit.required")}</th>
            <th className="text-sm font-semibold">{t("common.label")}</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field) => (
            <tr className="text-slate-900" key={field.id}>
              <td className="py-2 text-sm">{field.label}</td>
              <td className="py-">
                <Switch
                  checked={field.show}
                  onCheckedChange={(show) => {
                    onShowToggle(field, show);
                  }}
                  disabled={
                    // if all the other fields are hidden, this should be disabled
                    fields
                      .filter((currentField) => currentField.id !== field.id)
                      .every((field) => !field.show)
                  }
                />
              </td>
              <td className="py-2 pr-2">
                <Select
                  value={fieldRequirement(field)}
                  onValueChange={(mode) => {
                    onRequirementChange(field, mode as TFieldRequirement);
                  }}
                  disabled={!field.show}>
                  <SelectTrigger
                    className="h-8"
                    aria-label={t("workspace.surveys.edit.required_for_field", { field: field.label })}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="optional">{t("common.optional")}</SelectItem>
                    <SelectItem value="required">{t("workspace.surveys.edit.required")}</SelectItem>
                    <SelectItem value="oneOf">{t("workspace.surveys.edit.required_one_of")}</SelectItem>
                  </SelectContent>
                </Select>
              </td>
              <td className="py-2">
                <ElementFormInput
                  id={`${field.id}.placeholder`}
                  label={""}
                  value={field.placeholder}
                  localSurvey={localSurvey}
                  elementIdx={elementIdx}
                  isInvalid={isInvalid}
                  updateElement={updateElement}
                  locale={locale}
                  isStorageConfigured={isStorageConfigured}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <RequirementHint fields={fields} />
    </>
  );
};

const RequirementHint = ({ fields }: Readonly<{ fields: TToggleField[] }>) => {
  const { t } = useTranslation();
  const oneOfCount = fields.filter((field) => field.show && field.orRequired).length;

  if (oneOfCount === 1) {
    return (
      <p className="mt-2 text-xs text-slate-500">{t("workspace.surveys.edit.required_one_of_single_hint")}</p>
    );
  }

  if (oneOfCount >= 2) {
    return <p className="mt-2 text-xs text-slate-500">{t("workspace.surveys.edit.required_one_of_hint")}</p>;
  }

  return null;
};
