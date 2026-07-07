export default function handler(request, response) {
  response.status(200).json({
    supabaseUrl: process.env.SUPABASE_URL || "",
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
    ameliaBookingUrl: process.env.AMELIA_BOOKING_URL || "https://allisondriveracademy.com/enquiry/"
  });
}
