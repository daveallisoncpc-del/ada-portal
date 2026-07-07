const jsonHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Amelia-Secret"
};

function pick(...values) {
  return values.find(value => value !== undefined && value !== null && value !== "") || "";
}

function bookingStatus(body, appointment, customFields) {
  const paymentStatus = String(pick(
    customFields.ada_payment_status,
    appointment.paymentStatus,
    appointment.payment_status,
    body.paymentStatus,
    body.payment_status
  )).toLowerCase();
  return ["paid", "succeeded", "complete", "completed"].includes(paymentStatus) ? "Paid - confirmed" : "Pending payment";
}

function normaliseBooking(body) {
  const appointment = body.appointment || body.booking || body.data || body;
  const customer = body.customer || appointment.customer || appointment.customerData || {};
  const customFields = appointment.customFields || appointment.custom_fields || body.customFields || {};
  return {
    source: "Amelia",
    status: bookingStatus(body, appointment, customFields),
    learner_id: pick(customFields.ada_learner_id, body.ada_learner_id, appointment.ada_learner_id),
    learner_name: pick(customFields.ada_learner_name, customer.fullName, customer.name, body.learnerName, body.name),
    email: pick(customFields.ada_learner_email, customer.email, body.email),
    phone: pick(customFields.ada_learner_phone, customer.phone, body.phone),
    instructor: pick(customFields.ada_instructor, appointment.employee, appointment.employeeName, body.instructor),
    vehicle: pick(customFields.ada_vehicle, body.vehicle),
    test_centre: pick(customFields.ada_test_centre, body.testCentre, body.test_centre),
    service: pick(appointment.service, appointment.serviceName, body.service, "Lesson booking"),
    booking_time: pick(appointment.bookingStart, appointment.start, appointment.dateTime, body.dateTime),
    payload: body
  };
}

async function insertBooking(booking) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return { skipped: true, reason: "Supabase service role is not configured." };
  }
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
  return { inserted: true, data: text ? JSON.parse(text) : [] };
}

export default async function handler(request, response) {
  if (request.method === "OPTIONS") return response.status(204).setHeader("Access-Control-Allow-Origin", "*").end();
  Object.entries(jsonHeaders).forEach(([key, value]) => response.setHeader(key, value));
  if (request.method !== "POST") return response.status(405).json({ error: "Use POST." });
  const expectedSecret = process.env.AMELIA_WEBHOOK_SECRET;
  if (expectedSecret && request.headers["x-amelia-secret"] !== expectedSecret) {
    return response.status(401).json({ error: "Invalid Amelia webhook secret." });
  }
  try {
    const booking = normaliseBooking(request.body || {});
    const result = await insertBooking(booking);
    response.status(200).json({ ok: true, booking, result });
  } catch (error) {
    response.status(500).json({ ok: false, error: error.message });
  }
}
