-- First create function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE user_id = auth.uid()),
    'user'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Create consultations table
CREATE TABLE public.consultations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_name TEXT NOT NULL,
  consultation_type TEXT NOT NULL CHECK (consultation_type IN ('video_call', 'phone_call', 'chat')),
  preferred_date DATE NOT NULL,
  preferred_time TIME NOT NULL,
  symptoms TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'completed', 'cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
  amount DECIMAL(10,2) NOT NULL DEFAULT 50.00,
  bank_account_id UUID,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bank_accounts table for payment options
CREATE TABLE public.bank_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_name TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  routing_number TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consultation_id UUID REFERENCES public.consultations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Consultations policies
CREATE POLICY "Users can view their own consultations" 
ON public.consultations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own consultations" 
ON public.consultations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own consultations" 
ON public.consultations 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all consultations" 
ON public.consultations 
FOR SELECT 
USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can update all consultations" 
ON public.consultations 
FOR UPDATE 
USING (public.get_current_user_role() = 'admin');

-- Bank accounts policies (public read for all authenticated users)
CREATE POLICY "Authenticated users can view active bank accounts" 
ON public.bank_accounts 
FOR SELECT 
TO authenticated
USING (is_active = true);

CREATE POLICY "Admins can manage bank accounts" 
ON public.bank_accounts 
FOR ALL 
USING (public.get_current_user_role() = 'admin');

-- Notifications policies
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

-- Create triggers for updated_at
CREATE TRIGGER update_consultations_updated_at
BEFORE UPDATE ON public.consultations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create notifications when consultation status changes
CREATE OR REPLACE FUNCTION public.notify_consultation_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify if status changed and it's approved or declined
  IF NEW.status != OLD.status AND NEW.status IN ('approved', 'declined') THEN
    INSERT INTO public.notifications (user_id, consultation_id, title, message)
    VALUES (
      NEW.user_id,
      NEW.id,
      CASE 
        WHEN NEW.status = 'approved' THEN 'Consultation Approved ✅'
        WHEN NEW.status = 'declined' THEN 'Consultation Declined ❌'
      END,
      CASE 
        WHEN NEW.status = 'approved' THEN 'Your consultation request has been approved! You will receive further details soon.'
        WHEN NEW.status = 'declined' THEN 'Your consultation request has been declined. ' || COALESCE('Reason: ' || NEW.admin_notes, 'Please contact support for more information.')
      END
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for consultation notifications
CREATE TRIGGER consultation_status_notification
AFTER UPDATE ON public.consultations
FOR EACH ROW
EXECUTE FUNCTION public.notify_consultation_status_change();

-- Insert sample bank accounts
INSERT INTO public.bank_accounts (bank_name, account_name, account_number, routing_number) VALUES
('Wells Fargo', 'HealthConnect Medical Services', '1234567890', '121000248'),
('Chase Bank', 'HealthConnect Medical Services', '9876543210', '021000021'),
('Bank of America', 'HealthConnect Medical Services', '5555666677', '026009593'),
('Citibank', 'HealthConnect Medical Services', '1111222233', '021000089');

-- Update admin role for the specified email
UPDATE public.profiles 
SET role = 'admin' 
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email = 'omatulemarvellous721@gmail.com'
);