import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function LoadingBanner({ isLoading, isFetching, isError, lastUpdated }) {
  if (isError) {
    return (
      <div className="fixed top-20 right-6 z-50 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 text-sm">
        <AlertCircle className="h-4 w-4" strokeWidth={2} />
        <span className="font-medium">Failed to load data</span>
      </div>
    );
  }

  if (isFetching && !isLoading) {
    return (
      <div className="fixed top-20 right-6 z-50 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
        <span className="font-medium">Refreshing...</span>
      </div>
    );
  }

  if (lastUpdated && !isFetching) {
    return (
      <div className="fixed top-20 right-6 z-50 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 text-sm">
        <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
        <span className="font-medium">Data updated</span>
      </div>
    );
  }

  return null;
}