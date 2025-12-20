import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API, useAuth } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import { Home, LogOut, Plus, Edit, Trash2, Calendar, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

const AdminDashboard = () => {
  const [properties, setProperties] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPropertyDialog, setShowPropertyDialog] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [propertyForm, setPropertyForm] = useState({
    name: '',
    description: '',
    location: '',
    price_per_night: '',
    amenities: '',
    images: '',
  });
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProperties();
    fetchAllBookings();
  }, []);

  const fetchProperties = async () => {
    try {
      const response = await axios.get(`${API}/properties`);
      setProperties(response.data);
    } catch (error) {
      toast.error('Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllBookings = async () => {
    try {
      const response = await axios.get(`${API}/bookings/all`);
      setBookings(response.data);
    } catch (error) {
      toast.error('Failed to load bookings');
    }
  };

  const handleOpenPropertyDialog = (property = null) => {
    if (property) {
      setEditingProperty(property);
      setPropertyForm({
        name: property.name,
        description: property.description,
        location: property.location,
        price_per_night: property.price_per_night.toString(),
        amenities: property.amenities.join(', '),
        images: property.images.join('\n'),
      });
    } else {
      setEditingProperty(null);
      setPropertyForm({
        name: '',
        description: '',
        location: '',
        price_per_night: '',
        amenities: '',
        images: '',
      });
    }
    setShowPropertyDialog(true);
  };

  const handleSaveProperty = async () => {
    try {
      const data = {
        name: propertyForm.name,
        description: propertyForm.description,
        location: propertyForm.location,
        price_per_night: parseFloat(propertyForm.price_per_night),
        amenities: propertyForm.amenities.split(',').map((a) => a.trim()).filter(Boolean),
        images: propertyForm.images.split('\n').map((i) => i.trim()).filter(Boolean),
      };

      if (editingProperty) {
        await axios.put(`${API}/properties/${editingProperty.id}`, data);
        toast.success('Property updated successfully');
      } else {
        await axios.post(`${API}/properties`, data);
        toast.success('Property created successfully');
      }

      setShowPropertyDialog(false);
      fetchProperties();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save property');
    }
  };

  const handleDeleteProperty = async (propertyId) => {
    if (!window.confirm('Are you sure you want to delete this property?')) return;

    try {
      await axios.delete(`${API}/properties/${propertyId}`);
      toast.success('Property deleted successfully');
      fetchProperties();
    } catch (error) {
      toast.error('Failed to delete property');
    }
  };

  const totalRevenue = bookings
    .filter((b) => b.status === 'confirmed')
    .reduce((sum, b) => sum + b.total_price, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600" data-testid="admin-dashboard-title">
            Admin Dashboard
          </h1>
          <div className="flex items-center gap-3">
            <Button onClick={() => navigate('/')} variant="outline" size="sm" data-testid="admin-home-btn">
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
            <Button onClick={logout} variant="ghost" size="sm" data-testid="admin-logout-btn">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-gray-600">Total Properties</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold" data-testid="total-properties">{properties.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-gray-600">Total Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold" data-testid="total-bookings">{bookings.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-gray-600">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600" data-testid="total-revenue">
                ${totalRevenue.toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="properties">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="properties" data-testid="properties-tab">Properties</TabsTrigger>
                <TabsTrigger value="bookings" data-testid="bookings-tab">All Bookings</TabsTrigger>
              </TabsList>

              <TabsContent value="properties" className="space-y-4 mt-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Manage Properties</h3>
                  <Button onClick={() => handleOpenPropertyDialog()} data-testid="add-property-btn">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Property
                  </Button>
                </div>

                {loading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : properties.length === 0 ? (
                  <div className="text-center py-8" data-testid="no-properties-admin">
                    <p className="text-gray-500 mb-4">No properties yet.</p>
                    <Button onClick={() => handleOpenPropertyDialog()}>Add Your First Property</Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {properties.map((property) => (
                      <Card key={property.id} data-testid={`admin-property-${property.id}`}>
                        <CardContent className="pt-6">
                          <div className="flex gap-4">
                            <img
                              src={property.images[0]}
                              alt={property.name}
                              className="w-32 h-24 object-cover rounded"
                            />
                            <div className="flex-1">
                              <h4 className="font-bold text-lg">{property.name}</h4>
                              <p className="text-sm text-gray-600">{property.location}</p>
                              <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                {property.description}
                              </p>
                              <div className="mt-2 flex items-center gap-4">
                                <span className="font-bold text-blue-600">
                                  ${property.price_per_night}/night
                                </span>
                                {property.rating > 0 && (
                                  <Badge variant="secondary">
                                    ⭐ {property.rating} ({property.review_count})
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenPropertyDialog(property)}
                                data-testid={`edit-property-${property.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteProperty(property.id)}
                                data-testid={`delete-property-${property.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="bookings" className="mt-4">
                <h3 className="text-lg font-semibold mb-4">All Bookings</h3>
                {bookings.length === 0 ? (
                  <div className="text-center py-8" data-testid="no-bookings-admin">
                    <p className="text-gray-500">No bookings yet.</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Property</TableHead>
                          <TableHead>Check-in</TableHead>
                          <TableHead>Check-out</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bookings.map((booking) => (
                          <TableRow key={booking.id} data-testid={`admin-booking-${booking.id}`}>
                            <TableCell className="font-medium">{booking.property_name}</TableCell>
                            <TableCell>{format(new Date(booking.check_in), 'PP')}</TableCell>
                            <TableCell>{format(new Date(booking.check_out), 'PP')}</TableCell>
                            <TableCell className="font-bold">${booking.total_price}</TableCell>
                            <TableCell>
                              <Badge
                                variant={booking.status === 'confirmed' ? 'default' : 'destructive'}
                              >
                                {booking.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Property Dialog */}
      <Dialog open={showPropertyDialog} onOpenChange={setShowPropertyDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="property-dialog">
          <DialogHeader>
            <DialogTitle>
              {editingProperty ? 'Edit Property' : 'Add New Property'}
            </DialogTitle>
            <DialogDescription>
              Fill in the property details below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Property Name</Label>
              <Input
                id="name"
                value={propertyForm.name}
                onChange={(e) => setPropertyForm({ ...propertyForm, name: e.target.value })}
                placeholder="Luxury Beach Resort"
                data-testid="property-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={propertyForm.location}
                onChange={(e) => setPropertyForm({ ...propertyForm, location: e.target.value })}
                placeholder="Miami, Florida"
                data-testid="property-location-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price per Night ($)</Label>
              <Input
                id="price"
                type="number"
                value={propertyForm.price_per_night}
                onChange={(e) => setPropertyForm({ ...propertyForm, price_per_night: e.target.value })}
                placeholder="199"
                data-testid="property-price-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={propertyForm.description}
                onChange={(e) => setPropertyForm({ ...propertyForm, description: e.target.value })}
                placeholder="Describe the property..."
                rows={4}
                data-testid="property-description-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amenities">Amenities (comma-separated)</Label>
              <Input
                id="amenities"
                value={propertyForm.amenities}
                onChange={(e) => setPropertyForm({ ...propertyForm, amenities: e.target.value })}
                placeholder="WiFi, Breakfast, AC, Pool"
                data-testid="property-amenities-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="images">Image URLs (one per line)</Label>
              <Textarea
                id="images"
                value={propertyForm.images}
                onChange={(e) => setPropertyForm({ ...propertyForm, images: e.target.value })}
                placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
                rows={4}
                data-testid="property-images-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPropertyDialog(false)} data-testid="cancel-property-btn">
              Cancel
            </Button>
            <Button onClick={handleSaveProperty} data-testid="save-property-btn">
              {editingProperty ? 'Update' : 'Create'} Property
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
