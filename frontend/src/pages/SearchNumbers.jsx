import { useState, Fragment } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { numbersApi } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, Transition, Combobox } from '@headlessui/react';
import { 
  Search, 
  Phone, 
  MapPin, 
  ShoppingCart, 
  Loader2, 
  CheckCircle,
  XCircle,
  Filter,
  Sparkles,
  AlertCircle,
  Copy,
  Check
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function SearchNumbers() {
  const [selectedAreaCode, setSelectedAreaCode] = useState('');
  const [searchLimit, setSearchLimit] = useState(20);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState(null);
  const [friendlyName, setFriendlyName] = useState('');
  const [areaCodeSearch, setAreaCodeSearch] = useState('');
  const [copiedNumber, setCopiedNumber] = useState(null);
  const queryClient = useQueryClient();

  // Fetch area codes
  const { data: areaCodesData } = useQuery({
    queryKey: ['areaCodes'],
    queryFn: async () => {
      const response = await numbersApi.getAreaCodes();
      return response.data;
    }
  });

  // Search numbers
  const { data: searchResults, isLoading: isSearching, refetch: searchNumbers } = useQuery({
    queryKey: ['searchNumbers', selectedAreaCode, searchLimit],
    queryFn: async () => {
      if (!selectedAreaCode) return null;
      const response = await numbersApi.searchNumbers(selectedAreaCode, searchLimit);
      return response.data;
    },
    enabled: false
  });

  // Purchase mutation
  const purchaseMutation = useMutation({
    mutationFn: (data) => numbersApi.purchaseNumber(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['numbers']);
      setPurchaseDialogOpen(false);
      setSelectedNumber(null);
      setFriendlyName('');
      toast.success('Number purchased successfully! 🎉', {
        duration: 4000,
        icon: '📞',
      });
    },
    onError: (error) => {
      toast.error(`Failed to purchase: ${error.response?.data?.error || error.message}`, {
        duration: 5000,
      });
    }
  });

  const handleSearch = () => {
    if (!selectedAreaCode) {
      toast.error('Please select an area code first');
      return;
    }
    toast.promise(
      searchNumbers(),
      {
        loading: 'Searching for available numbers...',
        success: (data) => `Found ${data?.data?.count || 0} available numbers!`,
        error: 'Failed to search numbers',
      }
    );
  };

  const handlePurchaseClick = (number) => {
    setSelectedNumber(number);
    setFriendlyName('');
    setPurchaseDialogOpen(true);
  };

  const handlePurchase = () => {
    const name = friendlyName || `Number ${selectedNumber.phoneNumber}`;
    purchaseMutation.mutate({
      phoneNumber: selectedNumber.phoneNumber,
      friendlyName: name,
      areaCode: selectedAreaCode
    });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedNumber(text);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedNumber(null), 2000);
  };

  // Filter area codes based on search
  const filteredAreaCodes = areaCodesData?.areaCodes.filter((ac) => {
    const searchLower = areaCodeSearch.toLowerCase();
    return (
      ac.code.includes(searchLower) ||
      ac.region.toLowerCase().includes(searchLower) ||
      ac.state.toLowerCase().includes(searchLower)
    );
  }) || [];

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 to-teal-500 rounded-2xl p-8 text-white shadow-xl"
      >
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="h-8 w-8" />
          <h2 className="text-3xl font-bold">Search Available Numbers</h2>
        </div>
        <p className="text-blue-100 text-lg">
          Find and purchase phone numbers by area code
        </p>
      </motion.div>

      {/* Search Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="modern-card p-6"
      >
        <div className="flex items-center gap-2 mb-6">
          <Filter className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Search Filters</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Area Code Combobox */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Area Code *
            </label>
            <Combobox value={selectedAreaCode} onChange={setSelectedAreaCode}>
              <div className="relative">
                <div className="relative">
                  <Combobox.Input
                    className="w-full modern-input pl-10 pr-4"
                    placeholder="Search area code, city, or state..."
                    onChange={(e) => setAreaCodeSearch(e.target.value)}
                    displayValue={(code) => {
                      const ac = areaCodesData?.areaCodes.find(a => a.code === code);
                      return ac ? `${ac.code} - ${ac.region}, ${ac.state}` : '';
                    }}
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                <Transition
                  as={Fragment}
                  leave="transition ease-in duration-100"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <Combobox.Options className="absolute z-10 mt-2 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    {filteredAreaCodes.length === 0 && areaCodeSearch !== '' ? (
                      <div className="relative cursor-default select-none py-3 px-4 text-gray-700">
                        No area codes found
                      </div>
                    ) : (
                      filteredAreaCodes.map((ac) => (
                        <Combobox.Option
                          key={ac.code}
                          value={ac.code}
                          className={({ active }) =>
                            `relative cursor-pointer select-none py-3 px-4 ${
                              active ? 'bg-blue-600 text-white' : 'text-gray-900'
                            }`
                          }
                        >
                          {({ selected, active }) => (
                            <div className="flex items-center justify-between">
                              <div>
                                <span className={`font-mono font-semibold ${selected ? 'font-bold' : ''}`}>
                                  {ac.code}
                                </span>
                                <span className="ml-2 text-sm">
                                  {ac.region}, {ac.state}
                                </span>
                              </div>
                              {selected && (
                                <CheckCircle className="h-4 w-4" />
                              )}
                            </div>
                          )}
                        </Combobox.Option>
                      ))
                    )}
                  </Combobox.Options>
                </Transition>
              </div>
            </Combobox>
          </div>

          {/* Results Limit */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Results Limit
            </label>
            <select
              value={searchLimit}
              onChange={(e) => setSearchLimit(Number(e.target.value))}
              className="w-full modern-input"
            >
              <option value={10}>10 numbers</option>
              <option value={20}>20 numbers</option>
              <option value={50}>50 numbers</option>
              <option value={100}>100 numbers</option>
            </select>
          </div>

          {/* Search Button */}
          <div className="flex items-end">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSearch}
              disabled={isSearching || !selectedAreaCode}
              className="w-full bg-gradient-to-r from-blue-600 to-teal-500 text-white px-6 py-3 rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all font-semibold"
            >
              {isSearching ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5 mr-2" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-5 w-5 mr-2" />
                  Search Numbers
                </>
              )}
            </motion.button>
          </div>
        </div>

        {!selectedAreaCode && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-900">
              Select an area code to start searching for available phone numbers
            </p>
          </div>
        )}
      </motion.div>

      {/* Search Results */}
      <AnimatePresence>
        {searchResults && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 0.2 }}
            className="modern-card overflow-hidden"
          >
            <div className="bg-gradient-to-r from-blue-600 to-teal-500 px-6 py-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">
                    Available Numbers
                  </h3>
                  <p className="text-blue-100 text-sm mt-1">
                    {searchResults.count} numbers found in area code {selectedAreaCode}
                  </p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                  <span className="text-2xl font-bold">{searchResults.count}</span>
                </div>
              </div>
            </div>

            {searchResults.count === 0 ? (
              <div className="p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <XCircle className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-lg font-medium text-gray-900 mb-2">No Numbers Available</p>
                <p className="text-sm text-gray-600">
                  No numbers available for this area code. Try a different area code.
                </p>
              </div>
            ) : (
              <div className="p-6">
                <div className="space-y-3">
                  {searchResults.numbers.map((number, index) => (
                    <motion.div
                      key={number.phoneNumber}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="group relative flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                          <Phone className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-lg font-mono font-bold text-gray-900">
                              {number.phoneNumber}
                            </p>
                            <button
                              onClick={() => copyToClipboard(number.phoneNumber)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
                            >
                              {copiedNumber === number.phoneNumber ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <Copy className="h-4 w-4 text-gray-600" />
                              )}
                            </button>
                          </div>
                          <div className="flex items-center text-sm text-gray-600 mt-1">
                            <MapPin className="h-4 w-4 mr-1" />
                            {number.locality}, {number.region}
                          </div>
                        </div>
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handlePurchaseClick(number)}
                        className="bg-gradient-to-r from-blue-600 to-teal-500 text-white px-6 py-2.5 rounded-lg hover:shadow-lg flex items-center transition-all font-semibold"
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Purchase
                      </motion.button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Purchase Dialog */}
      <Transition appear show={purchaseDialogOpen} as={Fragment}>
        <Dialog 
          as="div" 
          className="relative z-50" 
          onClose={() => setPurchaseDialogOpen(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
                  {/* Dialog Header */}
                  <div className="bg-gradient-to-r from-blue-600 to-teal-500 px-6 py-5 text-white">
                    <Dialog.Title className="text-xl font-bold flex items-center gap-2">
                      <ShoppingCart className="h-6 w-6" />
                      Purchase Number
                    </Dialog.Title>
                    <p className="text-blue-100 text-sm mt-1">
                      Confirm your purchase details
                    </p>
                  </div>

                  {/* Dialog Content */}
                  <div className="p-6 space-y-6">
                    {/* Number Details */}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Phone Number
                      </label>
                      <p className="text-2xl font-mono font-bold text-gray-900 mt-1">
                        {selectedNumber?.phoneNumber}
                      </p>
                      <div className="flex items-center text-sm text-gray-600 mt-2">
                        <MapPin className="h-4 w-4 mr-1" />
                        {selectedNumber?.locality}, {selectedNumber?.region}
                      </div>
                    </div>

                    {/* Friendly Name Input */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Friendly Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={friendlyName}
                        onChange={(e) => setFriendlyName(e.target.value)}
                        placeholder="e.g., Sales Line, Support Number"
                        className="w-full modern-input"
                        autoFocus
                      />
                      <p className="text-xs text-gray-600 mt-2">
                        This name will help you identify the number in your account
                      </p>
                    </div>

                    {/* Info Box */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex gap-2">
                        <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-blue-900">
                            Before you purchase
                          </p>
                          <p className="text-xs text-blue-700 mt-1">
                            This number will be added to your Twilio account immediately. Make sure you have the necessary budget and compliance in place.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dialog Actions */}
                  <div className="bg-gray-50 px-6 py-4 flex gap-3">
                    <button
                      onClick={() => setPurchaseDialogOpen(false)}
                      disabled={purchaseMutation.isPending}
                      className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handlePurchase}
                      disabled={purchaseMutation.isPending}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-teal-500 text-white px-4 py-2.5 rounded-lg hover:shadow-lg disabled:opacity-50 flex items-center justify-center transition-all font-semibold"
                    >
                      {purchaseMutation.isPending ? (
                        <>
                          <Loader2 className="animate-spin h-5 w-5 mr-2" />
                          Purchasing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-5 w-5 mr-2" />
                          Confirm Purchase
                        </>
                      )}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}