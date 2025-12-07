import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { numbersApi, ghlApi } from '../services/api';
import { ShoppingCart, Loader2, CheckCircle, AlertCircle, Search, Phone, Users, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';


export default function BulkPurchase() {
  const [selectedStates, setSelectedStates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [purchaseMode, setPurchaseMode] = useState('states'); // 'states', 'setter', 'closer'
  const [selectedSetters, setSelectedSetters] = useState([]);
  const [setterSearchTerm, setSetterSearchTerm] = useState('');

  // Fetch all states
  const { data: statesData, isLoading } = useQuery({
    queryKey: ['states'],
    queryFn: async () => {
      const response = await numbersApi.getStates();
      return response.data;
    }
  });

  // Fetch GHL users for setter purchase
  const { data: usersData, isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ['ghl-users'],
    queryFn: async () => {
      const response = await ghlApi.getUsers();
      return response.data;
    },
    enabled: purchaseMode === 'setter',
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    staleTime: 20000 // Consider data stale after 20 seconds
  });

  const queryClient = useQueryClient();

  // Fetch all numbers to show recent purchases
  const { data: numbersData } = useQuery({
    queryKey: ['numbers'],
    queryFn: async () => {
      const response = await numbersApi.getAllNumbers();
      return response.data;
    },
    refetchInterval: 10000
  });

  // Helper function to format time ago
  const formatTimeAgo = (dateCreated) => {
    const now = new Date();
    const purchaseDate = new Date(dateCreated);
    const diffMs = now - purchaseDate;
    const diffMins = Math.round(diffMs / (1000 * 60));
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return `${diffMins} min ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }
  };

  // Filter numbers purchased in last 12 hours
  const recentPurchases = (numbersData?.numbers?.filter(num => {
    const purchaseDate = new Date(num.dateCreated);
    const now = new Date();
    const hoursDiff = (now - purchaseDate) / (1000 * 60 * 60);
    return hoursDiff <= 12;
  }) || []).sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated));

  // Helper function to determine role
  const getNumberRole = (phoneNumber) => {
    if (phoneNumber.includes('510')) return 'setter';
    if (phoneNumber.includes('650')) return 'closer';
    return 'state';
  };

  // Count recent purchases by role
  const recentSetters = recentPurchases.filter(n => getNumberRole(n.phoneNumber) === 'setter').length;
  const recentClosers = recentPurchases.filter(n => getNumberRole(n.phoneNumber) === 'closer').length;
  const recentStates = recentPurchases.filter(n => getNumberRole(n.phoneNumber) === 'state').length;

  // Bulk purchase mutation
  const purchaseMutation = useMutation({
    mutationFn: (states) => numbersApi.bulkPurchaseByState(states),
    onSuccess: (data) => {
      const summary = data.data.summary;
      alert(`Success! Purchased ${summary.purchased} numbers for ${summary.purchased} states`);
      setSelectedStates([]);
      queryClient.invalidateQueries(['numbers']);
    },
    onError: (error) => {
      alert(`Failed: ${error.response?.data?.error || error.message}`);
    }
  });

  // Quick purchase mutation for Setter/Closer
  const quickPurchaseMutation = useMutation({
    mutationFn: ({ areaCode, friendlyName }) => numbersApi.quickPurchase(areaCode, friendlyName),
    onSuccess: (data) => {
      const number = data.data.number;
      alert(`Success! Purchased ${number.phoneNumber}\n\nNumber SID: ${number.sid}\n\nYou can now assign this to a user in GHL.`);
      queryClient.invalidateQueries(['numbers']);
    },
    onError: (error) => {
      alert(`Failed: ${error.response?.data?.error || error.message}`);
    }
  });

  // Bulk setter purchase mutation
  const bulkSetterPurchaseMutation = useMutation({
    mutationFn: (users) => numbersApi.bulkPurchaseSetters(users),
    onSuccess: (data) => {
      const summary = data.data.summary;
      const results = data.data.results;
      
      let message = `Bulk Purchase Complete!\n\n`;
      message += `✅ Purchased: ${summary.purchased}\n`;
      if (summary.failed > 0) {
        message += `❌ Failed: ${summary.failed}\n\n`;
        message += `Failed users:\n`;
        results.failed.forEach(f => {
          message += `• ${f.user}: ${f.error}\n`;
        });
      }
      
      alert(message);
      setSelectedSetters([]);
      queryClient.invalidateQueries(['numbers']);
    },
    onError: (error) => {
      alert(`Failed: ${error.response?.data?.error || error.message}`);
    }
  });

  // Sync GHL users mutation (to get latest users from GHL)
  const syncUsersMutation = useMutation({
    mutationFn: () => ghlApi.syncUsers(),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['ghl-users']);
      const totals = data.data.totals;
      alert(`✅ Users Synced!\n\nAdded: ${totals.added} new users\nUpdated: ${totals.updated} existing users\nTotal from GHL: ${totals.fromApi}`);
    },
    onError: (error) => {
      alert(`❌ Sync Failed: ${error.response?.data?.error || error.message}`);
    }
  });

  const handleStateToggle = (stateName) => {
    setSelectedStates(prev => 
      prev.includes(stateName) 
        ? prev.filter(s => s !== stateName)
        : [...prev, stateName]
    );
  };

  const handleSelectAll = () => {
    if (selectedStates.length === statesData?.states.length) {
      setSelectedStates([]);
    } else {
      setSelectedStates(statesData?.states.map(s => s.name) || []);
    }
  };

  const handleSetterToggle = (userId) => {
    setSelectedSetters(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAllSetters = () => {
    const allUsers = usersData?.users || [];
    if (selectedSetters.length === allUsers.length) {
      setSelectedSetters([]);
    } else {
      setSelectedSetters(allUsers.map(u => u.id || u.userId || u.ghlUserId));
    }
  };

  const handlePurchase = () => {
    if (selectedStates.length === 0) {
      alert('Please select at least one state');
      return;
    }

    if (!window.confirm(`Purchase ${selectedStates.length} numbers (1 per state)?\n\nStates: ${selectedStates.join(', ')}`)) {
      return;
    }

    purchaseMutation.mutate(selectedStates);
  };

  const handleQuickPurchase = () => {
    const areaCode = purchaseMode === 'setter' ? '510' : '650';
    const role = purchaseMode === 'setter' ? 'Setter' : 'Closer';
    
    if (!window.confirm(`Purchase 1 ${role} number with area code ${areaCode}?`)) {
      return;
    }

    quickPurchaseMutation.mutate({ 
      areaCode, 
      friendlyName: null
    });
  };

  const handleBulkSetterPurchase = () => {
    if (selectedSetters.length === 0) {
      alert('Please select at least one setter');
      return;
    }

    const allUsers = usersData?.users || [];
    const selectedUserObjects = selectedSetters.map(userId => {
      const user = allUsers.find(u => (u.id || u.userId || u.ghlUserId) === userId);
      return {
        userId: user.id || user.userId || user.ghlUserId,
        name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim()
      };
    });

    const userNames = selectedUserObjects.map(u => u.name).join(', ');
    
    if (!window.confirm(`Purchase ${selectedSetters.length} setter number(s) for:\n\n${userNames}\n\nEach number will be named after the setter in Twilio and added to A2P campaign.`)) {
      return;
    }

    bulkSetterPurchaseMutation.mutate(selectedUserObjects);
  };

  const filteredStates = statesData?.states.filter(state =>
    state.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const filteredSetters = (usersData?.users || []).filter(user => {
    const name = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim();
    const email = user.email || '';
    return name.toLowerCase().includes(setterSearchTerm.toLowerCase()) ||
           email.toLowerCase().includes(setterSearchTerm.toLowerCase());
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
   {/* Header */}
<div>
  <h2 className="text-3xl font-display font-bold text-gray-900 tracking-tight">
    Bulk Purchase
  </h2>
  <p className="mt-1 text-base font-body text-gray-600">
    Purchase phone numbers for states, setters, or closers
  </p>
</div>

      {/* Purchase Mode Selector */}
      <div className="modern-card p-4">
        <div className="flex items-center space-x-2 mb-3">
          <div className="p-1 bg-gray-100 rounded">
            <ShoppingCart className="h-3.5 w-3.5 text-gray-600" strokeWidth={2} />
          </div>
          <span className="text-xs font-semibold text-gray-900">Purchase Type</span>
        </div>
        
        <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
          <button
            onClick={() => setPurchaseMode('states')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              purchaseMode === 'states'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            State Numbers
          </button>
          
          <button
            onClick={() => setPurchaseMode('setter')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              purchaseMode === 'setter'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Setter (510)
          </button>
          
          <button
            onClick={() => setPurchaseMode('closer')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              purchaseMode === 'closer'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Closer (650)
          </button>
        </div>
      </div>

      {/* Quick Purchase for Setters/Closers */}
      {purchaseMode !== 'states' && (
        <div className="modern-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Quick Purchase: {purchaseMode === 'setter' ? 'Setter (510)' : 'Closer (650)'}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Purchase one {purchaseMode === 'setter' ? '510' : '650'} number instantly
              </p>
            </div>
            
            <button
              onClick={handleQuickPurchase}
              disabled={quickPurchaseMutation.isPending}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-md"
            >
              {quickPurchaseMutation.isPending ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" strokeWidth={2} />
                  Purchasing...
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4 mr-2" strokeWidth={2} />
                  Purchase Number
                </>
              )}
            </button>
          </div>
          
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-600">
              After purchase, assign the number to a user in the GHL Integration tab.
            </p>
          </div>
        </div>
      )}

      {/* BULK SETTER PURCHASE */}
      {purchaseMode === 'setter' && (
        <>
          {/* Purchase Summary for Setters */}
          <div className="modern-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-900 font-semibold">
                  {selectedSetters.length} setter{selectedSetters.length !== 1 ? 's' : ''} selected
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {selectedSetters.length} number{selectedSetters.length !== 1 ? 's' : ''} will be purchased
                </p>
              </div>
              <button
                onClick={handleBulkSetterPurchase}
                disabled={selectedSetters.length === 0 || bulkSetterPurchaseMutation.isPending}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-md"
              >
                {bulkSetterPurchaseMutation.isPending ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" strokeWidth={2} />
                    Purchasing...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4 mr-2" strokeWidth={2} />
                    Purchase {selectedSetters.length}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Search & Select All for Setters */}
          <div className="modern-card p-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search setters by name or email..."
                value={setterSearchTerm}
                onChange={(e) => setSetterSearchTerm(e.target.value)}
                className="modern-input w-full pl-10 pr-10 py-2.5 text-sm"
              />
              {setterSearchTerm && (
                <button
                  onClick={() => setSetterSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-900 text-sm transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSelectAllSetters}
                className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                {selectedSetters.length === (usersData?.users || []).length ? 'Deselect All' : 'Select All'}
              </button>
              
              <button
                onClick={() => syncUsersMutation.mutate()}
                disabled={syncUsersMutation.isPending}
                className="px-4 py-2 text-sm bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-sm hover:shadow flex items-center gap-2"
                title="Sync latest users from GHL"
              >
                {syncUsersMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" strokeWidth={2} />
                    Sync Users
                  </>
                )}
              </button>
            </div>
            
            {/* Last sync indicator */}
            {usersData?.source === 'db' && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Auto-refreshing every 30s • Click "Sync Users" for immediate update</span>
              </div>
            )}
          </div>

          {/* Setters Grid */}
          <div className="modern-card overflow-hidden">
            {usersLoading ? (
              <div className="flex items-center justify-center py-12 px-6">
                <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
                <span className="ml-3 text-gray-600">Loading GHL users...</span>
              </div>
            ) : (
              <>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                    {filteredSetters.map((user) => {
                      const userId = user.id || user.userId || user.ghlUserId;
                      const userName = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim();
                      const userEmail = user.email || '';
                      const isSelected = selectedSetters.includes(userId);
                      
                      return (
                        <label
                          key={userId}
                          className={`group relative flex items-center px-3.5 py-3 rounded-lg cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-blue-50'
                              : 'bg-white border border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSetterToggle(userId)}
                            className="h-4 w-4 text-blue-600 bg-gray-100 rounded border-gray-300 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 transition-colors"
                          />
                          
                          <div className="flex-1 min-w-0 ml-3">
                            <p className={`text-sm font-semibold truncate transition-colors ${
                              isSelected ? 'text-blue-900' : 'text-gray-900'
                            }`}>
                              {userName}
                            </p>
                            <p className="text-xs text-gray-500 truncate mt-0.5">
                              {userEmail}
                            </p>
                          </div>
                          
                          {isSelected && (
                            <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0 ml-2" strokeWidth={2} />
                          )}
                        </label>
                      );
                    })}
                  </div>

                  {filteredSetters.length === 0 && (
                    <div className="text-center py-12">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                        <Search className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-900">No setters found</p>
                      <p className="text-xs text-gray-500 mt-1">Try adjusting your search</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Purchase Results for Setters */}
          {bulkSetterPurchaseMutation.isSuccess && (
            <div className="modern-card border border-green-300 p-4">
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3" strokeWidth={2} />
                <div>
                  <p className="font-semibold text-green-900">Bulk Purchase Successful!</p>
                  <p className="text-sm text-green-700 mt-1">
                    {bulkSetterPurchaseMutation.data?.data.summary.purchased} numbers purchased and added to A2P campaign
                  </p>
                  {bulkSetterPurchaseMutation.data?.data.summary.failed > 0 && (
                    <p className="text-sm text-orange-600 mt-1">
                      ⚠️ {bulkSetterPurchaseMutation.data?.data.summary.failed} failed
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {bulkSetterPurchaseMutation.isError && (
            <div className="modern-card border border-red-300 p-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3" strokeWidth={2} />
                <div>
                  <p className="font-semibold text-red-900">Purchase Failed</p>
                  <p className="text-sm text-red-700 mt-1">
                    {bulkSetterPurchaseMutation.error?.response?.data?.error || bulkSetterPurchaseMutation.error?.message}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Sync Users Success */}
          {syncUsersMutation.isSuccess && (
            <div className="modern-card border border-green-300 p-4">
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3" strokeWidth={2} />
                <div>
                  <p className="font-semibold text-green-900">Users Synced Successfully!</p>
                  <p className="text-sm text-green-700 mt-1">
                    {syncUsersMutation.data?.data.totals.added > 0 && (
                      <span>✨ {syncUsersMutation.data?.data.totals.added} new user(s) added • </span>
                    )}
                    {syncUsersMutation.data?.data.totals.updated > 0 && (
                      <span>🔄 {syncUsersMutation.data?.data.totals.updated} user(s) updated • </span>
                    )}
                    <span>Total: {syncUsersMutation.data?.data.totals.fromApi} users from GHL</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {syncUsersMutation.isError && (
            <div className="modern-card border border-red-300 p-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3" strokeWidth={2} />
                <div>
                  <p className="font-semibold text-red-900">Sync Failed</p>
                  <p className="text-sm text-red-700 mt-1">
                    {syncUsersMutation.error?.response?.data?.error || syncUsersMutation.error?.message}
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Recent Purchases Summary */}
      {recentPurchases.length > 0 && (
        <div className="modern-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Recent Purchases</h3>
              <p className="text-xs text-gray-500 mt-0.5">Last 12 hours</p>
            </div>
            <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-1 rounded-full">
              {recentPurchases.length} total
            </span>
          </div>

          {/* Role Breakdown */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
              <p className="text-xl font-semibold text-blue-600">{recentSetters}</p>
              <p className="text-xs text-gray-600 mt-0.5">Setters (510)</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
              <p className="text-xl font-semibold text-blue-600">{recentClosers}</p>
              <p className="text-xs text-gray-600 mt-0.5">Closers (650)</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
              <p className="text-xl font-semibold text-blue-600">{recentStates}</p>
              <p className="text-xs text-gray-600 mt-0.5">State Numbers</p>
            </div>
          </div>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {recentPurchases.map((number) => {
              const role = getNumberRole(number.phoneNumber);
              const roleBadges = {
                setter: <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">Setter</span>,
                closer: <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">Closer</span>,
                state: <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full font-medium">State</span>
              };

              return (
                <div
                  key={number.sid}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center min-w-0 flex-1">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-3 flex-shrink-0" strokeWidth={2} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-sm font-semibold text-gray-900 truncate">
                          {number.phoneNumber}
                        </p>
                        {roleBadges[role]}
                      </div>
                      <p className="text-xs text-gray-600 truncate mt-0.5">
                        {number.friendlyName || 'No name'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <p className="text-xs text-gray-500">
                      {new Date(number.dateCreated).toLocaleString()}
                    </p>
                    <p className="text-xs text-green-600 font-medium mt-0.5">
                      {formatTimeAgo(number.dateCreated)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* State Purchase Section */}
      {purchaseMode === 'states' && (
        <>
          {/* Purchase Summary */}
          <div className="modern-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-900 font-semibold">
                  {selectedStates.length} state{selectedStates.length !== 1 ? 's' : ''} selected
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {selectedStates.length} number{selectedStates.length !== 1 ? 's' : ''} will be purchased
                </p>
              </div>
              <button
                onClick={handlePurchase}
                disabled={selectedStates.length === 0 || purchaseMutation.isPending}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-md"
              >
                {purchaseMutation.isPending ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" strokeWidth={2} />
                    Purchasing...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4 mr-2" strokeWidth={2} />
                    Purchase {selectedStates.length}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Search & Select All */}
          <div className="modern-card p-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search states..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="modern-input w-full pl-10 pr-10 py-2.5 text-sm"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-900 text-sm transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              onClick={handleSelectAll}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              {selectedStates.length === statesData?.states.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {/* States Grid */}
          <div className="modern-card overflow-hidden">
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {filteredStates.map((state) => {
                  const isSelected = selectedStates.includes(state.name);
                  
                  return (
                    <label
                      key={state.name}
                      className={`group relative flex items-center px-3.5 py-3 rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-blue-50'
                          : 'bg-white border border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleStateToggle(state.name)}
                        className="h-4 w-4 text-blue-600 bg-gray-100 rounded border-gray-300 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 transition-colors"
                      />
                      
                      <div className="flex-1 min-w-0 ml-3">
                        <p className={`text-sm font-semibold truncate transition-colors ${
                          isSelected ? 'text-blue-900' : 'text-gray-900'
                        }`}>
                          {state.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {state.areaCodes.length} area code{state.areaCodes.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      
                      {isSelected && (
                        <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0 ml-2" strokeWidth={2} />
                      )}
                    </label>
                  );
                })}
              </div>

              {filteredStates.length === 0 && (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                    <Search className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-900">No states found</p>
                  <p className="text-xs text-gray-500 mt-1">Try adjusting your search</p>
                </div>
              )}
            </div>
          </div>

          {/* Purchase Results */}
          {purchaseMutation.isSuccess && (
            <div className="modern-card border border-green-300 p-4">
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3" strokeWidth={2} />
                <div>
                  <p className="font-semibold text-green-900">Purchase Successful!</p>
                  <p className="text-sm text-green-700 mt-1">
                    {purchaseMutation.data?.data.summary.purchased} numbers purchased
                  </p>
                  {purchaseMutation.data?.data.summary.failed > 0 && (
                    <p className="text-sm text-orange-600 mt-1">
                      ⚠️ {purchaseMutation.data?.data.summary.failed} failed
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {purchaseMutation.isError && (
            <div className="modern-card border border-red-300 p-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3" strokeWidth={2} />
                <div>
                  <p className="font-semibold text-red-900">Purchase Failed</p>
                  <p className="text-sm text-red-700 mt-1">
                    {purchaseMutation.error?.response?.data?.error || purchaseMutation.error?.message}
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}