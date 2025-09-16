import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Shield, Users, Calendar, DollarSign, Eye, CheckCircle, XCircle, Clock } from 'lucide-react';

interface Consultation {
  id: string;
  user_id: string;
  doctor_name: string;
  consultation_type: string;
  preferred_date: string;
  preferred_time: string;
  symptoms: string;
  status: string;
  payment_status: string;
  amount: number;
  admin_notes: string | null;
  created_at: string;
  profiles: {
    full_name: string;
  } | null;
}

interface AdminStats {
  total_consultations: number;
  pending_consultations: number;
  approved_consultations: number;
  total_revenue: number;
}

const AdminDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    total_consultations: 0,
    pending_consultations: 0,
    approved_consultations: 0,
    total_revenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (user) {
      checkAdminAccess();
    }
  }, [user]);

  const checkAdminAccess = async () => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;

      if (profile?.role === 'admin') {
        setIsAdmin(true);
        await fetchAdminData();
      } else {
        setIsAdmin(false);
        toast({
          title: "Access Denied",
          description: "You don't have admin privileges.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error checking admin access:', error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminData = async () => {
    try {
      // Fetch consultations with user profiles
      const { data: consultationsData, error: consultationsError } = await supabase
        .from('consultations')
        .select(`
          *,
          profiles!consultations_user_id_fkey (full_name)
        `)
        .order('created_at', { ascending: false });

      if (consultationsError) throw consultationsError;
      setConsultations(consultationsData || []);

      // Calculate stats
      const totalConsultations = consultationsData?.length || 0;
      const pendingConsultations = consultationsData?.filter(c => c.status === 'pending').length || 0;
      const approvedConsultations = consultationsData?.filter(c => c.status === 'approved').length || 0;
      const totalRevenue = consultationsData?.reduce((sum, c) => {
        return c.payment_status === 'paid' ? sum + Number(c.amount) : sum;
      }, 0) || 0;

      setStats({
        total_consultations: totalConsultations,
        pending_consultations: pendingConsultations,
        approved_consultations: approvedConsultations,
        total_revenue: totalRevenue
      });
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast({
        title: "Error loading data",
        description: "Please refresh the page.",
        variant: "destructive"
      });
    }
  };

  const updateConsultationStatus = async (consultationId: string, newStatus: 'approved' | 'declined') => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('consultations')
        .update({
          status: newStatus,
          admin_notes: adminNotes
        })
        .eq('id', consultationId);

      if (error) throw error;

      toast({
        title: `Consultation ${newStatus}`,
        description: `The consultation has been ${newStatus} successfully.`
      });

      await fetchAdminData();
      setSelectedConsultation(null);
      setAdminNotes('');
    } catch (error) {
      console.error('Error updating consultation:', error);
      toast({
        title: "Update failed",
        description: "Please try again.",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      declined: 'bg-red-100 text-red-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentStatusBadge = (status: string) => {
    const colors = {
      unpaid: 'bg-red-100 text-red-800',
      paid: 'bg-green-100 text-green-800',
      refunded: 'bg-orange-100 text-orange-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-2xl text-red-700">Access Denied</CardTitle>
            <CardDescription>
              You don't have administrator privileges to access this dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.history.back()} className="w-full">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4 flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            Admin Dashboard
          </h1>
          <p className="text-lg text-gray-600">Manage consultations and monitor system activity</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Consultations</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_consultations}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending_consultations}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.approved_consultations}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">${stats.total_revenue}</div>
            </CardContent>
          </Card>
        </div>

        {/* Consultations Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-6 h-6" />
              All Consultations
            </CardTitle>
            <CardDescription>
              Review and manage patient consultation requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consultations.map((consultation) => (
                    <TableRow key={consultation.id}>
                      <TableCell className="font-medium">
                        {consultation.profiles?.full_name || 'Unknown Patient'}
                      </TableCell>
                      <TableCell>{consultation.doctor_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {consultation.consultation_type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{new Date(consultation.preferred_date).toLocaleDateString()}</div>
                          <div className="text-gray-500">{consultation.preferred_time}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(consultation.status)}>
                          {consultation.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPaymentStatusBadge(consultation.payment_status)}>
                          {consultation.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell>${consultation.amount}</TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedConsultation(consultation);
                                setAdminNotes(consultation.admin_notes || '');
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          {selectedConsultation && (
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Consultation Details</DialogTitle>
                                <DialogDescription>
                                  Review and take action on this consultation request
                                </DialogDescription>
                              </DialogHeader>
                              
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <h4 className="font-semibold">Patient:</h4>
                                    <p>{selectedConsultation.profiles?.full_name || 'Unknown'}</p>
                                  </div>
                                  <div>
                                    <h4 className="font-semibold">Doctor:</h4>
                                    <p>{selectedConsultation.doctor_name}</p>
                                  </div>
                                  <div>
                                    <h4 className="font-semibold">Type:</h4>
                                    <p>{selectedConsultation.consultation_type.replace('_', ' ')}</p>
                                  </div>
                                  <div>
                                    <h4 className="font-semibold">Amount:</h4>
                                    <p>${selectedConsultation.amount}</p>
                                  </div>
                                </div>
                                
                                <div>
                                  <h4 className="font-semibold">Preferred Date & Time:</h4>
                                  <p>{new Date(selectedConsultation.preferred_date).toLocaleDateString()} at {selectedConsultation.preferred_time}</p>
                                </div>
                                
                                <div>
                                  <h4 className="font-semibold">Symptoms/Reason:</h4>
                                  <p className="text-gray-700">{selectedConsultation.symptoms}</p>
                                </div>
                                
                                <div>
                                  <h4 className="font-semibold">Admin Notes:</h4>
                                  <Textarea
                                    placeholder="Add notes for the patient (optional)"
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    rows={3}
                                  />
                                </div>
                              </div>
                              
                              <DialogFooter className="flex gap-2">
                                {selectedConsultation.status === 'pending' && (
                                  <>
                                    <Button
                                      variant="outline"
                                      onClick={() => updateConsultationStatus(selectedConsultation.id, 'declined')}
                                      disabled={actionLoading}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <XCircle className="w-4 h-4 mr-2" />
                                      Decline
                                    </Button>
                                    <Button
                                      onClick={() => updateConsultationStatus(selectedConsultation.id, 'approved')}
                                      disabled={actionLoading}
                                    >
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                      Approve
                                    </Button>
                                  </>
                                )}
                              </DialogFooter>
                            </DialogContent>
                          )}
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {consultations.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No consultations found.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;