import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MapPin, Search, Phone, Star, Bed, Globe, ExternalLink } from 'lucide-react';

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
  rating: number;
  emergency_services: boolean;
  bed_count: number;
  specialties: string;
  website: string;
  distance?: number;
}

const HospitalFinder = () => {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [searchLocation, setSearchLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const staticHospitals: Hospital[] = [
    {
      id: '1',
      name: 'NewYork-Presbyterian Hospital',
      address: '525 E 68th St',
      city: 'New York',
      state: 'NY',
      zip_code: '10065',
      phone: '(212) 746-5454',
      latitude: 40.7675,
      longitude: -73.9540,
      rating: 4.2,
      emergency_services: true,
      bed_count: 2600,
      specialties: 'Cardiology, Oncology, Neurology',
      website: 'https://www.nyp.org'
    },
    {
      id: '2',
      name: 'Cedars-Sinai Medical Center',
      address: '8700 Beverly Blvd',
      city: 'Los Angeles',
      state: 'CA',
      zip_code: '90048',
      phone: '(310) 423-3277',
      latitude: 34.0759,
      longitude: -118.3776,
      rating: 4.4,
      emergency_services: true,
      bed_count: 886,
      specialties: 'Cardiology, Gastroenterology, Orthopedics',
      website: 'https://www.cedars-sinai.org'
    }
  ];

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const loadNearbyHospitals = async () => {
    setLoading(true);
    try {
      const hospitalsWithDistance = staticHospitals.map((hospital: Hospital) => ({
        ...hospital,
        distance: userLocation 
          ? calculateDistance(userLocation.lat, userLocation.lng, hospital.latitude, hospital.longitude)
          : undefined
      }));

      const sortedHospitals = hospitalsWithDistance.sort((a, b) => {
        if (a.distance && b.distance) {
          return a.distance - b.distance;
        }
        return 0;
      });

      setHospitals(sortedHospitals);
    } catch (error) {
      console.error('Error loading hospitals:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchHospitals = async () => {
    if (!searchLocation.trim()) return;
    
    setLoading(true);
    try {
      const filteredData = staticHospitals.filter(hospital =>
        hospital.city.toLowerCase().includes(searchLocation.toLowerCase()) ||
        hospital.state.toLowerCase().includes(searchLocation.toLowerCase())
      );
      
      setHospitals(filteredData);
    } catch (error) {
      console.error('Error searching hospitals:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Find Nearby Hospitals</h2>
        <p className="text-lg text-gray-600">Locate healthcare facilities in your area</p>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Enter city or state (e.g., New York, CA)"
            value={searchLocation}
            onChange={(e) => setSearchLocation(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchHospitals()}
          />
        </div>
        <Button onClick={searchHospitals} disabled={loading}>
          <Search className="w-4 h-4 mr-2" />
          Search
        </Button>
        <Button variant="outline" onClick={loadNearbyHospitals} disabled={loading}>
          <MapPin className="w-4 h-4 mr-2" />
          Near Me
        </Button>
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {hospitals.map((hospital) => (
          <Card key={hospital.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">{hospital.name}</CardTitle>
              <CardDescription className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {hospital.address}, {hospital.city}, {hospital.state}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span className="font-medium">{hospital.rating}</span>
                </div>
                {hospital.distance && (
                  <Badge variant="secondary">
                    {hospital.distance.toFixed(1)} miles
                  </Badge>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <a href={`tel:${hospital.phone}`} className="text-primary hover:underline">
                    {hospital.phone}
                  </a>
                </div>
                
                <div className="flex items-center gap-2">
                  <Bed className="w-4 h-4 text-gray-500" />
                  <span>{hospital.bed_count} beds</span>
                </div>

                {hospital.emergency_services && (
                  <Badge variant="destructive" className="text-xs">
                    Emergency Services
                  </Badge>
                )}
              </div>

              <div>
                <p className="text-sm text-gray-600 font-medium">Specialties:</p>
                <p className="text-xs text-gray-500">{hospital.specialties}</p>
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline" asChild className="flex-1">
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hospital.name + ' ' + hospital.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Directions
                  </a>
                </Button>
                
                {hospital.website && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={hospital.website} target="_blank" rel="noopener noreferrer">
                      <Globe className="w-3 h-3" />
                    </a>
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {hospitals.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No hospitals found. Try searching for a different location.</p>
        </div>
      )}
    </div>
  );
};

export default HospitalFinder;