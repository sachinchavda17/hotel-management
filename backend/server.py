from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
import aiosmtplib
from email.message import EmailMessage
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# SMTP Configuration
SMTP_HOST = os.environ.get("SMTP_HOST", "sandbox.smtp.mailtrap.io")
SMTP_PORT = int(os.environ.get("SMTP_PORT", 2525))
SMTP_USER = os.environ.get("SMTP_USER", "test_user")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "test_password")
SMTP_FROM_EMAIL = os.environ.get("SMTP_FROM_EMAIL", "noreply@hotelbooking.com")
SMTP_FROM_NAME = os.environ.get("SMTP_FROM_NAME", "Hotel Booking System")

# Stripe Configuration
STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY", "sk_test_emergent")

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security
security = HTTPBearer()

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============= MODELS =============

class UserRole:
    USER = "user"
    ADMIN = "admin"

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: EmailStr
    password_hash: str
    role: str = UserRole.USER
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    created_at: datetime

class Property(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    location: str
    price_per_night: float
    amenities: List[str] = []
    images: List[str] = []
    owner_id: str
    rating: float = 0.0
    review_count: int = 0
    max_guests: int = 2
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PropertyCreate(BaseModel):
    name: str
    description: str
    location: str
    price_per_night: float
    amenities: List[str] = []
    images: List[str] = []
    max_guests: int = 2

class PropertyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    price_per_night: Optional[float] = None
    amenities: Optional[List[str]] = None
    images: Optional[List[str]] = None
    max_guests: Optional[int] = None

class Booking(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    property_id: str
    property_name: str
    check_in: datetime
    check_out: datetime
    total_price: float
    status: str = "pending"  # pending, confirmed, cancelled
    payment_status: str = "pending"  # pending, paid, failed
    stripe_session_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BookingCreate(BaseModel):
    property_id: str
    check_in: str  # ISO format date
    check_out: str  # ISO format date

class Review(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    property_id: str
    rating: int = Field(ge=1, le=5)
    comment: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ReviewCreate(BaseModel):
    property_id: str
    rating: int = Field(ge=1, le=5)
    comment: str

class PaymentTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: str
    user_id: str
    session_id: str
    amount: float
    currency: str
    payment_status: str  # pending, paid, failed, expired
    metadata: Dict[str, str] = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StripeCheckoutRequest(BaseModel):
    booking_id: str
    origin_url: str

# ============= UTILITY FUNCTIONS =============

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_admin_user(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

async def send_email(to_email: str, subject: str, body: str):
    """Real SMTP email sending"""
    try:
        message = EmailMessage()
        message["From"] = f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>"
        message["To"] = to_email
        message["Subject"] = subject
        message.set_content(body)
        
        await aiosmtplib.send(
            message,
            hostname=SMTP_HOST,
            port=SMTP_PORT,
            username=SMTP_USER,
            password=SMTP_PASSWORD,
            start_tls=False
        )
        logger.info(f"Email sent successfully to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        # Don't raise exception - email failure shouldn't break the flow
        # But log it for debugging
        logger.info(f"""
        ========= EMAIL SENT (TEST MODE) =========
        To: {to_email}
        Subject: {subject}
        Body: {body}
        =========================================
        """)

# ============= AUTH ROUTES =============

@api_router.post("/auth/register", response_model=UserResponse)
async def register(user_data: UserRegister):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user = User(
        name=user_data.name,
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        role=UserRole.USER
    )
    
    user_dict = user.model_dump()
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    
    await db.users.insert_one(user_dict)
    
    # Send welcome email
    await send_email(
        user.email,
        "Welcome to Hotel Booking System!",
        f"Hi {user.name},\n\nWelcome to our Hotel Booking System! Your account has been created successfully.\n\nYou can now browse and book amazing properties worldwide.\n\nBest regards,\nHotel Booking Team"
    )
    
    return UserResponse(**user.model_dump())

@api_router.post("/auth/login")
async def login(login_data: UserLogin):
    user = await db.users.find_one({"email": login_data.email}, {"_id": 0})
    
    if not user or not verify_password(login_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    access_token = create_access_token(data={"sub": user["id"]})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse(**user)
    }

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(**current_user)

# ============= PROPERTY ROUTES WITH ADVANCED FILTERS =============

@api_router.get("/properties", response_model=List[Property])
async def get_properties(
    location: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    amenities: Optional[str] = None,  # Comma-separated amenities
    min_rating: Optional[float] = None,
    guests: Optional[int] = None,
    check_in: Optional[str] = None,
    check_out: Optional[str] = None,
    sort_by: Optional[str] = "created_at",  # price_asc, price_desc, rating, created_at
):
    query = {}
    
    # Location filter
    if location:
        query["location"] = {"$regex": location, "$options": "i"}
    
    # Price filter
    if min_price is not None or max_price is not None:
        query["price_per_night"] = {}
        if min_price is not None:
            query["price_per_night"]["$gte"] = min_price
        if max_price is not None:
            query["price_per_night"]["$lte"] = max_price
    
    # Amenities filter
    if amenities:
        amenity_list = [a.strip() for a in amenities.split(",")]
        query["amenities"] = {"$all": amenity_list}
    
    # Rating filter
    if min_rating is not None:
        query["rating"] = {"$gte": min_rating}
    
    # Guests filter
    if guests is not None:
        query["max_guests"] = {"$gte": guests}
    
    # Date availability filter
    available_property_ids = None
    if check_in and check_out:
        try:
            check_in_dt = datetime.fromisoformat(check_in.replace('Z', '+00:00'))
            check_out_dt = datetime.fromisoformat(check_out.replace('Z', '+00:00'))
            
            # Find all bookings that overlap with requested dates
            overlapping_bookings = await db.bookings.find({
                "status": "confirmed",
                "$or": [
                    {"check_in": {"$lt": check_out_dt.isoformat()}, "check_out": {"$gt": check_in_dt.isoformat()}}
                ]
            }, {"property_id": 1}).to_list(1000)
            
            booked_property_ids = [b["property_id"] for b in overlapping_bookings]
            
            # Exclude booked properties
            if booked_property_ids:
                query["id"] = {"$nin": booked_property_ids}
        except Exception as e:
            logger.error(f"Error filtering by dates: {str(e)}")
    
    # Determine sort order
    sort_field = "created_at"
    sort_direction = -1  # descending by default
    
    if sort_by == "price_asc":
        sort_field = "price_per_night"
        sort_direction = 1
    elif sort_by == "price_desc":
        sort_field = "price_per_night"
        sort_direction = -1
    elif sort_by == "rating":
        sort_field = "rating"
        sort_direction = -1
    
    properties = await db.properties.find(query, {"_id": 0}).sort(sort_field, sort_direction).to_list(100)
    
    for prop in properties:
        if isinstance(prop.get('created_at'), str):
            prop['created_at'] = datetime.fromisoformat(prop['created_at'])
    
    return properties

@api_router.get("/properties/{property_id}", response_model=Property)
async def get_property(property_id: str):
    prop = await db.properties.find_one({"id": property_id}, {"_id": 0})
    
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    
    if isinstance(prop.get('created_at'), str):
        prop['created_at'] = datetime.fromisoformat(prop['created_at'])
    
    return Property(**prop)

@api_router.post("/properties", response_model=Property)
async def create_property(
    property_data: PropertyCreate,
    current_user: dict = Depends(get_admin_user)
):
    prop = Property(
        **property_data.model_dump(),
        owner_id=current_user["id"]
    )
    
    prop_dict = prop.model_dump()
    prop_dict['created_at'] = prop_dict['created_at'].isoformat()
    
    await db.properties.insert_one(prop_dict)
    
    return prop

@api_router.put("/properties/{property_id}", response_model=Property)
async def update_property(
    property_id: str,
    property_data: PropertyUpdate,
    current_user: dict = Depends(get_admin_user)
):
    prop = await db.properties.find_one({"id": property_id}, {"_id": 0})
    
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    
    update_data = {k: v for k, v in property_data.model_dump().items() if v is not None}
    
    if update_data:
        await db.properties.update_one({"id": property_id}, {"$set": update_data})
    
    updated_prop = await db.properties.find_one({"id": property_id}, {"_id": 0})
    
    if isinstance(updated_prop.get('created_at'), str):
        updated_prop['created_at'] = datetime.fromisoformat(updated_prop['created_at'])
    
    return Property(**updated_prop)

@api_router.delete("/properties/{property_id}")
async def delete_property(
    property_id: str,
    current_user: dict = Depends(get_admin_user)
):
    result = await db.properties.delete_one({"id": property_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Property not found")
    
    return {"message": "Property deleted successfully"}

# ============= BOOKING ROUTES =============

@api_router.post("/bookings", response_model=Booking)
async def create_booking(
    booking_data: BookingCreate,
    current_user: dict = Depends(get_current_user)
):
    # Get property
    prop = await db.properties.find_one({"id": booking_data.property_id}, {"_id": 0})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Parse dates
    check_in = datetime.fromisoformat(booking_data.check_in.replace('Z', '+00:00'))
    check_out = datetime.fromisoformat(booking_data.check_out.replace('Z', '+00:00'))
    
    # Calculate nights and total price
    nights = (check_out - check_in).days
    if nights <= 0:
        raise HTTPException(status_code=400, detail="Check-out must be after check-in")
    
    total_price = nights * prop["price_per_night"]
    
    # Check availability (no overlapping bookings)
    overlapping = await db.bookings.find_one({
        "property_id": booking_data.property_id,
        "status": "confirmed",
        "$or": [
            {"check_in": {"$lt": check_out.isoformat()}, "check_out": {"$gt": check_in.isoformat()}}
        ]
    })
    
    if overlapping:
        raise HTTPException(status_code=400, detail="Property not available for selected dates")
    
    # Create booking with pending status
    booking = Booking(
        user_id=current_user["id"],
        property_id=booking_data.property_id,
        property_name=prop["name"],
        check_in=check_in,
        check_out=check_out,
        total_price=total_price,
        status="pending",
        payment_status="pending"
    )
    
    booking_dict = booking.model_dump()
    booking_dict['check_in'] = booking_dict['check_in'].isoformat()
    booking_dict['check_out'] = booking_dict['check_out'].isoformat()
    booking_dict['created_at'] = booking_dict['created_at'].isoformat()
    
    await db.bookings.insert_one(booking_dict)
    
    return booking

@api_router.get("/bookings/my", response_model=List[Booking])
async def get_my_bookings(current_user: dict = Depends(get_current_user)):
    bookings = await db.bookings.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(100)
    
    for booking in bookings:
        for field in ['check_in', 'check_out', 'created_at']:
            if isinstance(booking.get(field), str):
                booking[field] = datetime.fromisoformat(booking[field])
    
    return bookings

@api_router.get("/bookings/all", response_model=List[Booking])
async def get_all_bookings(current_user: dict = Depends(get_admin_user)):
    bookings = await db.bookings.find({}, {"_id": 0}).to_list(1000)
    
    for booking in bookings:
        for field in ['check_in', 'check_out', 'created_at']:
            if isinstance(booking.get(field), str):
                booking[field] = datetime.fromisoformat(booking[field])
    
    return bookings

@api_router.put("/bookings/{booking_id}/cancel")
async def cancel_booking(
    booking_id: str,
    current_user: dict = Depends(get_current_user)
):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking["user_id"] != current_user["id"] and current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this booking")
    
    await db.bookings.update_one({"id": booking_id}, {"$set": {"status": "cancelled"}})
    
    # Send cancellation email
    await send_email(
        current_user["email"],
        "Booking Cancelled",
        f"""Hi {current_user['name']},

Your booking has been cancelled.

Booking ID: {booking_id}
Property: {booking['property_name']}

If you have any questions, please contact us.

Best regards,
Hotel Booking Team"""
    )
    
    return {"message": "Booking cancelled successfully"}

@api_router.get("/bookings/property/{property_id}/availability")
async def check_availability(property_id: str, check_in: str, check_out: str):
    check_in_dt = datetime.fromisoformat(check_in.replace('Z', '+00:00'))
    check_out_dt = datetime.fromisoformat(check_out.replace('Z', '+00:00'))
    
    overlapping = await db.bookings.find_one({
        "property_id": property_id,
        "status": "confirmed",
        "$or": [
            {"check_in": {"$lt": check_out_dt.isoformat()}, "check_out": {"$gt": check_in_dt.isoformat()}}
        ]
    })
    
    return {"available": overlapping is None}

# ============= STRIPE PAYMENT ROUTES =============

@api_router.post("/payment/checkout/session")
async def create_stripe_checkout_session(
    request_data: StripeCheckoutRequest,
    current_user: dict = Depends(get_current_user),
    request: Request = None
):
    # Get booking
    booking = await db.bookings.find_one({"id": request_data.booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if booking["payment_status"] == "paid":
        raise HTTPException(status_code=400, detail="Booking already paid")
    
    # Initialize Stripe checkout
    origin_url = request_data.origin_url
    webhook_url = f"{origin_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    # Create checkout session
    success_url = f"{origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin_url}/property/{booking['property_id']}"
    
    checkout_request = CheckoutSessionRequest(
        amount=float(booking["total_price"]),
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "booking_id": request_data.booking_id,
            "user_id": current_user["id"],
            "property_id": booking["property_id"]
        },
        payment_methods=["card"]  # Adding UPI support through card payments
    )
    
    session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction record
    transaction = PaymentTransaction(
        booking_id=request_data.booking_id,
        user_id=current_user["id"],
        session_id=session.session_id,
        amount=float(booking["total_price"]),
        currency="usd",
        payment_status="pending",
        metadata=checkout_request.metadata
    )
    
    transaction_dict = transaction.model_dump()
    transaction_dict['created_at'] = transaction_dict['created_at'].isoformat()
    transaction_dict['updated_at'] = transaction_dict['updated_at'].isoformat()
    
    await db.payment_transactions.insert_one(transaction_dict)
    
    # Update booking with session ID
    await db.bookings.update_one(
        {"id": request_data.booking_id},
        {"$set": {"stripe_session_id": session.session_id}}
    )
    
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/payment/checkout/status/{session_id}")
async def get_checkout_status(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    # Get payment transaction
    transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not transaction:
        raise HTTPException(status_code=404, detail="Payment transaction not found")
    
    if transaction["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # If already processed, return cached status
    if transaction["payment_status"] in ["paid", "failed", "expired"]:
        return {
            "status": transaction["payment_status"],
            "payment_status": transaction["payment_status"],
            "amount_total": int(transaction["amount"] * 100),
            "currency": transaction["currency"],
            "metadata": transaction["metadata"]
        }
    
    # Initialize Stripe checkout
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
    
    # Get status from Stripe
    try:
        checkout_status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
        
        # Update transaction status
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {
                "payment_status": checkout_status.payment_status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # If payment is successful and not already confirmed, update booking
        if checkout_status.payment_status == "paid":
            booking_id = transaction["metadata"]["booking_id"]
            booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
            
            if booking and booking["status"] != "confirmed":
                # Update booking status
                await db.bookings.update_one(
                    {"id": booking_id},
                    {"$set": {
                        "status": "confirmed",
                        "payment_status": "paid"
                    }}
                )
                
                # Send confirmation email
                user = await db.users.find_one({"id": transaction["user_id"]}, {"_id": 0})
                if user:
                    check_in = datetime.fromisoformat(booking['check_in'])
                    check_out = datetime.fromisoformat(booking['check_out'])
                    
                    await send_email(
                        user["email"],
                        "Booking Confirmed - Payment Successful",
                        f"""Hi {user['name']},

Your payment has been processed successfully and your booking is confirmed!

Booking Details:
- Property: {booking['property_name']}
- Check-in: {check_in.strftime('%Y-%m-%d')}
- Check-out: {check_out.strftime('%Y-%m-%d')}
- Total Price: ${booking['total_price']:.2f}

Thank you for booking with us!

Best regards,
Hotel Booking Team"""
                    )
        
        return {
            "status": checkout_status.status,
            "payment_status": checkout_status.payment_status,
            "amount_total": checkout_status.amount_total,
            "currency": checkout_status.currency,
            "metadata": checkout_status.metadata
        }
    except Exception as e:
        logger.error(f"Error checking payment status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to check payment status: {str(e)}")

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks"""
    try:
        body = await request.body()
        signature = request.headers.get("Stripe-Signature")
        
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        # Update payment transaction and booking based on webhook event
        if webhook_response.event_type in ["checkout.session.completed", "payment_intent.succeeded"]:
            session_id = webhook_response.session_id
            
            transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
            if transaction and transaction["payment_status"] != "paid":
                # Update transaction
                await db.payment_transactions.update_one(
                    {"session_id": session_id},
                    {"$set": {
                        "payment_status": webhook_response.payment_status,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                # Update booking
                booking_id = transaction["metadata"]["booking_id"]
                await db.bookings.update_one(
                    {"id": booking_id},
                    {"$set": {
                        "status": "confirmed",
                        "payment_status": "paid"
                    }}
                )
        
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# ============= REVIEW ROUTES =============

@api_router.post("/reviews", response_model=Review)
async def create_review(
    review_data: ReviewCreate,
    current_user: dict = Depends(get_current_user)
):
    # Check if user has a confirmed booking for this property
    booking = await db.bookings.find_one({
        "user_id": current_user["id"],
        "property_id": review_data.property_id,
        "status": "confirmed"
    })
    
    if not booking:
        raise HTTPException(status_code=400, detail="You must book this property before reviewing")
    
    # Check if user already reviewed this property
    existing_review = await db.reviews.find_one({
        "user_id": current_user["id"],
        "property_id": review_data.property_id
    })
    
    if existing_review:
        raise HTTPException(status_code=400, detail="You have already reviewed this property")
    
    review = Review(
        user_id=current_user["id"],
        user_name=current_user["name"],
        property_id=review_data.property_id,
        rating=review_data.rating,
        comment=review_data.comment
    )
    
    review_dict = review.model_dump()
    review_dict['created_at'] = review_dict['created_at'].isoformat()
    
    await db.reviews.insert_one(review_dict)
    
    # Update property rating
    reviews = await db.reviews.find({"property_id": review_data.property_id}, {"_id": 0}).to_list(1000)
    avg_rating = sum(r["rating"] for r in reviews) / len(reviews)
    
    await db.properties.update_one(
        {"id": review_data.property_id},
        {"$set": {"rating": round(avg_rating, 1), "review_count": len(reviews)}}
    )
    
    return review

@api_router.get("/reviews/property/{property_id}", response_model=List[Review])
async def get_property_reviews(property_id: str):
    reviews = await db.reviews.find({"property_id": property_id}, {"_id": 0}).to_list(100)
    
    for review in reviews:
        if isinstance(review.get('created_at'), str):
            review['created_at'] = datetime.fromisoformat(review['created_at'])
    
    return reviews

# ============= HEALTH CHECK =============

@api_router.get("/")
async def root():
    return {
        "message": "Hotel Booking System API - Enhanced",
        "version": "2.0.0",
        "features": ["Stripe Payments", "Real Email", "Advanced Search"]
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
