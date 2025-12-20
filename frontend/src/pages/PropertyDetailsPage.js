import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API, useAuth } from '../App';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import { MapPin, Star, DollarSign, Wifi, Coffee, Wind, Tv, Car, Home, ArrowLeft } from 'lucide-react';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { format } from 'date-fns';

const amenityIcons = {
  'WiFi': Wifi,
  'Breakfast': Coffee,
  'AC': Wind,
  'TV': Tv,
  'Parking': Car,
  'Room Service': Home,
};

const PropertyDetailsPage = () => {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkIn, setCheckIn] = useState(null);
  const [checkOut, setCheckOut] = useState(null);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProperty();
    fetchReviews();
  }, [id]);

  const fetchProperty = async () => {
    try {
      const response = await axios.get(`${API}/properties/${id}`);
      setProperty(response.data);
    } catch (error) {
      toast.error('Failed to load property');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await axios.get(`${API}/reviews/property/${id}`);
      setReviews(response.data);
    } catch (error) {
      console.error('Failed to load reviews');
    }
  };

  const handleBooking = async () => {
    if (!user) {
      toast.error('Please login to make a booking');
      navigate('/login');
      return;
    }

    if (!checkIn || !checkOut) {
      toast.error('Please select check-in and check-out dates');
      return;
    }

    try {
      const bookingData = {
        property_id: id,
        check_in: checkIn.toISOString(),
        check_out: checkOut.toISOString(),
      };

      const response = await axios.post(`${API}/bookings`, bookingData);
      
      // Mock payment
      await axios.post(`${API}/payment/mock`, {
        booking_id: response.data.id,
        amount: response.data.total_price,
        card_number: '4111111111111111',
      });

      toast.success('Booking confirmed!');
      setShowBookingDialog(false);
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Booking failed');
    }
  };

  const handleReview = async () => {
    if (!user) {
      toast.error('Please login to leave a review');
      navigate('/login');
      return;
    }

    try {
      await axios.post(`${API}/reviews`, {
        property_id: id,
        rating,
        comment,
      });

      toast.success('Review submitted!');
      setShowReviewDialog(false);
      setComment('');
      setRating(5);
      fetchReviews();
      fetchProperty();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit review');
    }
  };

  const calculateNights = () => {
    if (checkIn && checkOut) {
      const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
      return nights > 0 ? nights : 0;
    }
    return 0;
  };

  const totalPrice = property && calculateNights() > 0 ? calculateNights() * property.price_per_night : 0;

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!property) {
    return <div className="flex items-center justify-center min-h-screen">Property not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/')} data-testid="back-to-home-btn">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Image Gallery */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="aspect-video md:aspect-[4/3] overflow-hidden rounded-lg">
            <img
              src={property.images[0]}
              alt={property.name}
              className="w-full h-full object-cover"
              data-testid="property-main-image"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {property.images.slice(1, 5).map((img, idx) => (
              <div key={idx} className="aspect-video overflow-hidden rounded-lg">
                <img src={img} alt={`${property.name} ${idx + 2}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Property Details */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2" data-testid="property-name">{property.name}</h1>
              <div className="flex items-center gap-4 text-gray-600">
                <div className="flex items-center gap-1">
                  <MapPin className="w-5 h-5" />
                  <span data-testid="property-location">{property.location}</span>
                </div>
                {property.rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{property.rating}</span>
                    <span className="text-sm">({property.review_count} reviews)</span>
                  </div>
                )}
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700" data-testid="property-description">{property.description}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Amenities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {property.amenities.map((amenity, idx) => {
                    const Icon = amenityIcons[amenity] || Home;
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <Icon className="w-5 h-5 text-blue-600" />
                        <span>{amenity}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Reviews Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Reviews ({reviews.length})</CardTitle>
                {user && (
                  <Button size="sm" onClick={() => setShowReviewDialog(true)} data-testid="write-review-btn">
                    Write a Review
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {reviews.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No reviews yet. Be the first to review!</p>
                ) : (
                  reviews.map((review) => (
                    <div key={review.id} className="border-b pb-4 last:border-0" data-testid={`review-${review.id}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">{review.user_name}</div>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span>{review.rating}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">{review.comment}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(review.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Booking Card */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <div className="flex items-center gap-2 text-3xl font-bold text-blue-600">
                  <DollarSign className="w-8 h-8" />
                  {property.price_per_night}
                  <span className="text-lg text-gray-500 font-normal">/night</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Check-in</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start" data-testid="check-in-btn">
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

                <div className="space-y-2">
                  <Label>Check-out</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start" data-testid="check-out-btn">
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

                {calculateNights() > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>${property.price_per_night} x {calculateNights()} nights</span>
                      <span>${totalPrice}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-bold">
                      <span>Total</span>
                      <span data-testid="total-price">${totalPrice}</span>
                    </div>
                  </div>
                )}

                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => setShowBookingDialog(true)}
                  disabled={!checkIn || !checkOut}
                  data-testid="book-now-btn"
                >
                  Book Now
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Booking Confirmation Dialog */}
      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent data-testid="booking-dialog">
          <DialogHeader>
            <DialogTitle>Confirm Your Booking</DialogTitle>
            <DialogDescription>
              Please review your booking details before confirming.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="font-medium">{property.name}</p>
              <p className="text-sm text-gray-600">{property.location}</p>
            </div>
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between">
                <span>Check-in:</span>
                <span className="font-medium">{checkIn && format(checkIn, 'PP')}</span>
              </div>
              <div className="flex justify-between">
                <span>Check-out:</span>
                <span className="font-medium">{checkOut && format(checkOut, 'PP')}</span>
              </div>
              <div className="flex justify-between">
                <span>Nights:</span>
                <span className="font-medium">{calculateNights()}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span className="text-blue-600">${totalPrice}</span>
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                💳 <strong>Mock Payment:</strong> This is a demo. No real payment will be processed.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBookingDialog(false)} data-testid="cancel-booking-btn">
              Cancel
            </Button>
            <Button onClick={handleBooking} data-testid="confirm-booking-btn">Confirm Booking</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent data-testid="review-dialog">
          <DialogHeader>
            <DialogTitle>Write a Review</DialogTitle>
            <DialogDescription>
              Share your experience with this property.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rating</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="focus:outline-none"
                    data-testid={`rating-star-${star}`}
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Comment</Label>
              <Textarea
                placeholder="Tell us about your stay..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                data-testid="review-comment-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)} data-testid="cancel-review-btn">
              Cancel
            </Button>
            <Button onClick={handleReview} disabled={!comment.trim()} data-testid="submit-review-btn">
              Submit Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PropertyDetailsPage;