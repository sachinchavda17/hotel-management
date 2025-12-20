# Hotel/Property Booking System 🏨

A full-stack hotel booking system with JWT authentication, property management, booking system, reviews, and mock payment processing.

## Features ✨

### User Features
- **Authentication**: JWT-based registration and login system
- **Browse Properties**: View all available hotels and resorts
- **Search & Filter**: Filter by location and price range
- **Property Details**: View comprehensive property information, images, and amenities
- **Booking System**: 
  - Select check-in and check-out dates
  - Real-time availability checking
  - Automatic price calculation
  - Mock payment processing
- **User Dashboard**: View and manage your bookings
- **Reviews & Ratings**: Leave reviews for properties you've booked
- **Email Notifications**: Receive booking confirmations and cancellation emails (logged to console)

### Admin Features
- **Property Management**: 
  - Add new properties
  - Edit existing properties
  - Delete properties
- **View All Bookings**: Monitor all bookings across all properties
- **Dashboard Analytics**: View total properties, bookings, and revenue

## Tech Stack 🛠️

### Backend
- **FastAPI**: Modern Python web framework
- **MongoDB**: NoSQL database with Motor (async driver)
- **JWT**: Token-based authentication
- **Passlib**: Password hashing with bcrypt
- **Pydantic**: Data validation
- **CORS**: Cross-origin resource sharing enabled

### Frontend
- **React 19**: Modern React with hooks
- **React Router**: Client-side routing
- **Axios**: HTTP client
- **Shadcn UI**: Beautiful component library
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library
- **Sonner**: Toast notifications
- **date-fns**: Date manipulation
- **React Day Picker**: Date selection

## Installation & Setup 🚀

### Prerequisites
- Python 3.11+
- Node.js 18+
- MongoDB
- Yarn package manager

### Backend Setup

1. Navigate to backend directory:
```bash
cd /app/backend
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment variables in `.env`:
```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="test_database"
CORS_ORIGINS="*"
JWT_SECRET_KEY="your-secret-key-change-in-production"
```

4. Start the backend:
```bash
sudo supervisorctl restart backend
```

Backend will run on: `http://localhost:8001`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd /app/frontend
```

2. Install dependencies:
```bash
yarn install
```

3. Configure environment variables in `.env`:
```env
REACT_APP_BACKEND_URL=https://your-backend-url.com
WDS_SOCKET_PORT=443
ENABLE_HEALTH_CHECK=false
```

4. Start the frontend:
```bash
sudo supervisorctl restart frontend
```

Frontend will run on: `http://localhost:3000`

## API Documentation 📚

### Authentication

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

### Properties

#### Get All Properties (with filters)
```http
GET /api/properties?location=Miami&min_price=100&max_price=500
```

#### Get Property by ID
```http
GET /api/properties/{property_id}
```

#### Create Property (Admin only)
```http
POST /api/properties
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Luxury Resort",
  "description": "Beautiful resort with amazing views",
  "location": "Miami, FL",
  "price_per_night": 350,
  "amenities": ["WiFi", "Pool", "Spa"],
  "images": ["https://example.com/image1.jpg"]
}
```

#### Update Property (Admin only)
```http
PUT /api/properties/{property_id}
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Updated Resort Name",
  "price_per_night": 400
}
```

#### Delete Property (Admin only)
```http
DELETE /api/properties/{property_id}
Authorization: Bearer <admin_token>
```

### Bookings

#### Create Booking
```http
POST /api/bookings
Authorization: Bearer <token>
Content-Type: application/json

{
  "property_id": "property-uuid",
  "check_in": "2024-01-01T00:00:00Z",
  "check_out": "2024-01-05T00:00:00Z"
}
```

#### Get My Bookings
```http
GET /api/bookings/my
Authorization: Bearer <token>
```

#### Get All Bookings (Admin only)
```http
GET /api/bookings/all
Authorization: Bearer <admin_token>
```

#### Cancel Booking
```http
PUT /api/bookings/{booking_id}/cancel
Authorization: Bearer <token>
```

#### Check Availability
```http
GET /api/bookings/property/{property_id}/availability?check_in=2024-01-01T00:00:00Z&check_out=2024-01-05T00:00:00Z
```

### Reviews

#### Create Review
```http
POST /api/reviews
Authorization: Bearer <token>
Content-Type: application/json

{
  "property_id": "property-uuid",
  "rating": 5,
  "comment": "Amazing stay! Highly recommended."
}
```

