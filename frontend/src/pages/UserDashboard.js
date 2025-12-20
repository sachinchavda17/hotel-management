import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API, useAuth } from '../App';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { Home, LogOut, Calendar, MapPin, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

const UserDashboard = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await axios.get(`${API}/bookings/my`);
      setBookings(response.data);
    } catch (error) {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    try {
      await axios.put(`${API}/bookings/${bookingId}/cancel`);
      toast.success('Booking cancelled');
      fetchBookings();
    } catch (error) {
      toast.error('Failed to cancel booking');
    }
  };

  const activeBookings = bookings.filter((b) => b.status === 'confirmed');
  const cancelledBookings = bookings.filter((b) => b.status === 'cancelled');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600" data-testid="dashboard-title">My Dashboard</h1>
          <div className="flex items-center gap-3">
            <Button onClick={() => navigate('/')} variant="outline" size="sm" data-testid="back-home-btn">
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
            <Button onClick={logout} variant="ghost" size="sm" data-testid="logout-btn">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* User Info */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <span className="text-gray-600">Name: </span>
                <span className="font-medium" data-testid="user-name">{user?.name}</span>
              </div>
              <div>
                <span className="text-gray-600">Email: </span>
                <span className="font-medium" data-testid="user-email">{user?.email}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bookings */}
        <Card>
          <CardHeader>
            <CardTitle>My Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading bookings...</div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-8" data-testid="no-bookings-message">
                <p className="text-gray-500 mb-4">You haven't made any bookings yet.</p>
                <Button onClick={() => navigate('/')} data-testid="browse-properties-btn">Browse Properties</Button>
              </div>
            ) : (
              <Tabs defaultValue="active" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="active" data-testid="active-bookings-tab">
                    Active ({activeBookings.length})
                  </TabsTrigger>
                  <TabsTrigger value="cancelled" data-testid="cancelled-bookings-tab">
                    Cancelled ({cancelledBookings.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="space-y-4 mt-4">
                  {activeBookings.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No active bookings</p>
                  ) : (
                    activeBookings.map((booking) => (
                      <Card key={booking.id} data-testid={`booking-${booking.id}`}>
                        <CardContent className="pt-6">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="space-y-2 flex-1">
                              <h3 className="font-bold text-lg">{booking.property_name}</h3>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Calendar className="w-4 h-4" />
                                <span>
                                  {format(new Date(booking.check_in), 'PP')} -{' '}
                                  {format(new Date(booking.check_out), 'PP')}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <DollarSign className="w-4 h-4" />
                                <span className="font-medium">${booking.total_price}</span>
                              </div>
                              <Badge variant="default">Confirmed</Badge>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                onClick={() => handleCancelBooking(booking.id)}
                                data-testid={`cancel-booking-${booking.id}`}
                              >
                                Cancel Booking
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="cancelled" className="space-y-4 mt-4">
                  {cancelledBookings.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No cancelled bookings</p>
                  ) : (
                    cancelledBookings.map((booking) => (
                      <Card key={booking.id} className="opacity-75">
                        <CardContent className="pt-6">
                          <div className="space-y-2">
                            <h3 className="font-bold text-lg">{booking.property_name}</h3>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar className="w-4 h-4" />
                              <span>
                                {format(new Date(booking.check_in), 'PP')} -{' '}
                                {format(new Date(booking.check_out), 'PP')}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <DollarSign className="w-4 h-4" />
                              <span className="font-medium">${booking.total_price}</span>
                            </div>
                            <Badge variant="destructive">Cancelled</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserDashboard;