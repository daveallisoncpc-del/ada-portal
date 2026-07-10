export default function handler(request, response) {
  response.status(200).json({
    supabaseUrl: process.env.SUPABASE_URL || "",
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
    ameliaBookingUrl: process.env.AMELIA_BOOKING_URL || "https://allisondriveracademy.com/enquiry/",
    approvedLearnerBookingUrl: process.env.AMELIA_APPROVED_BOOKING_URL || "https://allisondriveracademy.com/book-an-instructor/",
    paymentRedirectUrl: process.env.PAYMENT_REDIRECT_URL || "/api/payment-link"
  });
}
