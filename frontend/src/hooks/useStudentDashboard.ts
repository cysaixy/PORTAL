import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export interface StudentDashboardData {
  student: {
    id: string;
    name: string;
    lrn: string;
  };
  enrollments: any[];
  statistics: {
    subjectCount: number;
    quarterAverages: (number | null)[];
    overallAverage: number;
  };
}

export function useStudentDashboard() {
  return useQuery({
    queryKey: ['student', 'dashboard'],
    queryFn: async () => {
      const response = await api.get<StudentDashboardData>('/student/dashboard');
      return response.data;
    },
  });
}
