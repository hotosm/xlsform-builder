export type LocalizedString = string | Record<string, string>;

export type XLSFormType =
  | 'text'
  | 'integer'
  | 'decimal'
  | 'note'
  | 'select_one'
  | 'select_multiple'
  | 'geopoint'
  | 'geotrace'
  | 'geoshape'
  | 'date'
  | 'time'
  | 'dateTime'
  | 'image'
  | 'audio'
  | 'video'
  | 'file'
  | 'barcode'
  | 'calculate'
  | 'acknowledge'
  | 'range'
  | 'rank'
  | 'group'
  | 'repeat';

export type XLSFormImplicitType =
  | 'start'
  | 'end'
  | 'today'
  | 'phonenumber'
  | 'deviceid'
  | 'username'
  | 'email';

export interface SurveyNode {
  id: string;
  type: XLSFormType;
  name: string;
  label: LocalizedString;
  hint?: LocalizedString;
  required?: string;
  relevant?: string;
  constraint?: string;
  constraintMessage?: LocalizedString;
  appearance?: string;
  default?: string;
  readonly?: string;
  calculation?: string;
  choiceFilter?: string;
  repeatCount?: string;
  listName?: string;
  mediaImage?: string;
  mediaAudio?: string;
  children?: SurveyNode[];
  parameters?: string;
  extra?: Record<string, string>;
}

export interface Choice {
  name: string;
  label: LocalizedString;
  extra?: Record<string, string>;
}

export interface ChoiceList {
  listName: string;
  choices: Choice[];
}

export interface FormSettings {
  formTitle: string;
  formId: string;
  version?: string;
  defaultLanguage?: string;
  style?: string;
  extra?: Record<string, string>;
}

export interface XLSFormDocument {
  survey: SurveyNode[];
  choices: ChoiceList[];
  settings: FormSettings;
  languages: string[];
}
