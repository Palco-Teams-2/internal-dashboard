import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, Mail, User, CheckCircle2, Loader2,
  Video, Calendar, Briefcase, Phone, AlertCircle
} from 'lucide-react';

const API_BASE = 'http://localhost:8080/api/onboarding';

export default function CloserOnboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    personalEmail: ''
  });
  const [createdAccount, setCreatedAccount] = useState({
    email: '',
    password: ''
  });
  const [twilioNumber, setTwilioNumber] = useState('');

  const totalSteps = 6;

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Step 1: Submit form and create Google Workspace
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    
    try {
      const response = await fetch(`${API_BASE}/google-workspace`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (data.success) {
        setCreatedAccount({
          email: data.email,
          password: data.temporaryPassword
        });
        setIsProcessing(false);
        setCurrentStep(2);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
      setIsProcessing(false);
    }
  };

  // Step 2 → 3: Create Zoom
  const handleSendZoomInvite = async () => {
    setIsSendingInvite(true);
    
    try {
      const response = await fetch(`${API_BASE}/zoom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: createdAccount.email
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setIsSendingInvite(false);
        setInviteSent(true);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      alert(`Zoom error: ${error.message}`);
      setIsSendingInvite(false);
    }
  };

  // Step 3 → 4: Send Calendly
  const handleSendCalendlyInvite = async () => {
    setIsSendingInvite(true);
    
    try {
      const response = await fetch(`${API_BASE}/calendly`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: createdAccount.email
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setIsSendingInvite(false);
        setInviteSent(true);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      alert(`Calendly error: ${error.message}`);
      setIsSendingInvite(false);
    }
  };

  // Step 4 → 5: Create GHL + Twilio
  const handleSendGHLInvite = async () => {
    setIsSendingInvite(true);
    
    try {
      const response = await fetch(`${API_BASE}/ghl-and-twilio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: createdAccount.email
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setTwilioNumber(data.twilioNumber);
        setIsSendingInvite(false);
        setInviteSent(true);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      alert(`GHL error: ${error.message}`);
      setIsSendingInvite(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Welcome to TJR Sales Team
          </h1>
          <p className="text-gray-600 text-lg">
            Let's get you onboarded with all your tools
          </p>
        </div>

        <div className="mb-12">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">
              Step {currentStep} of {totalSteps}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round((currentStep / totalSteps) * 100)}% Complete
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-black"
              animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 0: Instructions */}
          {currentStep === 0 && (
            <motion.div key="step0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-6">
                    <Briefcase className="h-10 w-10 text-blue-600" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-3">
                    Let's Get Started
                  </h2>
                  <p className="text-gray-600 text-lg">
                    Complete each step at your own pace
                  </p>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                      <Mail className="h-8 w-8 text-blue-600 flex-shrink-0" />
                      <div>
                        <h3 className="font-bold text-gray-900 mb-2">Step 1: Google Workspace</h3>
                        <p className="text-sm text-gray-700">Your business email (@tjr-trades.com)</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                      <Video className="h-8 w-8 text-indigo-600 flex-shrink-0" />
                      <div>
                        <h3 className="font-bold text-gray-900 mb-2">Step 2: Zoom</h3>
                        <p className="text-sm text-gray-700">Video calls (all recorded)</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                      <Calendar className="h-8 w-8 text-green-600 flex-shrink-0" />
                      <div>
                        <h3 className="font-bold text-gray-900 mb-2">Step 3: Calendly</h3>
                        <p className="text-sm text-gray-700">Appointment scheduling</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                      <Phone className="h-8 w-8 text-purple-600 flex-shrink-0" />
                      <div>
                        <h3 className="font-bold text-gray-900 mb-2">Step 4: GHL + 650 Number</h3>
                        <p className="text-sm text-gray-700">CRM and sales phone</p>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setCurrentStep(1)}
                  className="w-full bg-black text-white font-semibold py-4 px-6 rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                >
                  <span>Let's Get Started</span>
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 1: Form */}
          {currentStep === 1 && (
            <motion.div key="step1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Information</h2>
                <p className="text-gray-600 mb-8">Please provide your basic information</p>

                <form onSubmit={handleSubmitForm} className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">First Name</label>
                    <input
                      type="text"
                      name="firstName"
                      required
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      placeholder="John"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Last Name</label>
                    <input
                      type="text"
                      name="lastName"
                      required
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      placeholder="Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Personal Email</label>
                    <input
                      type="email"
                      name="personalEmail"
                      required
                      value={formData.personalEmail}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      placeholder="john.doe@gmail.com"
                    />
                    <p className="text-sm text-gray-500 mt-2">We'll send account details here</p>
                  </div>

                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full bg-black text-white font-semibold py-4 px-6 rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <><Loader2 className="h-5 w-5 animate-spin" /><span>Creating...</span></>
                    ) : (
                      <><span>Continue</span><ArrowRight className="h-5 w-5" /></>
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Google Workspace Created */}
          {currentStep === 2 && (
            <motion.div key="step2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Google Workspace Created!</h2>
                  <p className="text-gray-600">Your company email is ready</p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-8">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase">Account Details</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Company Email</label>
                      <div className="bg-white border border-gray-300 rounded-lg p-3">
                        <span className="font-mono text-sm font-semibold">{createdAccount.email}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Temporary Password</label>
                      <div className="bg-white border border-gray-300 rounded-lg p-3">
                        <span className="font-mono text-sm font-semibold">{createdAccount.password}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">⚠️ Change on first login</p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
                  <h3 className="text-sm font-semibold text-blue-900 mb-2">📧 Email Sent!</h3>
                  <p className="text-sm text-blue-800">
                    Check <strong>{formData.personalEmail}</strong> for details
                  </p>
                </div>

                <button
                  onClick={() => setCurrentStep(3)}
                  className="w-full bg-black text-white font-semibold py-4 px-6 rounded-lg hover:bg-gray-800 flex items-center justify-center gap-2"
                >
                  <span>Continue to Zoom</span>
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Zoom */}
          {currentStep === 3 && (
            <motion.div key="step3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
                    <Video className="h-8 w-8 text-indigo-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Zoom Setup</h2>
                  <p className="text-gray-600">Create your Zoom account</p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-8">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Account Email</h3>
                  <div className="bg-gray-200 border border-gray-300 rounded-lg p-3">
                    <span className="font-mono text-sm text-gray-700 font-semibold">{createdAccount.email}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Zoom will use this email</p>
                </div>

                {!inviteSent ? (
                  <button
                    onClick={handleSendZoomInvite}
                    disabled={isSendingInvite}
                    className="w-full bg-black text-white font-semibold py-4 px-6 rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSendingInvite ? (
                      <><Loader2 className="h-5 w-5 animate-spin" /><span>Creating...</span></>
                    ) : (
                      <><span>Create Zoom Account</span><ArrowRight className="h-5 w-5" /></>
                    )}
                  </button>
                ) : (
                  <>
                    <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
                        <div>
                          <h3 className="text-sm font-semibold text-green-900 mb-2">Zoom Created!</h3>
                          <p className="text-sm text-green-800">Check {createdAccount.email} for instructions</p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => { setCurrentStep(4); setInviteSent(false); }}
                      className="w-full bg-black text-white font-semibold py-4 px-6 rounded-lg hover:bg-gray-800 flex items-center justify-center gap-2"
                    >
                      <span>Continue to Calendly</span>
                      <ArrowRight className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 4: Calendly */}
          {currentStep === 4 && (
            <motion.div key="step4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                    <Calendar className="h-8 w-8 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Calendly Setup</h2>
                  <p className="text-gray-600">Set up appointment booking</p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-8">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Account Email</h3>
                  <div className="bg-gray-200 border border-gray-300 rounded-lg p-3">
                    <span className="font-mono text-sm text-gray-700 font-semibold">{createdAccount.email}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Calendly invitation will be sent here</p>
                </div>

                {!inviteSent ? (
                  <button
                    onClick={handleSendCalendlyInvite}
                    disabled={isSendingInvite}
                    className="w-full bg-black text-white font-semibold py-4 px-6 rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSendingInvite ? (
                      <><Loader2 className="h-5 w-5 animate-spin" /><span>Sending...</span></>
                    ) : (
                      <><span>Send Calendly Invitation</span><ArrowRight className="h-5 w-5" /></>
                    )}
                  </button>
                ) : (
                  <>
                    <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
                        <div>
                          <h3 className="text-sm font-semibold text-green-900 mb-2">Invitation Sent!</h3>
                          <p className="text-sm text-green-800">Check {createdAccount.email} to accept</p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => { setCurrentStep(5); setInviteSent(false); }}
                      className="w-full bg-black text-white font-semibold py-4 px-6 rounded-lg hover:bg-gray-800 flex items-center justify-center gap-2"
                    >
                      <span>Continue to GHL & Phone</span>
                      <ArrowRight className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 5: GHL + Twilio */}
          {currentStep === 5 && (
            <motion.div key="step5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                    <Briefcase className="h-8 w-8 text-purple-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">GHL & Sales Phone</h2>
                  <p className="text-gray-600">Final step: CRM and sales number</p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-8">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Account Email</h3>
                  <div className="bg-gray-200 border border-gray-300 rounded-lg p-3">
                    <span className="font-mono text-sm text-gray-700 font-semibold">{createdAccount.email}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">GHL will use this email</p>
                </div>

                {!inviteSent ? (
                  <button
                    onClick={handleSendGHLInvite}
                    disabled={isSendingInvite}
                    className="w-full bg-black text-white font-semibold py-4 px-6 rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSendingInvite ? (
                      <><Loader2 className="h-5 w-5 animate-spin" /><span>Setting up...</span></>
                    ) : (
                      <><span>Create GHL & Get Phone</span><ArrowRight className="h-5 w-5" /></>
                    )}
                  </button>
                ) : (
                  <>
                    <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold text-green-900 mb-3">All Set! 🎉</h3>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-green-700" />
                              <span className="text-sm text-green-800">
                                Your 650 Number: <strong className="font-mono">{twilioNumber}</strong>
                              </span>
                            </div>
                            <p className="text-sm text-green-800">
                              GHL created. Check {createdAccount.email} for login
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => alert('✅ Onboarding complete! Check your email for all account details.')}
                      className="w-full bg-black text-white font-semibold py-4 px-6 rounded-lg hover:bg-gray-800 flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="h-5 w-5" />
                      <span>Finish Onboarding</span>
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}