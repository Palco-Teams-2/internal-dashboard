import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { numbersApi, ghlApi } from '../services/api';
import { UserPlus, ShoppingCart, TrendingUp, ArrowRight, Clock } from 'lucide-react';

export default function Dashboard() {
  // Fetch numbers to check for recent purchases
  const { data: numbersData } = useQuery({
    queryKey: ['numbers'],
    queryFn: async () => {
      const response = await numbersApi.getAllNumbers();
      return response.data;
    },
    refetchInterval: 10000
  });

  // Fetch GHL users to check for new accounts
  const { data: ghlUsersData } = useQuery({
    queryKey: ['ghl-users-dashboard'],
    queryFn: async () => {
      const response = await ghlApi.getUsers();
      return response.data;
    },
    refetchInterval: 30000
  });

  const ghlUsers = ghlUsersData?.users || [];
  
  // Get NEW accounts added in last 24 hours
  const newAccounts = ghlUsers.filter(user => {
    if (!user.createdAt) return false;
    const createdDate = new Date(user.createdAt);
    const now = new Date();
    const hoursDiff = (now - createdDate) / (1000 * 60 * 60);
    return hoursDiff <= 24;
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  // Get recent purchases (last 24 hours)
  const recentPurchases = (numbersData?.numbers || [])
    .filter(num => {
      const purchaseDate = new Date(num.dateCreated);
      const now = new Date();
      const hoursDiff = (now - purchaseDate) / (1000 * 60 * 60);
      return hoursDiff <= 24;
    })
    .sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated));

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffMs = now - new Date(date);
    const diffMins = Math.round(diffMs / (1000 * 60));
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return 'Today';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
        <p className="text-gray-600 mt-1">Monitor your Twilio-GHL system activity</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Users */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">New Accounts Today</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{newAccounts.length}</p>
              <div className="flex items-center gap-1 mt-2">
                <span className="text-sm font-medium text-gray-500">
                  Total: {ghlUsers.length}
                </span>
              </div>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center">
              <UserPlus className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </motion.div>

        {/* Numbers Purchased */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Purchased in 24h</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{recentPurchases.length}</p>
              <div className="flex items-center gap-1 mt-2">
                <span className="text-sm font-medium text-gray-500">
                  Total: {numbersData?.count || 0}
                </span>
              </div>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center">
              <ShoppingCart className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </motion.div>

        {/* Activity Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">System Status</p>
              <p className="text-3xl font-bold text-green-600 mt-2">Active</p>
              <div className="flex items-center gap-1 mt-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-sm font-medium text-gray-600">
                  Auto-syncing
                </span>
              </div>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center">
              <Clock className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* New Accounts Feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="bg-white rounded-xl border border-gray-200 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">New Accounts</h3>
                <p className="text-sm text-gray-600 mt-0.5">Added in last 24 hours</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-gray-900">{newAccounts.length}</span>
              </div>
            </div>
          </div>

          <div className="p-6">
            {newAccounts.length > 0 ? (
              <div className="space-y-3">
                {newAccounts.map((user, index) => {
                  const userName = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim();
                  const timeAgo = formatTimeAgo(user.createdAt);
                  
                  return (
                    <motion.div
                      key={user.id || index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                          {userName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{userName}</p>
                          <p className="text-sm text-gray-600">{user.email || 'No email'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{timeAgo}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <UserPlus className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-gray-600 font-medium">No new accounts</p>
                <p className="text-sm text-gray-500 mt-1">Check back later</p>
              </div>
            )}

            {newAccounts.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-100">
                <a 
                  href="/bulk-purchase"
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  <span>Assign Numbers</span>
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            )}
          </div>
        </motion.div>

        {/* Recent Purchases Feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="bg-white rounded-xl border border-gray-200 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Recent Purchases</h3>
                <p className="text-sm text-gray-600 mt-0.5">Numbers purchased in 24h</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-gray-900">{recentPurchases.length}</span>
              </div>
            </div>
          </div>

          <div className="p-6">
            {recentPurchases.length > 0 ? (
              <div className="space-y-3">
                {recentPurchases.slice(0, 8).map((number, index) => {
                  const timeAgo = formatTimeAgo(number.dateCreated);
                  
                  return (
                    <motion.div
                      key={number.sid}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                          <ShoppingCart className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-mono font-semibold text-gray-900">{number.phoneNumber}</p>
                          <p className="text-sm text-gray-600">{number.friendlyName || 'No name assigned'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{timeAgo}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <ShoppingCart className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-gray-600 font-medium">No recent purchases</p>
                <p className="text-sm text-gray-500 mt-1">Start by purchasing numbers</p>
              </div>
            )}

            {recentPurchases.length > 8 && (
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">
                  +{recentPurchases.length - 8} more purchases
                </p>
              </div>
            )}
          </div>
        </motion.div>

      </div>
    </div>
  );
}