import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { numbersApi } from '../services/api';
import { 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ExternalLink,
  Copy,
  Phone,
  Loader2
} from 'lucide-react';
import { StatCard } from '../components/Card';

export default function GHLIntegration() {
  const [copiedNumber, setCopiedNumber] = useState(null);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['numbers-with-ghl-status'],
    queryFn: async () => {
      const response = await numbersApi.getNumbersWithGHLStatus();
      return response.data;
    },
    refetchInterval: 30000,
  });

  const numbers = data?.numbers || [];
  const summary = data?.summary || { total: 0, inGHL: 0, notInGHL: 0 };
  const numbersNotInGHL = numbers.filter(n => !n.inGHL);
  const numbersInGHL = numbers.filter(n => n.inGHL);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedNumber(text);
    setTimeout(() => setCopiedNumber(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading sync status...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="modern-card border border-red-300 p-4">
        <p className="text-red-600 font-medium">Error loading sync status: {error.message}</p>
        <p className="text-sm text-gray-600 mt-2">Check if backend is running and GHL credentials are configured.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">GHL Integration</h2>
          <p className="mt-1 text-sm text-gray-600">Sync status and manual sync workflow</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-md"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} strokeWidth={2} />
          {isFetching ? 'Refreshing...' : 'Refresh Status'}
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total Numbers" value={summary.total} icon={Phone} color="brand" />
        <StatCard 
          label="Synced to GHL" 
          value={summary.inGHL}
          icon={CheckCircle2} 
          color="success"
        />
        <StatCard 
          label="Need Manual Sync" 
          value={summary.notInGHL}
          icon={XCircle} 
          color="danger"
        />
      </div>

      {/* Alert Box if numbers need syncing */}
      {summary.notInGHL > 0 && (
        <div className="modern-card border border-yellow-300 p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" strokeWidth={2} />
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-semibold text-gray-900">
                Action Required: {summary.notInGHL} number{summary.notInGHL > 1 ? 's' : ''} need{summary.notInGHL === 1 ? 's' : ''} to be added to GHL
              </h3>
              <p className="mt-1 text-xs text-gray-600">
                These numbers are in Twilio but not in GoHighLevel. Follow the manual sync instructions below.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success message if all synced */}
      {summary.notInGHL === 0 && summary.total > 0 && (
        <div className="modern-card border border-blue-300 p-4">
          <div className="flex items-start">
            <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" strokeWidth={2} />
            <div className="ml-3">
              <h3 className="text-sm font-semibold text-gray-900">
                All numbers synced ✓
              </h3>
              <p className="mt-1 text-xs text-gray-600">
                All {summary.total} Twilio numbers are present in GoHighLevel.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Manual Sync Instructions */}
      {summary.notInGHL > 0 && (
        <div className="modern-card overflow-hidden">
          <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center">
              <AlertCircle className="h-4 w-4 text-blue-600 mr-2" strokeWidth={2} />
              Manual Sync Instructions
            </h3>
          </div>
          <div className="p-5 space-y-3">
            <p className="text-xs text-gray-600">
              Since GHL API doesn't support automatic number addition, follow these steps:
            </p>
            
            <ol className="space-y-3 text-xs text-gray-700">
              <li className="flex items-start">
                <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-blue-600 text-white rounded-full text-xs font-bold mr-2">1</span>
                <div>
                  <span className="font-semibold">Open GHL Phone System</span>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Go to <a href="https://app.gohighlevel.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center">
                      GoHighLevel Dashboard <ExternalLink className="h-3 w-3 ml-1" />
                    </a> → Settings → Phone Numbers
                  </p>
                </div>
              </li>
              
              <li className="flex items-start">
                <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-blue-600 text-white rounded-full text-xs font-bold mr-2">2</span>
                <div>
                  <span className="font-semibold">Add Each Number</span>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Click "Add Number" and enter each number from the list below. Use the copy button for easy pasting.
                  </p>
                </div>
              </li>
              
              <li className="flex items-start">
                <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-blue-600 text-white rounded-full text-xs font-bold mr-2">3</span>
                <div>
                  <span className="font-semibold">Verify Sync</span>
                  <p className="text-xs text-gray-600 mt-0.5">
                    After adding numbers in GHL, click "Refresh Status" button above to verify.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </div>
      )}

      {/* Numbers NOT in GHL */}
      {numbersNotInGHL.length > 0 && (
        <div className="modern-card overflow-hidden">
          <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                <XCircle className="h-4 w-4 text-red-600 mr-2" strokeWidth={2} />
                Numbers Missing from GHL
              </h3>
              <span className="text-xs font-semibold text-gray-600">
                {numbersNotInGHL.length} numbers
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              These numbers need to be manually added to GoHighLevel
            </p>
          </div>
          <div className="divide-y divide-gray-100">
            {numbersNotInGHL.map((number) => (
              <div key={number.sid} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" strokeWidth={2} />
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-semibold text-gray-900">
                      {number.phoneNumber}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {number.friendlyName || 'No name'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(number.phoneNumber)}
                  className="text-blue-600 hover:text-blue-700 flex items-center transition-colors px-3 py-1.5 rounded-md hover:bg-blue-50 text-xs font-medium flex-shrink-0"
                >
                  {copiedNumber === number.phoneNumber ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600 mr-1" strokeWidth={2} />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 mr-1" strokeWidth={2} />
                      Copy
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Numbers IN GHL (Success List) */}
      {numbersInGHL.length > 0 && (
        <div className="modern-card overflow-hidden">
          <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                <CheckCircle2 className="h-4 w-4 text-blue-600 mr-2" strokeWidth={2} />
                Successfully Synced to GHL
              </h3>
              <span className="text-xs font-semibold text-gray-600">
                {numbersInGHL.length} numbers
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              These numbers are present in both Twilio and GoHighLevel
            </p>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {numbersInGHL.map((number) => (
                <div
                  key={number.sid}
                  className="flex items-start p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <CheckCircle2 className="h-4 w-4 text-blue-600 mr-2 flex-shrink-0 mt-0.5" strokeWidth={2} />
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs font-semibold text-gray-900 truncate">
                      {number.phoneNumber}
                    </p>
                    <p className="text-xs text-gray-600 truncate mt-0.5">
                      {number.friendlyName || 'No friendly name'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Last Updated */}
      <div className="text-center text-xs text-gray-500">
        Last checked: {new Date().toLocaleTimeString()} • Auto-refreshes every 30 seconds
      </div>
    </div>
  );
}