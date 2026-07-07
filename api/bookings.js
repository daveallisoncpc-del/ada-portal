export default async function handler(request, response) {
  response.setHeader("Content-Type", "application/json");
  if (request.method !== "GET") return response.status(405).json({ error: "Use GET." });
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return response.status(200).json({ bookings: [], note: "Supabase service role is not configured." });
  }
  try {
    const result = await fetch(`${supabaseUrl}/rest/v1/booking_requests?select=*&order=created_at.desc&limit=100`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`
      }
    });
    const text = await result.text();
    if (!result.ok) throw new Error(text || `Supabase read failed with ${result.status}`);
    const rows = text ? JSON.parse(text) : [];
    response.status(200).json({
      bookings: rows.map(row => ({
        id: row.id,
        createdAt: row.created_at,
        learnerId: row.learner_id,
        learnerName: row.learner_name,
        email: row.email,
        phone: row.phone,
        instructor: row.instructor,
        vehicle: row.vehicle,
        testCentre: row.test_centre,
        service: row.service,
        bookingTime: row.booking_time,
        status: row.status,
        source: row.source
      }))
    });
  } catch (error) {
    response.status(500).json({ bookings: [], error: error.message });
  }
}
