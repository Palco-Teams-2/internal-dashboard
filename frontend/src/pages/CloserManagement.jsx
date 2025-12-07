import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { closersApi } from '../services/api';
import { 
  UserPlus, 
  UserMinus, 
  Phone, 
  Mail, 
  CheckCircle2,
  AlertCircle,
  Loader2,
  Briefcase
} from 'lucide-react';

export default function CloserManagement() {
  const queryClient = useQueryClient();
  const [showOnboardForm, setShowOnboardForm] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: ''
  });

  // Fetch all closers (phone numbers already included from backend)
  const { data: closersData, isLoading } = useQuery({
    queryKey: ['closers'],
    queryFn: async () => {
      const response = await closersApi.getClosers();
      return response.data;
    },
    refetchInterval: 10000
  });

  const closers = closersData?.closers || [];
  const closersWithNumbers = closers.filter(c => c.assignedPhoneNumber);

  // Onboard mutation
  const onboardMutation = useMutation({
    mutationFn: (data) => closersApi.onboardCloser(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['closers']);
      setShowOnboardForm(false);
      setFormData({ firstName: '', lastName: '', email: '', phoneNumber: '' });
    }
  });

  // Offboard mutation
  const offboardMutation = useMutation({
    mutationFn: (id) => closersApi.offboardCloser(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['closers']);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onboardMutation.mutate(formData);
  };

  const handleOffboard = (closer) => {
    const closerName = `${closer.firstName || ''} ${closer.lastName || ''}`.trim() || 'this closer';
    if (window.confirm(`Are you sure you want to offboard ${closerName}? This will remove them from all systems.`)) {
      offboardMutation.mutate(closer.id);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Closer Management</h1>
          <p className="text-gray-600 mt-1">Onboard and manage closers across all platforms</p>
        </div>
        <button
          onClick={() => setShowOnboardForm(!showOnboardForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          <UserPlus className="h-5 w-5" />
          <span>Onboard New Closer</span>
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Closers</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{closers.length}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center">
              <Briefcase className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">With 650 Numbers</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{closersWithNumbers.length}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center">
              <Phone className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Onboarding Form */}
      <AnimatePresence>
        {showOnboardForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-xl border border-gray-200 p-6 overflow-hidden"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Onboard New Closer</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="John"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="john.doe@tjr-trades.com"
                />
              </div>

              {/* Automation Steps Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Automated Onboarding Steps
                </h3>
                <ul className="space-y-1 text-sm text-blue-800">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Create Google Workspace account
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Send Calendly invitation
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Add to Zoom (may require manual approval)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Assign 650 area code number
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Add to GHL
                  </li>
                </ul>
              </div>

              {onboardMutation.isError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
                  <strong>Error:</strong> {onboardMutation.error?.response?.data?.error || onboardMutation.error?.message}
                </div>
              )}

              {onboardMutation.isSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
                  <strong>Success!</strong> Closer onboarding completed.
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={onboardMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
                >
                  {onboardMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Onboarding...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-5 w-5" />
                      <span>Start Onboarding</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowOnboardForm(false)}
                  className="px-4 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Closers Grid */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Active Closers</h2>
          <p className="text-sm text-gray-600 mt-0.5">Manage your closer accounts</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : closers.length === 0 ? (
          <div className="text-center py-12">
            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <UserPlus className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-gray-600 font-medium">No closers yet</p>
            <p className="text-sm text-gray-500 mt-1">Click "Onboard New Closer" to get started</p>
          </div>
        ) : (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {closers.map((closer, index) => (
                <motion.div
                  key={closer.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative bg-white border border-gray-200 rounded-lg p-5 hover:shadow-lg hover:border-blue-300 transition-all"
                >
                  {/* Avatar and Name */}
                  <div className="flex flex-col items-center text-center mb-4">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-xl mb-3">
                      {closer.firstName?.charAt(0) || '?'}{closer.lastName?.charAt(0) || ''}
                    </div>
                    <h3 className="font-semibold text-gray-900 text-base mb-1">
                      {closer.firstName} {closer.lastName}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{closer.email}</span>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-200 my-4"></div>

                  {/* Info Grid */}
                  <div className="space-y-3">
                    {/* GHL Status */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 font-medium">GHL Status</span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Active
                      </span>
                    </div>

                    {/* Phone Number */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 font-medium">Phone Number</span>
                      {closer.assignedPhoneNumber ? (
                        <span className="text-sm font-mono text-green-700 font-semibold">
                          {closer.assignedPhoneNumber}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">
                          No number assigned
                        </span>
                      )}
                    </div>

                    {/* Role */}
                    {closer.role && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 font-medium">Role</span>
                        <span className="text-sm text-gray-700 capitalize">{closer.role}</span>
                      </div>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-200 my-4"></div>

                  {/* Offboard Button - Full Width at Bottom */}
                  <button
                    onClick={() => handleOffboard(closer)}
                    disabled={offboardMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:text-white hover:bg-red-600 border border-red-300 hover:border-red-600 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {offboardMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Removing...</span>
                      </>
                    ) : (
                      <>
                        <UserMinus className="h-4 w-4" />
                        <span>Offboard Closer</span>
                      </>
                    )}
                  </button>

                  {/* Joined Date - Footer */}
                  {closer.createdAt && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-400 text-center">
                        Joined {new Date(closer.createdAt).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}