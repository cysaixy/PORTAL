import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useToast } from '../components/Toast';
import type { GradeLevel, SchoolYear, Section, Strand, Subject, TeacherLite } from '../types';

const get = <T,>(url: string) => api.get<T>(url).then((r) => r.data);

export const useGradeLevels = () =>
  useQuery({ queryKey: ['admin', 'grade-levels'], queryFn: () => get<{ gradeLevels: GradeLevel[] }>('/admin/grade-levels').then((d) => d.gradeLevels), staleTime: 5 * 60_000 });

export const useStrands = () =>
  useQuery({ queryKey: ['admin', 'strands'], queryFn: () => get<{ strands: Strand[] }>('/admin/strands').then((d) => d.strands), staleTime: 5 * 60_000 });

export const useSchoolYears = () =>
  useQuery({ queryKey: ['admin', 'school-years'], queryFn: () => get<{ schoolYears: SchoolYear[] }>('/admin/school-years').then((d) => d.schoolYears) });

export const useAllTeachers = () =>
  useQuery({
    queryKey: ['admin', 'teachers', 'all'],
    queryFn: () => get<{ teachers: (TeacherLite & { user: { isActive: boolean } })[] }>('/admin/teachers?limit=500').then((d) => d.teachers),
    staleTime: 60_000,
  });

export const useAllSections = (schoolYearId?: string) =>
  useQuery({
    queryKey: ['admin', 'sections', 'all', schoolYearId ?? 'current'],
    queryFn: () => get<{ sections: Section[] }>(`/admin/sections?limit=500${schoolYearId ? `&schoolYearId=${schoolYearId}` : ''}`).then((d) => d.sections),
    staleTime: 60_000,
  });

export const useAllSubjects = () =>
  useQuery({ queryKey: ['admin', 'subjects', 'all'], queryFn: () => get<{ subjects: Subject[] }>('/admin/subjects?limit=500').then((d) => d.subjects), staleTime: 60_000 });

/**
 * Standard mutation for admin CRUD: toasts on success/error and invalidates the
 * given query prefixes.
 */
export function useApiMutation<TVars>(
  fn: (vars: TVars) => Promise<unknown>,
  { success, invalidate = [], onSuccess }: { success?: string | ((v: TVars) => string); invalidate?: unknown[][]; onSuccess?: (v: TVars) => void } = {}
) {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: fn,
    onSuccess: (_d, vars) => {
      invalidate.forEach((key) => qc.invalidateQueries({ queryKey: key }));
      if (success) toast.success(typeof success === 'function' ? success(vars) : success);
      onSuccess?.(vars);
    },
    onError: (e) => toast.error(e),
  });
}

/** Debounce a value (for search boxes). */
export function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
