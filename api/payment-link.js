function addParam(url, key, value) {
  if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
}

const paymentLinks = {
  lesson65: "https://buy.stripe.com/cNi5kC1Fvgf87yfbb2enS01",
  lesson80: "https://buy.stripe.com/bJedR8bg57ICaKrbb2enS00"
};

function getAnyParam(params, names) {
  for (const name of names) {
    const value = params.get(name);
    if (value) return value;
  }
  return "";
}

function selectPaymentBase(params) {
  const configuredDefault = process.env.STRIPE_HIDDEN_PAYMENT_URL || process.env.STRIPE_PAYMENT_LINK_URL || paymentLinks.lesson80;
  const configured65 = process.env.STRIPE_65_PAYMENT_LINK_URL || paymentLinks.lesson65;
  const serviceId = getAnyParam(params, ["serviceId", "service_id", "service", "serviceID", "appointmentServiceId", "amelia_service_id"]);
  const serviceName = getAnyParam(params, ["serviceName", "service_name", "appointmentService", "ada_service", "name"]).toLowerCase();
  const duration = getAnyParam(params, ["duration", "serviceDuration", "appointmentDuration"]).toLowerCase();
  const amount = getAnyParam(params, ["amount", "price", "servicePrice", "paymentAmount"]).replace(/[^\d.]/g, "");
  if (["7", "9"].includes(serviceId)) return configured65;
  if (amount && Number(amount) <= 65) return configured65;
  if (duration.includes("1h 30") || duration.includes("90")) return configured65;
  if (serviceName.includes("1h 30") || serviceName.includes("1.5") || serviceName.includes("90")) return configured65;
  return configuredDefault;
}

export default function handler(request, response) {
  if (request.method !== "GET") return response.status(405).json({ error: "Use GET." });
  const host = request.headers["x-forwarded-host"] || request.headers.host;
  const currentUrl = new URL(request.url || "/api/payment-link", `https://${host}`);
  const paymentBase = selectPaymentBase(currentUrl.searchParams);
  if (!paymentBase) return response.status(200).json({ error: "Stripe hidden payment link is not configured." });
  const paymentUrl = new URL(paymentBase);
  currentUrl.searchParams.forEach((value, key) => addParam(paymentUrl, key, value));
  addParam(paymentUrl, "client_reference_id", currentUrl.searchParams.get("ada_learner_id"));
  response.writeHead(302, { Location: paymentUrl.toString() });
  response.end();
}
