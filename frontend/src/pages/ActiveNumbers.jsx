import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { numbersApi } from '../services/api';
import { Phone, Trash2, Loader2, CheckCircle2, XCircle, Filter, Search } from 'lucide-react';
import { StatCard } from '../components/Card';

export default function ActiveNumbers() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [selectedNumbers, setSelectedNumbers] = useState(new Set());
  const [showBulkReleaseDialog, setShowBulkReleaseDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Fetch numbers with GHL status
  const { data, isLoading, error } = useQuery({
    queryKey: ['numbers-with-ghl-status'],
    queryFn: async () => {
      const response = await numbersApi.getNumbersWithGHLStatus();
      return response.data;
    },
    refetchInterval: 30000,
  });

  const deleteMutation = useMutation({
    mutationFn: (sid) => numbersApi.releaseNumber(sid),
    onSuccess: () => {
      queryClient.invalidateQueries(['numbers-with-ghl-status']);
      alert('Number released successfully');
    },
    onError: (error) => {
      alert(`Failed to release number: ${error.message}`);
    }
  });

  const bulkReleaseMutation = useMutation({
    mutationFn: (phoneNumbers) => numbersApi.bulkRelease(phoneNumbers),
    onSuccess: (response) => {
      queryClient.invalidateQueries(['numbers-with-ghl-status']);
      setSelectedNumbers(new Set());
      setShowBulkReleaseDialog(false);
      const result = response.data;
      alert(`Released ${result.summary.released} numbers successfully. Failed: ${result.summary.failed}`);
    },
    onError: (error) => {
      alert(`Bulk release failed: ${error.message}`);
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading numbers...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="modern-card border border-red-300 p-4">
        <p className="text-red-600 font-medium">Error loading numbers: {error.message}</p>
        <p className="text-sm text-gray-600 mt-2">Check if backend is running and GHL credentials are configured.</p>
      </div>
    );
  }

  const numbers = data?.numbers || [];
  const summary = data?.summary || { total: 0, inGHL: 0, notInGHL: 0 };
  const unassignedCount = numbers.filter(n => n.inGHL && !n.ghlData?.linkedUser).length;

  const getNumberRole = (phoneNumber) => {
    if (phoneNumber.includes('510')) return 'setter';
    if (phoneNumber.includes('650')) return 'closer';
    return 'state';
  };

  const filteredNumbers = numbers.filter(number => {
    if (filter === 'inGHL' && !number.inGHL) return false;
    if (filter === 'notInGHL' && number.inGHL) return false;
    
    if (filter === 'unassigned') {
      if (!number.inGHL) return false;
      if (number.ghlData?.linkedUser) return false;
      return true;
    }

    if (roleFilter !== 'all') {
      const role = getNumberRole(number.phoneNumber);
      if (roleFilter === 'setters' && role !== 'setter') return false;
      if (roleFilter === 'closers' && role !== 'closer') return false;
      if (roleFilter === 'states' && role !== 'state') return false;
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesPhone = number.phoneNumber.toLowerCase().includes(query);
      const matchesName = (number.friendlyName || '').toLowerCase().includes(query);
      return matchesPhone || matchesName;
    }

    return true;
  });

  const setterCount = numbers.filter(n => getNumberRole(n.phoneNumber) === 'setter').length;
  const closerCount = numbers.filter(n => getNumberRole(n.phoneNumber) === 'closer').length;
  const stateCount = numbers.filter(n => getNumberRole(n.phoneNumber) === 'state').length;

  const toggleNumber = (phoneNumber) => {
    const newSelected = new Set(selectedNumbers);
    if (newSelected.has(phoneNumber)) {
      newSelected.delete(phoneNumber);
    } else {
      newSelected.add(phoneNumber);
    }
    setSelectedNumbers(newSelected);
  };

  const toggleAll = () => {
    if (selectedNumbers.size === filteredNumbers.length) {
      setSelectedNumbers(new Set());
    } else {
      setSelectedNumbers(new Set(filteredNumbers.map(n => n.phoneNumber)));
    }
  };

  const handleBulkRelease = () => {
    if (selectedNumbers.size === 0) return;
    setShowBulkReleaseDialog(true);
  };

  const confirmBulkRelease = () => {
    const phoneNumbersArray = Array.from(selectedNumbers);
    bulkReleaseMutation.mutate(phoneNumbersArray);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Active Numbers</h2>
          <p className="mt-1 text-sm text-gray-600">Manage your Twilio numbers and GHL sync status</p>
        </div>
        
        {selectedNumbers.size > 0 && (
          <button
            onClick={handleBulkRelease}
            disabled={bulkReleaseMutation.isPending}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors shadow-md"
          >
            {bulkReleaseMutation.isPending ? (
              <Loader2 className="animate-spin h-4 w-4 mr-2" strokeWidth={2} />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" strokeWidth={2} />
            )}
            Release {selectedNumbers.size}
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <StatCard label="Total Numbers" value={summary.total} icon={Phone} color="brand" />
        <StatCard label="In GHL" value={summary.inGHL} icon={CheckCircle2} color="success" />
        <StatCard label="Not in GHL" value={summary.notInGHL} icon={XCircle} color="danger" />
        <StatCard label="Setters (510)" value={setterCount} icon={Phone} color="brand" />
        <StatCard label="Closers (650)" value={closerCount} icon={Phone} color="brand" />
        <StatCard label="State Numbers" value={stateCount} icon={Phone} color="brand" />
      </div>

      {/* Search and Filters */}
      <div className="modern-card p-4 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by phone number or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="modern-input w-full pl-10 pr-10 py-2.5 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-900 text-sm transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
            <button
              onClick={() => setRoleFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                roleFilter === 'all' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setRoleFilter('setters')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                roleFilter === 'setters' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Setters ({setterCount})
            </button>
            <button
              onClick={() => setRoleFilter('closers')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                roleFilter === 'closers' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Closers ({closerCount})
            </button>
            <button
              onClick={() => setRoleFilter('states')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                roleFilter === 'states' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              States ({stateCount})
            </button>
          </div>

          <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                filter === 'all' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              All Status
            </button>
            <button
              onClick={() => setFilter('inGHL')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                filter === 'inGHL' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              In GHL ({summary.inGHL})
            </button>
            <button
              onClick={() => setFilter('notInGHL')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                filter === 'notInGHL' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Not in GHL ({summary.notInGHL})
            </button>
            <button
              onClick={() => setFilter('unassigned')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                filter === 'unassigned' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Unassigned ({unassignedCount})
            </button>
          </div>
        </div>
      </div>

      {/* Numbers List */}
      {filteredNumbers.length === 0 ? (
        <div className="modern-card p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
            <Phone className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-900 mb-1">No numbers found</p>
          <p className="text-xs text-gray-500">
            {searchQuery 
              ? `No results for "${searchQuery}"`
              : 'Try adjusting your filters'
            }
          </p>
          {(searchQuery || filter !== 'all' || roleFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilter('all');
                setRoleFilter('all');
              }}
              className="mt-4 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="modern-card overflow-hidden">
          {/* Header */}
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={selectedNumbers.size === filteredNumbers.length && filteredNumbers.length > 0}
                onChange={toggleAll}
                className="h-4 w-4 text-blue-600 bg-gray-100 rounded border-gray-300 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 transition-colors"
              />
              <span className="ml-3 text-xs font-semibold text-gray-700">
                {selectedNumbers.size > 0 ? `${selectedNumbers.size} selected` : `${filteredNumbers.length} numbers`}
              </span>
            </div>
          </div>

          {/* List */}
          <div className="divide-y divide-gray-100">
            {filteredNumbers.map((number) => {
              const role = getNumberRole(number.phoneNumber);
              const roleBadges = {
                setter: <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">510</span>,
                closer: <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">650</span>,
                state: <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-medium">State</span>
              };

              return (
                <div
                  key={number.sid}
                  className={`flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors ${
                    selectedNumbers.has(number.phoneNumber) ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={selectedNumbers.has(number.phoneNumber)}
                      onChange={() => toggleNumber(number.phoneNumber)}
                      className="h-4 w-4 text-blue-600 bg-gray-100 rounded border-gray-300 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 transition-colors"
                    />
                    
                    <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" strokeWidth={2} />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-mono text-sm font-semibold text-gray-900">
                          {number.phoneNumber}
                        </p>
                        {roleBadges[role]}
                        {number.inGHL ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <CheckCircle2 className="h-3 w-3 mr-1" strokeWidth={2} />
                            GHL
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            <XCircle className="h-3 w-3 mr-1" strokeWidth={2} />
                            Not Synced
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {number.inGHL && number.ghlData?.friendlyName 
                          ? number.ghlData.friendlyName
                          : number.friendlyName || 'No name'}
                        {number.inGHL && number.ghlData?.linkedUser && (
                          <span className="ml-2 text-blue-600">• Assigned</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (window.confirm(`Release ${number.phoneNumber}?`)) {
                        deleteMutation.mutate(number.sid);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="text-red-600 hover:text-red-700 flex items-center disabled:opacity-50 transition-colors px-3 py-1.5 rounded-md hover:bg-red-50 text-xs font-medium flex-shrink-0"
                  >
                    {deleteMutation.isPending ? (
                      <Loader2 className="animate-spin h-3.5 w-3.5 mr-1" strokeWidth={2} />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5 mr-1" strokeWidth={2} />
                    )}
                    Release
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-xs text-gray-500 text-center">
        Showing {filteredNumbers.length} of {summary.total} numbers
        {selectedNumbers.size > 0 && ` • ${selectedNumbers.size} selected`}
      </div>

      {/* Bulk Release Dialog */}
      {showBulkReleaseDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3">
                Confirm Bulk Release
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Release <span className="font-bold text-red-600">{selectedNumbers.size} numbers</span>? This cannot be undone.
              </p>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 max-h-48 overflow-y-auto">
                <p className="text-xs font-semibold text-gray-700 mb-2">Numbers:</p>
                <ul className="space-y-1">
                  {Array.from(selectedNumbers).map(phone => (
                    <li key={phone} className="text-xs font-mono text-gray-600">
                      {phone}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowBulkReleaseDialog(false)}
                  disabled={bulkReleaseMutation.isPending}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmBulkRelease}
                  disabled={bulkReleaseMutation.isPending}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center transition-colors shadow-sm"
                >
                  {bulkReleaseMutation.isPending ? (
                    <>
                      <Loader2 className="animate-spin h-4 w-4 mr-2" strokeWidth={2} />
                      Releasing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" strokeWidth={2} />
                      Release All
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
