import { useAuth } from '../../contexts/AuthContext';

export default function AdminDashboard() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="container-custom py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Portal</h1>
            <p className="text-sm text-gray-600">Welcome, Administrator</p>
          </div>
          <button
            onClick={signOut}
            className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container-custom py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Dashboard Card - Students */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Students</h2>
            </div>
            <p className="text-3xl font-bold text-gray-900">850</p>
            <p className="text-sm text-gray-600 mt-1">Enrolled this year</p>
          </div>

          {/* Dashboard Card - Teachers */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Teachers</h2>
            </div>
            <p className="text-3xl font-bold text-gray-900">45</p>
            <p className="text-sm text-gray-600 mt-1">Active faculty</p>
          </div>

          {/* Dashboard Card - Sections */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Sections</h2>
            </div>
            <p className="text-3xl font-bold text-gray-900">24</p>
            <p className="text-sm text-gray-600 mt-1">Grades 7-12</p>
          </div>

          {/* Dashboard Card - Subjects */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Subjects</h2>
            </div>
            <p className="text-3xl font-bold text-gray-900">65</p>
            <p className="text-sm text-gray-600 mt-1">Total subjects</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button className="bg-white rounded-lg shadow p-6 text-left hover:shadow-md transition-shadow">
              <h4 className="font-semibold text-gray-900">Manage Students</h4>
              <p className="text-sm text-gray-600 mt-1">Add, edit, or remove students</p>
            </button>
            <button className="bg-white rounded-lg shadow p-6 text-left hover:shadow-md transition-shadow">
              <h4 className="font-semibold text-gray-900">Manage Teachers</h4>
              <p className="text-sm text-gray-600 mt-1">Add, edit, or remove teachers</p>
            </button>
            <button className="bg-white rounded-lg shadow p-6 text-left hover:shadow-md transition-shadow">
              <h4 className="font-semibold text-gray-900">Manage Sections</h4>
              <p className="text-sm text-gray-600 mt-1">Create and organize sections</p>
            </button>
          </div>
        </div>

        {/* Coming Soon */}
        <div className="mt-8 bg-white rounded-lg shadow p-8 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Coming Soon</h3>
          <p className="text-gray-600">
            Full admin dashboard with school year management, user management, and audit logs will be available soon.
          </p>
        </div>
      </main>
    </div>
  );
}
