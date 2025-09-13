-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create hospitals table
CREATE TABLE public.hospitals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT,
  phone TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  hospital_type TEXT DEFAULT 'General',
  emergency_services BOOLEAN DEFAULT true,
  rating DECIMAL(2, 1) DEFAULT 4.0,
  bed_capacity INTEGER,
  website TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on hospitals (public read access)
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access to hospitals
CREATE POLICY "Hospitals are viewable by everyone" 
ON public.hospitals 
FOR SELECT 
USING (true);

-- Insert sample hospital data
INSERT INTO public.hospitals (name, address, city, state, zip_code, phone, latitude, longitude, hospital_type, emergency_services, rating, bed_capacity, website) VALUES
('City General Hospital', '123 Main St', 'New York', 'NY', '10001', '(555) 123-4567', 40.7128, -74.0060, 'General', true, 4.2, 400, 'https://citygeneral.com'),
('St. Mary Medical Center', '456 Oak Ave', 'Los Angeles', 'CA', '90210', '(555) 234-5678', 34.0522, -118.2437, 'General', true, 4.5, 350, 'https://stmarymedical.com'),
('Metropolitan Emergency Hospital', '789 Pine St', 'Chicago', 'IL', '60601', '(555) 345-6789', 41.8781, -87.6298, 'Emergency', true, 4.0, 200, 'https://metroemergency.com'),
('Children''s Healthcare Center', '321 Elm Dr', 'Houston', 'TX', '77001', '(555) 456-7890', 29.7604, -95.3698, 'Pediatric', true, 4.8, 150, 'https://childrenshealth.com'),
('University Medical Hospital', '654 University Blvd', 'Phoenix', 'AZ', '85001', '(555) 567-8901', 33.4484, -112.0740, 'Teaching', true, 4.3, 500, 'https://univmedical.com'),
('Regional Heart Institute', '987 Health Way', 'Philadelphia', 'PA', '19101', '(555) 678-9012', 39.9526, -75.1652, 'Cardiac', false, 4.7, 100, 'https://heartinstitute.com'),
('North Shore Community Hospital', '147 Shore Dr', 'Miami', 'FL', '33101', '(555) 789-0123', 25.7617, -80.1918, 'Community', true, 4.1, 250, 'https://northshorecommunity.com'),
('Mountain View Medical Center', '258 Mountain Rd', 'Denver', 'CO', '80201', '(555) 890-1234', 39.7392, -104.9903, 'General', true, 4.4, 300, 'https://mountainviewmedical.com');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates on profiles
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();