import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  Search, 
  Phone, 
  Star, 
  Clock, 
  Activity,
  Shield,
  Navigation,
  Heart
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Hospital {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  latitude: number;
  longitude: number;
  hospital_type: string;
  emergency_services: boolean;
  rating: number;
  bed_capacity: number;
  website: string;
  distance?: number;
}

const HospitalFinder = () => {
  const [location, setLocation] = useState("");
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const { toast } = useToast();

  // Get user's current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          findNearbyHospitals(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          toast({
            title: "Location Error",
            description: "Unable to get your location. Please enter your location manually.",
            variant: "destructive"
          });
        }
      );
    } else {
      toast({
        title: "Location Not Supported",
        description: "Geolocation is not supported by this browser.",
        variant: "destructive"
      });
    }
  };

  // Calculate distance between two points
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 3959; // Radius of Earth in miles
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return Math.round(distance * 10) / 10; // Round to 1 decimal place
  };

  // Find nearby hospitals based on coordinates
  const findNearbyHospitals = async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('hospitals')
        .select('*')
        .order('name');

      if (error) throw error;

      // Calculate distances and sort by proximity
      const hospitalsWithDistance = data.map((hospital: Hospital) => ({
        ...hospital,
        distance: calculateDistance(lat, lng, hospital.latitude, hospital.longitude)
      })).sort((a, b) => (a.distance || 0) - (b.distance || 0));

      setHospitals(hospitalsWithDistance);
      toast({
        title: "Hospitals Found",
        description: `Found ${hospitalsWithDistance.length} hospitals near you.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to find hospitals",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Search hospitals by location name
  const searchHospitals = async () => {
    if (!location.trim()) {
      toast({
        title: "Location Required",
        description: "Please enter a location to search for hospitals.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('hospitals')
        .select('*')
        .or(`city.ilike.%${location}%,state.ilike.%${location}%,zip_code.ilike.%${location}%`)
        .order('name');

      if (error) throw error;

      setHospitals(data || []);
      toast({
        title: "Search Results",
        description: `Found ${data?.length || 0} hospitals matching "${location}".`,
      });
    } catch (error: any) {
      toast({
        title: "Search Error",
        description: error.message || "Failed to search hospitals",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Load all hospitals on component mount
  useEffect(() => {
    const loadAllHospitals = async () => {
      const { data, error } = await supabase
        .from('hospitals')
        .select('*')
        .order('name');
      
      if (!error && data) {
        setHospitals(data);
      }
    };
    
    loadAllHospitals();
  }, []);

  return (
    <section id="hospitals" className="py-20 px-4 bg-muted/30">
      <div className="container mx-auto">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-secondary/10 text-secondary">Hospital Locator</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Find Healthcare Near You</h2>
            <p className="text-xl text-muted-foreground">
              Locate the nearest hospitals, clinics, and healthcare facilities in your area with real-time availability.
            </p>
          </div>
          
          <Card className="shadow-card border-0 bg-gradient-card mb-8">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Enter your location, city, or zip code"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="pl-10 h-12 text-lg border-2 focus:border-primary"
                    onKeyPress={(e) => e.key === 'Enter' && searchHospitals()}
                  />
                </div>
                <Button 
                  size="lg" 
                  onClick={searchHospitals}
                  disabled={loading}
                  className="bg-gradient-primary text-primary-foreground shadow-soft px-8"
                >
                  <Search className="mr-2 h-5 w-5" />
                  Search Hospitals
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={getCurrentLocation}
                  disabled={loading}
                  className="px-8"
                >
                  <Navigation className="mr-2 h-5 w-5" />
                  Use My Location
                </Button>
              </div>
              
              <div className="grid md:grid-cols-3 gap-6">
                <div className="flex items-center gap-3">
                  <Clock className="h-6 w-6 text-secondary" />
                  <div>
                    <div className="font-semibold">Real-time Availability</div>
                    <div className="text-sm text-muted-foreground">Live updates on bed availability</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Activity className="h-6 w-6 text-secondary" />
                  <div>
                    <div className="font-semibold">Emergency Services</div>
                    <div className="text-sm text-muted-foreground">24/7 emergency care locations</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="h-6 w-6 text-secondary" />
                  <div>
                    <div className="font-semibold">Verified Facilities</div>
                    <div className="text-sm text-muted-foreground">Licensed and certified hospitals</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hospital Results */}
          {hospitals.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-2xl font-bold mb-6">
                {userLocation ? "Nearby Hospitals" : "Hospital Results"} 
                <span className="text-muted-foreground ml-2">({hospitals.length} found)</span>
              </h3>
              
              <div className="grid gap-6">
                {hospitals.map((hospital) => (
                  <Card key={hospital.id} className="shadow-card border-0 bg-gradient-card hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-4 mb-4">
                            <div className="bg-gradient-primary w-12 h-12 rounded-xl flex items-center justify-center shadow-soft">
                              <Heart className="h-6 w-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <h4 className="text-xl font-bold text-primary mb-2">{hospital.name}</h4>
                              <p className="text-muted-foreground mb-2">
                                {hospital.address}, {hospital.city}, {hospital.state} {hospital.zip_code}
                              </p>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Phone className="h-4 w-4" />
                                  {hospital.phone}
                                </div>
                                {hospital.distance && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-4 w-4" />
                                    {hospital.distance} miles away
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-2 mb-4">
                            <Badge variant="secondary">{hospital.hospital_type}</Badge>
                            {hospital.emergency_services && (
                              <Badge className="bg-destructive/10 text-destructive">Emergency Services</Badge>
                            )}
                            <Badge variant="outline">{hospital.bed_capacity} beds</Badge>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-yellow-400 fill-current" />
                              <span className="font-medium">{hospital.rating}</span>
                            </div>
                            <span className="text-muted-foreground">rating</span>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          <Button 
                            className="bg-gradient-primary text-primary-foreground shadow-soft"
                            onClick={() => window.open(`https://maps.google.com?q=${hospital.latitude},${hospital.longitude}`, '_blank')}
                          >
                            <Navigation className="mr-2 h-4 w-4" />
                            Get Directions
                          </Button>
                          {hospital.website && (
                            <Button 
                              variant="outline"
                              onClick={() => window.open(hospital.website, '_blank')}
                            >
                              Visit Website
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
          
          {loading && (
            <div className="text-center py-8">
              <div className="inline-flex items-center gap-2 text-muted-foreground">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                Searching for hospitals...
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default HospitalFinder;