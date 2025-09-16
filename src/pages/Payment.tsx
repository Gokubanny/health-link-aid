import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Building2, Copy, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BankAccount {
  id: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  routing_number: string;
}

interface Consultation {
  id: string;
  doctor_name: string;
  consultation_type: string;
  preferred_date: string;
  preferred_time: string;
  amount: number;
  status: string;
  payment_status: string;
}

const Payment = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [selectedBank, setSelectedBank] = useState<string>('');
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch bank accounts
      const { data: banks, error: banksError } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('is_active', true);

      if (banksError) throw banksError;
      setBankAccounts(banks || []);

      // Fetch latest unpaid consultation
      const { data: consultations, error: consultationsError } = await supabase
        .from('consultations')
        .select('*')
        .eq('user_id', user?.id)
        .eq('payment_status', 'unpaid')
        .order('created_at', { ascending: false })
        .limit(1);

      if (consultationsError) throw consultationsError;
      
      if (consultations && consultations.length > 0) {
        setConsultation(consultations[0]);
      } else {
        toast({
          title: "No pending consultation found",
          description: "Please book a consultation first.",
          variant: "destructive"
        });
        navigate('/book-consultation');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error loading payment information",
        description: "Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: `${label} copied successfully!`
    });
  };

  const confirmPayment = async () => {
    if (!consultation || !selectedBank) return;

    try {
      const { error } = await supabase
        .from('consultations')
        .update({ 
          payment_status: 'paid',
          bank_account_id: selectedBank
        })
        .eq('id', consultation.id);

      if (error) throw error;

      setPaymentConfirmed(true);
      toast({
        title: "Payment confirmed! ✅",
        description: "Your consultation booking is now complete."
      });

      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
    } catch (error) {
      console.error('Error confirming payment:', error);
      toast({
        title: "Error confirming payment",
        description: "Please try again.",
        variant: "destructive"
      });
    }
  };

  const getConsultationTypeAmount = (type: string) => {
    const amounts = { video_call: 50, phone_call: 40, chat: 30 };
    return amounts[type as keyof typeof amounts] || 50;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to access payment</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/auth')} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paymentConfirmed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="w-16 h-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl text-green-700">Payment Confirmed!</CardTitle>
            <CardDescription>
              Your consultation has been successfully booked and paid for.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Redirecting you to dashboard in a few seconds...
            </p>
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Complete Your Payment</h1>
          <p className="text-lg text-gray-600">Secure bank transfer for your consultation</p>
        </div>

        {consultation && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Consultation Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-6 h-6 text-primary" />
                  Consultation Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Doctor:</span>
                  <span className="font-medium">{consultation.doctor_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <Badge variant="secondary">
                    {consultation.consultation_type.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium">
                    {new Date(consultation.preferred_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Time:</span>
                  <span className="font-medium">{consultation.preferred_time}</span>
                </div>
                <hr />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Amount:</span>
                  <span className="text-primary">${getConsultationTypeAmount(consultation.consultation_type)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Bank Transfer Instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-6 h-6 text-primary" />
                  Bank Transfer Details
                </CardTitle>
                <CardDescription>
                  Select a bank account to transfer your payment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {bankAccounts.map((bank) => (
                    <div
                      key={bank.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedBank === bank.id
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedBank(bank.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{bank.bank_name}</h4>
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          selectedBank === bank.id
                            ? 'border-primary bg-primary'
                            : 'border-gray-300'
                        }`} />
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Account Name:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono">{bank.account_name}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(bank.account_name, 'Account name');
                              }}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Account Number:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono">{bank.account_number}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(bank.account_number, 'Account number');
                              }}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        
                        {bank.routing_number && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Routing Number:</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono">{bank.routing_number}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(bank.routing_number, 'Routing number');
                                }}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-yellow-800 mb-2">Payment Instructions:</h4>
                  <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
                    <li>Select your preferred bank account above</li>
                    <li>Transfer exactly ${consultation ? getConsultationTypeAmount(consultation.consultation_type) : 50} to the selected account</li>
                    <li>Use "HealthConnect Consultation" as the transfer reference</li>
                    <li>Click "Confirm Payment" below after completing the transfer</li>
                  </ol>
                </div>

                <Button
                  onClick={confirmPayment}
                  disabled={!selectedBank}
                  className="w-full"
                >
                  {selectedBank ? 'Confirm Payment Sent' : 'Select Bank Account First'}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="text-center mt-6 space-x-4">
          <Button variant="outline" onClick={() => navigate('/book-consultation')}>
            Back to Booking
          </Button>
          <Button variant="outline" onClick={() => navigate('/')}>
            Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Payment;