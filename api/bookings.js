function pick(...values) {
  return values.find(value => value !== undefined && value !== null && value !== "") || "";
}

function mapRow(row) {
  return {
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
  };
}

function normaliseLearnerBooking(body) {
  const paymentStatus = String(pick(body.paymentStatus, body.payment_status)).toLowerCase();
  const status = ["paid", "succeeded", "complete", "completed"].includes(paymentStatus) ? "Paid - confirmed" : pick(body.status, "Pending payment");
  return {
    source: pick(body.source, "Learner portal"),
    status,
    learner_id: pick(body.learnerId, body.learner_id),
    learner_name: pick(body.learnerName, body.name, body.learner_name),
    email: pick(body.email),
    phone: pick(body.phone),
    instructor: pick(body.instructor),
    vehicle: pick(body.vehicle),
    test_centre: pick(body.testCentre, body.test_centre),
    service: pick(body.service, "Lesson booking"),
    booking_time: pick(body.bookingTime, body.dateTime),
    payload: body
  };
}

export default async function handler(request, response) {
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (request.method === "OPTIONS") return response.status(204).end();
  if (!["GET", "POST"].includes(request.method)) return response.status(405).json({ error: "Use GET or POST." });
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return response.status(200).json({ bookings: [], note: "Supabase service role is not configured." });
  }
  try {
    if (request.method === "POST") {
      const booking = normaliseLearnerBooking(request.body || {});
      const result = await fetch(`${supabaseUrl}/rest/v1/booking_requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          Prefer: "return=representation"
        },
        body: JSON.stringify(booking)
      });
      const text = await result.text();
      if (!result.ok) throw new Error(text || `Supabase insert failed with ${result.status}`);
      const rows = text ? JSON.parse(text) : [];
      return response.status(200).json({ ok: true, booking: rows[0] ? mapRow(rows[0]) : null });
    }
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
      bookings: rows.map(mapRow)
    });
  } catch (error) {
    response.status(500).json({ bookings: [], error: error.message });
  }
}
