import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { API, useAuth } from '../App';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';

const PaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('checking'); // checking, success, failed
  const [paymentData, setPaymentData] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      setStatus('failed');
      return;
    }

    pollPaymentStatus();
  }, [sessionId]);

  const pollPaymentStatus = async (attempts = 0) => {
    const maxAttempts = 10;
    const pollInterval = 2000; // 2 seconds

    if (attempts >= maxAttempts) {
      setStatus('failed');
      return;
    }

    try {
      const response = await axios.get(`${API}/payment/checkout/status/${sessionId}`);
      const data = response.data;
      setPaymentData(data);

      if (data.payment_status === 'paid') {
        setStatus('success');
      } else if (data.status === 'expired') {
        setStatus('failed');
      } else {
        // Still pending, continue polling
        setTimeout(() => pollPaymentStatus(attempts + 1), pollInterval);
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      if (attempts < maxAttempts - 1) {
        setTimeout(() => pollPaymentStatus(attempts + 1), pollInterval);
      } else {
        setStatus('failed');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full" data-testid="payment-status-card">
        <CardHeader>
          <CardTitle className="text-center">
            {status === 'checking' && 'Processing Payment...'}
            {status === 'success' && 'Payment Successful!'}
            {status === 'failed' && 'Payment Failed'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {status === 'checking' && (
            <div className="text-center space-y-4">
              <Loader2 className="w-16 h-16 animate-spin mx-auto text-blue-600" />
              <p className="text-gray-600">Please wait while we confirm your payment...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center space-y-4">
              <CheckCircle className="w-16 h-16 mx-auto text-green-600" data-testid="payment-success-icon" />
              <div>
                <p className="text-lg font-medium text-gray-900">Your booking has been confirmed!</p>
                <p className="text-sm text-gray-600 mt-2">
                  A confirmation email has been sent to your registered email address.
                </p>
              </div>
              {paymentData && (
                <div className="bg-gray-50 p-4 rounded-lg text-left">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount Paid:</span>
                      <span className="font-medium">
                        ${(paymentData.amount_total / 100).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className="font-medium text-green-600">Paid</span>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <Button
                  onClick={() => navigate('/dashboard')}
                  className="flex-1"
                  data-testid="view-bookings-btn"
                >
                  View My Bookings
                </Button>
                <Button
                  onClick={() => navigate('/')}
                  variant="outline"
                  className="flex-1"
                  data-testid="browse-properties-btn"
                >
                  Browse Properties
                </Button>
              </div>
            </div>
          )}

          {status === 'failed' && (
            <div className="text-center space-y-4">
              <XCircle className="w-16 h-16 mx-auto text-red-600" data-testid="payment-failed-icon" />
              <div>
                <p className="text-lg font-medium text-gray-900">Payment could not be processed</p>
                <p className="text-sm text-gray-600 mt-2">
                  Your booking has not been confirmed. Please try again.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => navigate('/')}
                  className="flex-1"
                  data-testid="back-home-btn"
                >
                  Back to Home
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccessPage;
