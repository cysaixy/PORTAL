import { useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { Modal } from '../../components/Modal';
import { ADMIN_NAV } from '../../constants/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';

interface Student {
  id: string;
  lrn: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  suffix?: string;
  birthdate: string;
  sex: 'M' | 'F';
  guardianName: string;
  guardianContact: string;
  guardianEmail?: string;
  address: string;
  user: {
    email: string;
    isActive: boolean;
  };
  enrollments: Array<{
    section: {
      name: string;
      gradeLevel: {
        name: string;
      };
    };
  }>;
}

interface StudentFormData {
  email: string;
  lrn: string;
  firstName: string;
  lastName: string;
  birthdate: string;
  sex: 'M' | 'F';
  guardianName: string;
  guardianContact: string;
  guardianEmail: string;
  address: string;
  role: 'STUDENT';
}

export default function AdminStudents() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  const { data: response, isLoading } = useQuery({
    queryKey: ['admin', 'students'],
    queryFn: async () => {
      const response = await api.get<{ students: Student[]; pagination: any }>('/admin/students?limit=1000');
      return response.data;
    },
  });

  const students = response?.students;

  const createStudentMutation = useMutation({
    mutationFn: async (data: StudentFormData) => {
      const response = await api.post('/admin/students', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'students'] });
      setIsAddModalOpen(false);
    },
  });

  const deleteStudentMutation = useMutation({
    mutationFn: async (studentId: string) => {
      await api.delete(`/admin/students/${studentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'students'] });
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data: StudentFormData = {
      email: formData.get('email') as string,
      lrn: formData.get('lrn') as string,
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      birthdate: formData.get('birthdate') as string,
      sex: formData.get('sex') as 'M' | 'F',
      guardianName: formData.get('guardianName') as string,
      guardianContact: formData.get('guardianContact') as string,
      guardianEmail: formData.get('guardianEmail') as string,
      address: formData.get('address') as string,
      role: 'STUDENT',
    };

    createStudentMutation.mutate(data);
  };

  const handleDelete = async (studentId: string, studentName: string) => {
    if (confirm(`Are you sure you want to delete ${studentName}? This action cannot be undone.`)) {
      deleteStudentMutation.mutate(studentId);
    }
  };

  const filteredStudents = students?.filter(student => {
    const query = searchQuery.toLowerCase();
    return (
      student.firstName.toLowerCase().includes(query) ||
      student.lastName.toLowerCase().includes(query) ||
      student.lrn.includes(query) ||
      student.user.email.toLowerCase().includes(query)
    );
  });

  return (
    <DashboardLayout
      title="Students"
      subtitle="Manage student records and enrollments."
      nav={ADMIN_NAV}
      schoolYear="SY 2024–2025"
    >
      <div className="col-span-12">
        <div className="bg-white border border-[#E8E2DE] rounded-[16px] p-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h2 className="text-[18px] font-800 text-[#1B1F3B]">Students</h2>
              <p className="text-[12px] text-[#6B6B6B] mt-1">
                {students?.length || 0} total students
              </p>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <input
                type="text"
                placeholder="Search by name, LRN, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 md:w-64 px-4 py-2 rounded-full border border-[#E8E2DE] text-[13px] focus:outline-none focus:border-[#6B0A0F]"
              />
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-6 py-2.5 rounded-full bg-[#FFD21F] text-[#1B1F3B] text-[13px] font-semibold hover:bg-[#E6C200] whitespace-nowrap"
              >
                Add Student
              </button>
            </div>
          </div>

          {/* Table */}
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
                      <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider">LRN</th>
                      <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider">Email</th>
                      <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider">Section</th>
                      <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider">Sex</th>
                      <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E2DE]">
                    {filteredStudents && filteredStudents.length > 0 ? (
                      filteredStudents.map((student) => (
                        <tr key={student.id} className="hover:bg-[#FFF1C2]/30 transition-colors">
                          <td className="px-4 py-3 text-[#1B1F3B] font-medium">{student.lrn}</td>
                          <td className="px-4 py-3 text-[#1B1F3B]">
                            {student.firstName} {student.lastName}
                          </td>
                          <td className="px-4 py-3 text-[#6B6B6B]">{student.user.email}</td>
                          <td className="px-4 py-3 text-[#6B6B6B]">
                            {student.enrollments && student.enrollments.length > 0
                              ? student.enrollments[0].section.name
                              : 'Not enrolled'}
                          </td>
                          <td className="px-4 py-3 text-[#6B6B6B]">{student.sex}</td>
                          <td className="px-4 py-3">
                            {student.user.isActive ? (
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
                              onClick={() => handleDelete(student.id, `${student.firstName} ${student.lastName}`)}
                              className="text-[12px] text-red-600 hover:text-red-800 font-medium"
                              disabled={deleteStudentMutation.isPending}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-[#6B6B6B]">
                          {searchQuery ? 'No students found matching your search.' : 'No students yet. Click "Add Student" to get started.'}
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

      {/* Add Student Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Student"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Email */}
            <div className="md:col-span-2">
              <label className="block text-[13px] font-semibold text-[#1B1F3B] mb-1">
                Email <span className="text-red-600">*</span>
              </label>
              <input
                type="email"
                name="email"
                required
                className="w-full px-4 py-2 rounded-lg border border-[#E8E2DE] text-[13px] focus:outline-none focus:border-[#6B0A0F]"
                placeholder="student@example.com"
              />
            </div>

            {/* LRN */}
            <div>
              <label className="block text-[13px] font-semibold text-[#1B1F3B] mb-1">
                LRN (12 digits) <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                name="lrn"
                required
                maxLength={12}
                pattern="[0-9]{12}"
                className="w-full px-4 py-2 rounded-lg border border-[#E8E2DE] text-[13px] focus:outline-none focus:border-[#6B0A0F]"
                placeholder="120240000101"
              />
            </div>

            {/* Sex */}
            <div>
              <label className="block text-[13px] font-semibold text-[#1B1F3B] mb-1">
                Sex <span className="text-red-600">*</span>
              </label>
              <select
                name="sex"
                required
                className="w-full px-4 py-2 rounded-lg border border-[#E8E2DE] text-[13px] focus:outline-none focus:border-[#6B0A0F]"
              >
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </div>

            {/* First Name */}
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

            {/* Last Name */}
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

            {/* Birthdate */}
            <div>
              <label className="block text-[13px] font-semibold text-[#1B1F3B] mb-1">
                Birthdate <span className="text-red-600">*</span>
              </label>
              <input
                type="date"
                name="birthdate"
                required
                className="w-full px-4 py-2 rounded-lg border border-[#E8E2DE] text-[13px] focus:outline-none focus:border-[#6B0A0F]"
              />
            </div>

            {/* Guardian Name */}
            <div>
              <label className="block text-[13px] font-semibold text-[#1B1F3B] mb-1">
                Guardian Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                name="guardianName"
                required
                className="w-full px-4 py-2 rounded-lg border border-[#E8E2DE] text-[13px] focus:outline-none focus:border-[#6B0A0F]"
              />
            </div>

            {/* Guardian Contact */}
            <div>
              <label className="block text-[13px] font-semibold text-[#1B1F3B] mb-1">
                Guardian Contact <span className="text-red-600">*</span>
              </label>
              <input
                type="tel"
                name="guardianContact"
                required
                className="w-full px-4 py-2 rounded-lg border border-[#E8E2DE] text-[13px] focus:outline-none focus:border-[#6B0A0F]"
                placeholder="+639171234567"
              />
            </div>

            {/* Guardian Email */}
            <div>
              <label className="block text-[13px] font-semibold text-[#1B1F3B] mb-1">
                Guardian Email <span className="text-red-600">*</span>
              </label>
              <input
                type="email"
                name="guardianEmail"
                required
                className="w-full px-4 py-2 rounded-lg border border-[#E8E2DE] text-[13px] focus:outline-none focus:border-[#6B0A0F]"
              />
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <label className="block text-[13px] font-semibold text-[#1B1F3B] mb-1">
                Address <span className="text-red-600">*</span>
              </label>
              <textarea
                name="address"
                required
                rows={2}
                className="w-full px-4 py-2 rounded-lg border border-[#E8E2DE] text-[13px] focus:outline-none focus:border-[#6B0A0F]"
                placeholder="Complete address"
              />
            </div>
          </div>

          {/* Error Message */}
          {createStudentMutation.isError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-[12px] text-red-800">
                Error: {(createStudentMutation.error as any)?.response?.data?.error || 'Failed to create student'}
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-6 py-2.5 rounded-full border border-[#E8E2DE] text-[#1B1F3B] text-[13px] font-semibold hover:bg-[#F4F2EF]"
              disabled={createStudentMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createStudentMutation.isPending}
              className="px-6 py-2.5 rounded-full bg-[#6B0A0F] text-white text-[13px] font-semibold hover:bg-[#5A0808] disabled:opacity-50"
            >
              {createStudentMutation.isPending ? 'Adding...' : 'Add Student'}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
