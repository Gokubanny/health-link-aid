import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, Clock, Video, Phone, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const BookConsultation = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    doctor_name: '',
    consultation_type: '',
    preferred_date: '',
    preferred_time: '',
    symptoms: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to book a consultation.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('consultations')
        .insert([{
          user_id: user.id,
          ...formData
        }]);

      if (error) throw error;

      toast({
        title: "Consultation booked successfully! 🎉",
        description: "Proceed to payment to complete your booking."
      });
      
      navigate('/payment');
    } catch (error) {
      console.error('Error booking consultation:', error);
      toast({
        title: "Booking failed",
        description: "Please try again or contact support.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to book a consultation</CardDescription>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Book Your Consultation</h1>
          <p className="text-lg text-gray-600">Schedule a session with our healthcare professionals</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-primary" />
              Consultation Details
            </CardTitle>
            <CardDescription>
              Fill in the details below to book your consultation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="doctor_name">Preferred Doctor</Label>
                  <Input
                    id="doctor_name"
                    placeholder="Dr. Smith or Any Available"
                    value={formData.doctor_name}
                    onChange={(e) => handleInputChange('doctor_name', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="consultation_type">Consultation Type</Label>
                  <Select
                    value={formData.consultation_type}
                    onValueChange={(value) => handleInputChange('consultation_type', value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select consultation type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video_call">
                        <div className="flex items-center gap-2">
                          <Video className="w-4 h-4" />
                          Video Call ($50)
                        </div>
                      </SelectItem>
                      <SelectItem value="phone_call">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          Phone Call ($40)
                        </div>
                      </SelectItem>
                      <SelectItem value="chat">
                        <div className="flex items-center gap-2">
                          <MessageCircle className="w-4 h-4" />
                          Text Chat ($30)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="preferred_date">Preferred Date</Label>
                  <Input
                    id="preferred_date"
                    type="date"
                    value={formData.preferred_date}
                    onChange={(e) => handleInputChange('preferred_date', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="preferred_time">Preferred Time</Label>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <Input
                      id="preferred_time"
                      type="time"
                      value={formData.preferred_time}
                      onChange={(e) => handleInputChange('preferred_time', e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="symptoms">Symptoms / Reason for Consultation</Label>
                <Textarea
                  id="symptoms"
                  placeholder="Please describe your symptoms, concerns, or reason for consultation..."
                  value={formData.symptoms}
                  onChange={(e) => handleInputChange('symptoms', e.target.value)}
                  rows={4}
                  required
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Important Notes:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Your consultation request will be reviewed by our admin team</li>
                  <li>• You'll receive a notification once approved or if changes are needed</li>
                  <li>• Payment is required to complete your booking</li>
                  <li>• Consultation fees vary by type (Video: $50, Phone: $40, Chat: $30)</li>
                </ul>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Booking...' : 'Book Consultation & Proceed to Payment'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <Button variant="outline" onClick={() => navigate('/')}>
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BookConsultation;