export default function PaymentCard({ event, children }) {
  return (
    <div className="card">
      <h3 className="mb-16">Order Summary</h3>
      <div className="payment-summary">
        <span>Event</span>
        <span>{event.name}</span>
      </div>
      <div className="payment-summary">
        <span>Payment Mode</span>
        <span>{event.paymentMode}</span>
      </div>
      <div className="payment-summary payment-total">
        <span>Amount Payable</span>
        <span>{event.paymentMode === 'Free' ? 'FREE' : `₹${event.price}`}</span>
      </div>
      {children}
    </div>
  );
}
