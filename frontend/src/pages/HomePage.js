import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API, useAuth } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { MapPin, Star, DollarSign, LogOut, User, LayoutDashboard } from 'lucide-react';

const HomePage = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchLocation, setSearchLocation] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const params = new URLSearchParams();
      if (searchLocation) params.append('location', searchLocation);
      if (minPrice) params.append('min_price', minPrice);
      if (maxPrice) params.append('max_price', maxPrice);

      const response = await axios.get(`${API}/properties?${params.toString()}`);
      setProperties(response.data);
    } catch (error) {
      toast.error('Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setLoading(true);
    fetchProperties();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600" data-testid="app-title">🏨 Hotel Booking</h1>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="text-sm text-gray-600">Hi, {user.name}</span>
                {user.role === 'admin' ? (
                  <Button onClick={() => navigate('/admin')} variant="outline" size="sm" data-testid="admin-dashboard-btn">
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Admin Panel
                  </Button>
                ) : (
                  <Button onClick={() => navigate('/dashboard')} variant="outline" size="sm" data-testid="user-dashboard-btn">
                    <User className="w-4 h-4 mr-2" />
                    My Bookings
                  </Button>
                )}
                <Button onClick={logout} variant="ghost" size="sm" data-testid="logout-btn">
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => navigate('/login')} variant="outline" size="sm" data-testid="header-login-btn">
                  Login
                </Button>
                <Button onClick={() => navigate('/register')} size="sm" data-testid="header-register-btn">
                  Sign Up
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold mb-4">Find Your Perfect Stay</h2>
          <p className="text-xl text-blue-100 mb-8">Discover amazing hotels and properties worldwide</p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="bg-white rounded-lg shadow-lg p-4 flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Location (e.g., New York)"
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                className="w-full"
                data-testid="search-location-input"
              />
            </div>
            <div className="w-full md:w-32">
              <Input
                type="number"
                placeholder="Min $"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-full"
                data-testid="search-min-price-input"
              />
            </div>
            <div className="w-full md:w-32">
              <Input
                type="number"
                placeholder="Max $"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-full"
                data-testid="search-max-price-input"
              />
            </div>
            <Button type="submit" className="md:w-auto" data-testid="search-submit-btn">
              Search
            </Button>
          </form>
        </div>
      </div>

      {/* Properties Grid */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {loading ? (
          <div className="text-center py-12">Loading properties...</div>
        ) : properties.length === 0 ? (
          <div className="text-center py-12" data-testid="no-properties-message">
            <p className="text-gray-500 text-lg">No properties found. Try adjusting your search filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="properties-grid">
            {properties.map((property) => (
              <Card
                key={property.id}
                className="overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => navigate(`/property/${property.id}`)}
                data-testid={`property-card-${property.id}`}
              >
                <div className="aspect-video overflow-hidden">
                  <img
                    src={property.images[0] || 'https://via.placeholder.com/400x300'}
                    alt={property.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform"
                  />
                </div>
                <CardHeader>
                  <CardTitle className="text-lg">{property.name}</CardTitle>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    {property.location}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-gray-600 line-clamp-2">{property.description}</p>
                  <div className="flex items-center gap-2">
                    {property.rating > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{property.rating}</span>
                        <span className="text-xs text-gray-500">({property.review_count})</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {property.amenities.slice(0, 3).map((amenity, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between items-center">
                  <div className="flex items-center gap-1 text-2xl font-bold text-blue-600">
                    <DollarSign className="w-5 h-5" />
                    {property.price_per_night}
                    <span className="text-sm text-gray-500 font-normal">/night</span>
                  </div>
                  <Button size="sm" data-testid={`view-details-btn-${property.id}`}>View Details</Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;