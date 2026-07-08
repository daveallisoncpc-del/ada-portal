const paidStatuses = ["paid", "succeeded", "complete", "completed"];

function pick(...values) {
  return values.find(value => value !== undefined && value !== null && value !== "") || "";
}

function mapStripePayload(body) {
  const event = body.type ? body : { type: "manual.payment", data: { object: body } };
  const object = event.data?.object || body;
  const metadata = object.metadata || {};
  const paymentStatus = String(pick(object.payment_status, object.status, body.paymentStatus, body.payment_status)).toLowerCase();
  return {
    source: "Stripe",
    status: paidStatuses.includes(paymentStatus) ? "Paid - confirmed" : "Payment received",
    learner_id: pick(metadata.ada_learner_id, metadata.learner_id, object.client_reference_id, body.ada_learner_id, body.learnerId),
    learner_name: pick(metadata.ada_learner_name, metadata.learner_name, object.customer_details?.name, body.learnerName, body.name),
    email: pick(metadata.ada_learner_email, metadata.learner_email, object.customer_details?.email, body.email),
    phone: pick(metadata.ada_learner_phone, metadata.learner_phone, object.customer_details?.phone, body.phone),
    instructor: pick(metadata.ada_instructor, metadata.instructor, body.instructor),
    vehicle: pick(metadata.ada_vehicle, body.vehicle),
    test_centre: pick(metadata.ada_test_centre, body.testCentre, body.test_centre),
    service: pick(metadata.service, body.service, "Lesson booking"),
    booking_time: pick(metadata.booking_time, metadata.appointment_time, body.bookingTime, body.dateTime),
    payload: body
  };
}

async function supabaseRequest(path, options = {}) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return { skipped: true, reason: "Supabase service role is not configured." };
  const result = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const text = await result.text();
  if (!result.ok) throw new Error(text || `Supabase request failed with ${result.status}`);
  return text ? JSON.parse(text) : [];
}

async function confirmBooking(booking) {
  if (booking.status !== "Paid - confirmed") return { ignored: true, reason: "Payment is not complete." };
  if (!booking.learner_id && !booking.email) {
    const rows = await supabaseRequest("booking_requests", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(booking)
    });
    return rows[0] || booking;
  }
  const filters = [];
  if (booking.learner_id) filters.push(`learner_id.eq.${encodeURIComponent(booking.learner_id)}`);
  if (booking.email) filters.push(`email.eq.${encodeURIComponent(booking.email)}`);
  const existing = filters.length ? await supabaseRequest(`booking_requests?select=*&or=(${filters.join(",")})&order=created_at.desc&limit=1`) : [];
  if (existing.skipped) return existing;
  if (Array.isArray(existing) && existing[0]?.id) {
    const rows = await supabaseRequest(`booking_requests?id=eq.${existing[0].id}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        status: "Paid - confirmed",
        source: existing[0].source || booking.source,
        service: booking.service || existing[0].service,
        booking_time: booking.booking_time || existing[0].booking_time,
        payload: { ...(existing[0].payload || {}), payment: booking.payload }
      })
    });
    return rows[0] || booking;
  }
  const rows = await supabaseRequest("booking_requests", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(booking)
  });
  return rows[0] || booking;
}

async function sendNotificationEmail(to, subject, text) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFICATION_FROM_EMAIL;
  if (!apiKey || !from || !to) return { skipped: true };
  const result = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, text })
  });
  if (!result.ok) throw new Error(await result.text());
  return result.json();
}

async function sendNotifications(booking) {
  const adminEmail = process.env.NOTIFICATION_ADMIN_EMAIL;
  const instructorEmail = process.env.NOTIFICATION_INSTRUCTOR_EMAIL;
  const learnerEmail = booking.email;
  const when = booking.booking_time || "the selected Amelia slot";
  const learnerName = booking.learner_name || "Learner";
  const text = `${learnerName}'s lesson is confirmed after payment.\n\nTime: ${when}\nInstructor: ${booking.instructor || "-"}\nVehicle: ${booking.vehicle || "-"}\nTest centre: ${booking.test_centre || "-"}`;
  return Promise.allSettled([
    sendNotificationEmail(learnerEmail, "Lesson booking confirmed", text),
    sendNotificationEmail(instructorEmail, "Learner lesson booking confirmed", text),
    sendNotificationEmail(adminEmail, "Learner lesson booking confirmed", text)
  ]);
}

export default async function handler(request, response) {
  response.setHeader("Content-Type", "application/json");
  if (request.method !== "POST") return response.status(405).json({ error: "Use POST." });
  const expectedSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (expectedSecret && request.headers["x-stripe-secret"] !== expectedSecret) {
    return response.status(401).json({ error: "Invalid Stripe webhook secret." });
  }
  try {
    const booking = mapStripePayload(request.body || {});
    const confirmed = await confirmBooking(booking);
    const notifications = await sendNotifications({ ...booking, ...confirmed });
    response.status(200).json({ ok: true, booking: confirmed, notifications });
  } catch (error) {
    response.status(500).json({ ok: false, error: error.message });
  }
}
