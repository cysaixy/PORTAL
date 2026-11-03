import { useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { Modal } from '../../components/Modal';
import { ADMIN_NAV } from '../../constants/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  suffix?: string;
  department?: string;
  user: {
    email: string;
    isActive: boolean;
  };
  assignments: Array<{
    section: {
      name: string;
    };
    subject: {
      title: string;
    };
  }>;
}

interface TeacherFormData {
  email: string;
  firstName: string;
  lastName: string;
  department?: string;
  role: 'TEACHER';
}

export default function AdminTeachers() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  const { data: response, isLoading } = useQuery({
    queryKey: ['admin', 'teachers'],
    queryFn: async () => {
      const response = await api.get<{ teachers: Teacher[]; pagination: any }>('/admin/teachers?limit=1000');
      return response.data;
    },
  });

  const teachers = response?.teachers;

  const createTeacherMutation = useMutation({
    mutationFn: async (data: TeacherFormData) => {
      const response = await api.post('/admin/teachers', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'teachers'] });
      setIsAddModalOpen(false);
    },
  });

  const deleteTeacherMutation = useMutation({
    mutationFn: async (teacherId: string) => {
      await api.delete(`/admin/teachers/${teacherId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'teachers'] });
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data: TeacherFormData = {
      email: formData.get('email') as string,
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      department: (formData.get('department') as string) || undefined,
      role: 'TEACHER',
    };

    createTeacherMutation.mutate(data);
  };

  const handleDelete = async (teacherId: string, teacherName: string) => {
    if (confirm(`Are you sure you want to delete ${teacherName}?`)) {
      deleteTeacherMutation.mutate(teacherId);
    }
  };

  const filteredTeachers = teachers?.filter(teacher => {
    const query = searchQuery.toLowerCase();
    return (
      teacher.firstName.toLowerCase().includes(query) ||
      teacher.lastName.toLowerCase().includes(query) ||
      teacher.user.email.toLowerCase().includes(query) ||
      (teacher.department && teacher.department.toLowerCase().includes(query))
    );
  });

  return (
    <DashboardLayout
      title="Teachers"
      subtitle="Manage teacher accounts and assignments."
      nav={ADMIN_NAV}
      schoolYear="SY 2024–2025"
    >
      <div className="col-span-12">
        <div className="bg-white border border-[#E8E2DE] rounded-[16px] p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h2 className="text-[18px] font-800 text-[#1B1F3B]">Teachers</h2>
              <p className="text-[12px] text-[#6B6B6B] mt-1">
                {teachers?.length || 0} total teachers
              </p>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <input
                type="text"
                placeholder="Search by name, email, or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 md:w-64 px-4 py-2 rounded-full border border-[#E8E2DE] text-[13px] focus:outline-none focus:border-[#6B0A0F]"
              />
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-6 py-2.5 rounded-full bg-[#FFD21F] text-[#1B1F3B] text-[13px] font-semibold hover:bg-[#E6C200] whitespace-nowrap"
              >
                Add Teacher
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6B0A0F]"></div>
            </div>
          ) : (
            <div className="border border-[#E8E2DE] rounded-[8px] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="bg-[#F4F2EF]">
                      <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider">Email</th>
                      <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider">Department</th>
                      <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider">Assignments</th>
                      <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E2DE]">
                    {filteredTeachers && filteredTeachers.length > 0 ? (
                      filteredTeachers.map((teacher) => (
                        <tr key={teacher.id} className="hover:bg-[#FFF1C2]/30 transition-colors">
                          <td className="px-4 py-3 text-[#1B1F3B] font-medium">
                            {teacher.firstName} {teacher.lastName}
                          </td>
                          <td className="px-4 py-3 text-[#6B6B6B]">{teacher.user.email}</td>
                          <td className="px-4 py-3 text-[#6B6B6B]">{teacher.department || '—'}</td>
                          <td className="px-4 py-3 text-[#6B6B6B]">
                            {teacher.assignments?.length || 0} sections
                          </td>
                          <td className="px-4 py-3">
                            {teacher.user.isActive ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800 text-[10px] font-semibold">
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-[10px] font-semibold">
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleDelete(teacher.id, `${teacher.firstName} ${teacher.lastName}`)}
                              className="text-[12px] text-red-600 hover:text-red-800 font-medium"
                              disabled={deleteTeacherMutation.isPending}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-[#6B6B6B]">
                          {searchQuery ? 'No teachers found matching your search.' : 'No teachers yet. Click "Add Teacher" to get started.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Teacher"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[13px] font-semibold text-[#1B1F3B] mb-1">
                Email <span className="text-red-600">*</span>
              </label>
              <input
                type="email"
                name="email"
                required
                className="w-full px-4 py-2 rounded-lg border border-[#E8E2DE] text-[13px] focus:outline-none focus:border-[#6B0A0F]"
                placeholder="teacher@loa.edu.ph"
              />
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-[#1B1F3B] mb-1">
                First Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                name="firstName"
                required
                className="w-full px-4 py-2 rounded-lg border border-[#E8E2DE] text-[13px] focus:outline-none focus:border-[#6B0A0F]"
              />
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-[#1B1F3B] mb-1">
                Last Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                name="lastName"
                required
                className="w-full px-4 py-2 rounded-lg border border-[#E8E2DE] text-[13px] focus:outline-none focus:border-[#6B0A0F]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[13px] font-semibold text-[#1B1F3B] mb-1">
                Department (optional)
              </label>
              <input
                type="text"
                name="department"
                className="w-full px-4 py-2 rounded-lg border border-[#E8E2DE] text-[13px] focus:outline-none focus:border-[#6B0A0F]"
                placeholder="e.g., Mathematics, Science, English"
              />
            </div>
          </div>

          {createTeacherMutation.isError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-[12px] text-red-800">
                Error: {(createTeacherMutation.error as any)?.response?.data?.error || 'Failed to create teacher'}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-6 py-2.5 rounded-full border border-[#E8E2DE] text-[#1B1F3B] text-[13px] font-semibold hover:bg-[#F4F2EF]"
              disabled={createTeacherMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createTeacherMutation.isPending}
              className="px-6 py-2.5 rounded-full bg-[#6B0A0F] text-white text-[13px] font-semibold hover:bg-[#5A0808] disabled:opacity-50"
            >
              {createTeacherMutation.isPending ? 'Adding...' : 'Add Teacher'}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
