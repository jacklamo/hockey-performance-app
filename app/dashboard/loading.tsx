export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Skeleton header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="h-8 w-56 bg-gray-200 rounded skeleton-shimmer" />
            <div className="h-5 w-12 bg-gray-200 rounded skeleton-shimmer" />
          </div>
        </div>
      </div>
      {/* Skeleton main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 4 stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="h-4 w-24 bg-gray-200 rounded skeleton-shimmer mb-3" />
              <div className="h-10 w-16 bg-gray-200 rounded skeleton-shimmer" />
            </div>
          ))}
        </div>
        {/* Recent games table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="h-12 bg-gray-50 border-b border-gray-200" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-6 px-6 py-4 border-b border-gray-100">
              <div className="h-4 w-20 bg-gray-200 rounded skeleton-shimmer" />
              <div className="h-4 w-28 bg-gray-200 rounded skeleton-shimmer" />
              <div className="h-4 w-12 bg-gray-200 rounded skeleton-shimmer" />
              <div className="h-4 w-10 bg-gray-200 rounded skeleton-shimmer" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