#### Get Property Reviews
```http
GET /api/reviews/property/{property_id}
```

### Payment

#### Mock Payment Processing
```http
POST /api/payment/mock
Content-Type: application/json

{
  "booking_id": "booking-uuid",
  "amount": 1400,
  "card_number": "4111111111111111"
}
```

## Database Schema 💾

### Users Collection
```javascript
{
  id: String (UUID),
  name: String,
  email: String (unique),
  password_hash: String,
  role: String (user|admin),
  created_at: DateTime
}
```

### Properties Collection
```javascript
{
  id: String (UUID),
  name: String,
  description: String,
  location: String,
  price_per_night: Float,
  amenities: Array<String>,
  images: Array<String>,
  owner_id: String,
  rating: Float,
  review_count: Integer,
  created_at: DateTime
}
```

### Bookings Collection
```javascript
{
  id: String (UUID),
  user_id: String,
  property_id: String,
  property_name: String,
  check_in: DateTime,
  check_out: DateTime,
  total_price: Float,
  status: String (confirmed|cancelled),
  created_at: DateTime
}
```

### Reviews Collection
```javascript
{
  id: String (UUID),
  user_id: String,
  user_name: String,
  property_id: String,
  rating: Integer (1-5),
  comment: String,
  created_at: DateTime
}
```

## Demo Credentials 🔑

### Admin Account
- **Email**: admin@hotel.com
- **Password**: admin123
- **Role**: Admin (can manage properties and view all bookings)

### Create Your Own User
Register through the UI at `/register` to create a regular user account.

## Features in Detail 📖

### Authentication System
- Secure JWT-based authentication
- Password hashing with bcrypt
- Token expiration (7 days)
- Role-based access control (User/Admin)

### Booking System
- Real-time availability checking
- Automatic price calculation based on nights
- Prevents overlapping bookings
- Email notifications (console logging)
- Booking cancellation

### Review System
- Users can only review properties they've booked
- One review per property per user
- Automatic rating aggregation for properties
- Reviews displayed on property details page

### Admin Dashboard
- Property CRUD operations
- View all bookings across system
- Revenue analytics
- Property statistics

## Project Structure 📁

```
/app/
├── backend/
│   ├── server.py           # Main FastAPI application
│   ├── requirements.txt    # Python dependencies
│   └── .env               # Backend environment variables
├── frontend/
│   ├── src/
│   │   ├── App.js         # Main React component with routing
│   │   ├── pages/         # All page components
│   │   │   ├── LoginPage.js
│   │   │   ├── RegisterPage.js
│   │   │   ├── HomePage.js
│   │   │   ├── PropertyDetailsPage.js
│   │   │   ├── UserDashboard.js
│   │   │   └── AdminDashboard.js
│   │   └── components/    # Reusable UI components
│   ├── package.json       # Node dependencies
│   └── .env              # Frontend environment variables
└── README.md             # This file
```

## Testing 🧪

### Test Backend APIs
```bash
# Health check
curl http://localhost:8001/api/

# Register user
curl -X POST http://localhost:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User", "email": "test@test.com", "password": "test123"}'

# Login
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@test.com", "password": "test123"}'

# Get properties
curl http://localhost:8001/api/properties
```

## Troubleshooting 🔧

### Backend Issues
```bash
# Check backend logs
tail -f /var/log/supervisor/backend.err.log

# Restart backend
sudo supervisorctl restart backend
```

### Frontend Issues
```bash
# Check frontend logs
tail -f /var/log/supervisor/frontend.err.log

# Restart frontend
sudo supervisorctl restart frontend

# Reinstall dependencies
cd /app/frontend && yarn install
```

### Database Issues
```bash
# Check MongoDB status
sudo supervisorctl status mongodb

# Connect to MongoDB
mongosh mongodb://localhost:27017/test_database
```

## Future Enhancements 🚀

- [ ] Real payment integration (Stripe/PayPal)
- [ ] Email service with actual SMTP
- [ ] Image upload functionality
- [ ] Advanced search filters (amenities, dates, guests)
- [ ] Map integration for property locations
- [ ] Multi-language support
- [ ] Mobile app version
- [ ] Social media login integration
- [ ] Wishlist/favorites feature
- [ ] Property comparison tool
- [ ] Loyalty program
- [ ] Push notifications

## License 📄

This project is built for demonstration purposes.

## Support 💬

For issues and questions, please check the logs or contact the development team.

---

Built with ❤️ using FastAPI and React
