export default function GameDetailLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Skeleton header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="h-8 w-48 bg-gray-200 rounded skeleton-shimmer" />
            <div className="h-5 w-12 bg-gray-200 rounded skeleton-shimmer" />
          </div>
        </div>
      </div>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link placeholder */}
        <div className="h-5 w-32 bg-gray-200 rounded skeleton-shimmer mb-6" />
        {/* Title placeholder */}
        <div className="h-9 w-72 bg-gray-200 rounded skeleton-shimmer mb-2" />
        <div className="h-6 w-24 bg-gray-200 rounded skeleton-shimmer mb-8" />
        {/* Stats card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="h-6 w-40 bg-gray-200 rounded skeleton-shimmer mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i}>
                <div className="h-4 w-16 bg-gray-200 rounded skeleton-shimmer mb-2" />
                <div className="h-9 w-12 bg-gray-200 rounded skeleton-shimmer" />
              </div>
            ))}
          </div>
        </div>
        {/* Mental state card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="h-6 w-32 bg-gray-200 rounded skeleton-shimmer mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i}>
                <div className="h-4 w-20 bg-gray-200 rounded skeleton-shimmer mb-2" />
                <div className="h-9 w-10 bg-gray-200 rounded skeleton-shimmer" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
