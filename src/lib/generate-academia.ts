/**
 * Tipos da Academia — usados por DocAcademia.tsx e pelo Supabase.
 * A geração em si está em AcademiaGeneratorButton.tsx (autocontido).
 */

export interface AcademiaOption {
  id: string;
  text: string;
  isCorrect: boolean;
  feedback: string;
  nextStepId: string;
}

export interface AcademiaStep {
  id: string;
  type: "intro" | "quiz" | "end";
  content: string;
  badge?: { type: "warning" | "tip"; text: string };
  options?: AcademiaOption[];
  nextStepId?: string;
}

export interface AcademiaData {
  title: string;
  subtitle: string;
  steps: AcademiaStep[];
}