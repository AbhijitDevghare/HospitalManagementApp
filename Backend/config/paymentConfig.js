const config = require("./env");

// ─── Payment gateway selector ──────────────────────────────────────────────────
// Set PAYMENT_GATEWAY=razorpay or PAYMENT_GATEWAY=stripe in .env

// ════════════════════════════════════════════════════════════════════════════════
// Razorpay configuration
// ════════════════════════════════════════════════════════════════════════════════


const RAZORPAY_KEY_ID="rzp_test_8ul6usPDlPmfnW"
const RAZORPAY_Key_Secret="fsfGYHTa1O8oKxtDXduO4Ig9"

const getRazorpayConfig = () => {
  // if (!config.RAZORPAY_KEY_ID || !config.RAZORPAY_KEY_SECRET) {
  //   throw new Error(
  //     "Razorpay credentials missing. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env"
  //   );
  // }
  // Lazily require so missing the package only throws when actually used
  const Razorpay = require("razorpay");
  return new Razorpay({
    key_id:     RAZORPAY_KEY_ID || config.RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_Key_Secret || config.RAZORPAY_KEY_SECRET,
  });
};

// ════════════════════════════════════════════════════════════════════════════════
// Stripe configuration
// ════════════════════════════════════════════════════════════════════════════════
const getStripeConfig = () => {
  if (!config.STRIPE_SECRET_KEY) {
    throw new Error(
      "Stripe credentials missing. Set STRIPE_SECRET_KEY in .env"
    );
  }
  const Stripe = require("stripe");
  return Stripe(config.STRIPE_SECRET_KEY, {
    apiVersion: "2024-04-10",
  });
};

// ─── Active gateway instance (lazy-initialized) ───────────────────────────────
let _gatewayInstance = null;

const getPaymentGateway = () => {
  if (_gatewayInstance) return _gatewayInstance;

  switch (config.PAYMENT_GATEWAY) {
    case "razorpay":
      _gatewayInstance = getRazorpayConfig();
      break;
    case "stripe":
      _gatewayInstance = getStripeConfig();
      break;
    default:
      throw new Error(
        `Unsupported payment gateway "${config.PAYMENT_GATEWAY}". Use "razorpay" or "stripe".`
      );
  }
  return _gatewayInstance;
};

// ─── Shared payment metadata ──────────────────────────────────────────────────
const paymentConfig = {
  gateway:              config.PAYMENT_GATEWAY,
  currency:             process.env.PAYMENT_CURRENCY      || "INR",
  stripePublishableKey: config.STRIPE_PUBLISHABLE_KEY,
  stripeWebhookSecret:  config.STRIPE_WEBHOOK_SECRET,
  getPaymentGateway,
};

module.exports = paymentConfig;
