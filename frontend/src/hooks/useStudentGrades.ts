import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export interface GradeData {
  subject: {
    id: string;
    code: string;
    title: string;
    category: string;
  };
  teacher: {
    firstName: string;
    lastName: string;
  };
  quarters: {
    q1?: { score: number; locked: boolean; remarks?: string };
    q2?: { score: number; locked: boolean; remarks?: string };
    q3?: { score: number; locked: boolean; remarks?: string };
    q4?: { score: number; locked: boolean; remarks?: string };
  };
}

export function useStudentGrades() {
  return useQuery({
    queryKey: ['student', 'grades'],
    queryFn: async () => {
      const response = await api.get<{ grades: GradeData[] }>('/student/grades');
      return response.data.grades;
    },
  });
}
