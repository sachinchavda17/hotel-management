import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API, useAuth } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { toast } from 'sonner';
import { MapPin, Star, DollarSign, LogOut, User, LayoutDashboard, Filter, X } from 'lucide-react';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { format } from 'date-fns';

const AVAILABLE_AMENITIES = ['WiFi', 'Pool', 'Parking', 'Gym', 'Spa', 'Restaurant', 'Bar', 'Beach Access', 'Pet Friendly', 'Room Service'];

const HomePage = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  
  // Basic filters
  const [searchLocation, setSearchLocation] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  
  // Advanced filters
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [minRating, setMinRating] = useState('');
  const [guests, setGuests] = useState('');
  const [checkIn, setCheckIn] = useState(null);
  const [checkOut, setCheckOut] = useState(null);
  const [sortBy, setSortBy] = useState('created_at');
  
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
      if (selectedAmenities.length > 0) params.append('amenities', selectedAmenities.join(','));
      if (minRating) params.append('min_rating', minRating);
      if (guests) params.append('guests', guests);
      if (checkIn) params.append('check_in', checkIn.toISOString());
      if (checkOut) params.append('check_out', checkOut.toISOString());
      if (sortBy) params.append('sort_by', sortBy);

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

  const toggleAmenity = (amenity) => {
    setSelectedAmenities(prev => 
      prev.includes(amenity) 
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity]
    );
  };

  const clearFilters = () => {
    setSearchLocation('');
    setMinPrice('');
    setMaxPrice('');
    setSelectedAmenities([]);
    setMinRating('');
    setGuests('');
    setCheckIn(null);
    setCheckOut(null);
    setSortBy('created_at');
  };

  const activeFiltersCount = [
    searchLocation,
    minPrice,
    maxPrice,
    selectedAmenities.length > 0,
    minRating,
    guests,
    checkIn,
    checkOut
  ].filter(Boolean).length;

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

      {/* Hero Section with Search */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold mb-4">Find Your Perfect Stay</h2>
          <p className="text-xl text-blue-100 mb-8">Discover amazing hotels and properties worldwide</p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="bg-white rounded-lg shadow-lg p-4">
            <div className="flex flex-col md:flex-row gap-3 mb-3">
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
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="md:w-auto bg-white"
                data-testid="toggle-filters-btn"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
              </Button>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="border-t pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Check-in Date */}
                  <div className="space-y-2">
                    <Label className="text-gray-700">Check-in</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-gray-700" data-testid="filter-check-in-btn">
                          {checkIn ? format(checkIn, 'PP') : 'Select date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={checkIn}
                          onSelect={setCheckIn}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Check-out Date */}
                  <div className="space-y-2">
                    <Label className="text-gray-700">Check-out</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-gray-700" data-testid="filter-check-out-btn">
                          {checkOut ? format(checkOut, 'PP') : 'Select date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={checkOut}
                          onSelect={setCheckOut}
                          disabled={(date) => !checkIn || date <= checkIn}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Guests */}
                  <div className="space-y-2">
                    <Label className="text-gray-700">Guests</Label>
                    <Input
                      type="number"
                      placeholder="Number of guests"
                      value={guests}
                      onChange={(e) => setGuests(e.target.value)}
                      min="1"
                      data-testid="filter-guests-input"
                      className="text-gray-700"
                    />
                  </div>

                  {/* Minimum Rating */}
                  <div className="space-y-2">
                    <Label className="text-gray-700">Min Rating</Label>
                    <Select value={minRating} onValueChange={setMinRating}>
                      <SelectTrigger data-testid="filter-rating-select" className="text-gray-700">
                        <SelectValue placeholder="Any rating" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Any rating</SelectItem>
                        <SelectItem value="3">3+ Stars</SelectItem>
                        <SelectItem value="4">4+ Stars</SelectItem>
                        <SelectItem value="4.5">4.5+ Stars</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sort By */}
                  <div className="space-y-2">
                    <Label className="text-gray-700">Sort By</Label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger data-testid="filter-sort-select" className="text-gray-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="created_at">Newest</SelectItem>
                        <SelectItem value="price_asc">Price: Low to High</SelectItem>
                        <SelectItem value="price_desc">Price: High to Low</SelectItem>
                        <SelectItem value="rating">Rating</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Amenities */}
                <div className="space-y-2">
                  <Label className="text-gray-700">Amenities</Label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_AMENITIES.map((amenity) => (
                      <label
                        key={amenity}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors ${
                          selectedAmenities.includes(amenity)
                            ? 'bg-blue-100 border-2 border-blue-600'
                            : 'bg-gray-100 border-2 border-transparent hover:bg-gray-200'
                        }`}
                        data-testid={`amenity-filter-${amenity.toLowerCase().replace(' ', '-')}`}
                      >
                        <Checkbox
                          checked={selectedAmenities.includes(amenity)}
                          onCheckedChange={() => toggleAmenity(amenity)}
                        />
                        <span className="text-sm text-gray-700">{amenity}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Filter Actions */}
                <div className="flex gap-3 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearFilters}
                    data-testid="clear-filters-btn"
                    className="text-gray-700"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear Filters
                  </Button>
                  <Button type="submit" data-testid="apply-filters-btn">
                    Apply Filters
                  </Button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Properties Grid */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {activeFiltersCount > 0 && (
          <div className="mb-6">
            <p className="text-gray-600">
              {properties.length} {properties.length === 1 ? 'property' : 'properties'} found
              {activeFiltersCount > 0 && ` with ${activeFiltersCount} filter${activeFiltersCount > 1 ? 's' : ''} applied`}
            </p>
          </div>
        )}

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
                    {property.amenities.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{property.amenities.length - 3} more
                      </Badge>
                    )}
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
