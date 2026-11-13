import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export interface SectionSummary {
  id: string;
  name: string;
  gradeLevel: string;
  strand: string | null;
  schoolYear: string;
  adviser: string | null;
}

export interface SubjectGrades {
  sectionSubjectId: string;
  code: string;
  title: string;
  category: string;
  semester: number | null;
  teacher: string;
  quarters: Record<number, { score: number; locked: boolean } | null>;
  runningAverage: number | null;
  finalGrade: number | null;
  remarks: 'PASSED' | 'FAILED' | null;
}

export interface GradeReport {
  section: SectionSummary | null;
  subjects: SubjectGrades[];
  quarterAverages: Record<number, number | null>;
  generalAverage: number | null;
  passingScore: number;
}

export const useStudentGrades = () =>
  useQuery({ queryKey: ['student', 'grades'], queryFn: () => api.get<GradeReport>('/student/grades').then((r) => r.data) });

/** DepEd descriptor for a final grade. */
export function descriptor(g: number | null) {
  if (g === null) return null;
  if (g >= 90) return 'Outstanding';
  if (g >= 85) return 'Very satisfactory';
  if (g >= 80) return 'Satisfactory';
  if (g >= 75) return 'Fairly satisfactory';
  return 'Did not meet expectations';
}
