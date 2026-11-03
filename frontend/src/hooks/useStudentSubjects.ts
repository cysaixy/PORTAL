import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export interface SubjectData {
  id: string;
  code: string;
  title: string;
  category: string;
  semester?: number;
  teacher: {
    firstName: string;
    lastName: string;
    department?: string;
  };
  section: string;
}

export function useStudentSubjects() {
  return useQuery({
    queryKey: ['student', 'subjects'],
    queryFn: async () => {
      const response = await api.get<{ subjects: SubjectData[] }>('/student/subjects');
      return response.data.subjects;
    },
  });
}
