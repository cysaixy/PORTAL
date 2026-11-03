import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

interface GradeCount {
  grade: string;
  count: number;
  isSeniorHigh: boolean;
}

interface GradeSubmission {
  grade: string;
  submitted: number;
  total: number;
}

interface GradeActivity {
  id: number;
  actor: string;
  action: 'LOCK' | 'UPDATE' | 'UNLOCK';
  entity: string;
  detail: string;
  time: string;
}

interface DashboardStats {
  schoolYear: {
    id: number;
    label: string;
    isCurrent: boolean;
  };
  students: {
    total: number;
    juniorHigh: number;
    seniorHigh: number;
    byGrade: GradeCount[];
  };
  teachers: {
    total: number;
    teaching: number;
    withoutLoad: number;
  };
  sections: {
    total: number;
  };
  subjects: {
    total: number;
    withoutTeacher: number;
  };
  gradeSubmission: GradeSubmission[];
  recentActivity: GradeActivity[];
}

export const useAdminDashboard = () => {
  return useQuery<DashboardStats>({
    queryKey: ['admin', 'dashboard', 'stats'],
    queryFn: async () => {
      const response = await api.get('/admin/dashboard/stats');
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
