export type EntityType = 'questions' | 'questionnaires' | 'categories';

export interface RawRow {
  [key: string]: unknown;
}

export interface ParsedQuestionRow {
  rowNumber: number;
  questionnaire_id?: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: 'A' | 'B' | 'C' | 'D';
  isValid: boolean;
  errors: string[];
}

export interface ParsedQuestionnaireRow {
  rowNumber: number;
  category_id: number;
  questionnaire_number: number;
  isValid: boolean;
  errors: string[];
}

export interface ParsedCategoryRow {
  rowNumber: number;
  name: string;
  isValid: boolean;
  errors: string[];
}

export interface UploadProgress {
  total: number;
  current: number;
  successful: number;
  failed: number;
  inProgress: boolean;
  isComplete: boolean;
  currentMessage: string;
}

export interface UploadLogItem {
  timestamp: string;
  type: 'info' | 'success' | 'error';
  message: string;
}

export interface CategoryItem {
  id: number;
  name: string;
}

export interface QuestionnaireItem {
  id: number;
  questionnaire_number: number;
  category_id: number;
  category_name?: string;
}

export interface AuthState {
  token: string | null;
  user: {
    email: string;
    name?: string;
    role_id?: number;
  } | null;
}
