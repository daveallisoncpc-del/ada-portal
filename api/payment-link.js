function addParam(url, key, value) {
  if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
}

export default function handler(request, response) {
  if (request.method !== "GET") return response.status(405).json({ error: "Use GET." });
  const paymentBase = process.env.STRIPE_HIDDEN_PAYMENT_URL || process.env.STRIPE_PAYMENT_LINK_URL || "https://buy.stripe.com/bJedR8bg57ICaKrbb2enS00";
  if (!paymentBase) return response.status(200).json({ error: "Stripe hidden payment link is not configured." });
  const host = request.headers["x-forwarded-host"] || request.headers.host;
  const currentUrl = new URL(request.url || "/api/payment-link", `https://${host}`);
  const paymentUrl = new URL(paymentBase);
  currentUrl.searchParams.forEach((value, key) => addParam(paymentUrl, key, value));
  addParam(paymentUrl, "client_reference_id", currentUrl.searchParams.get("ada_learner_id"));
  response.writeHead(302, { Location: paymentUrl.toString() });
  response.end();
}
