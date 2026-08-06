const { onRequest } = require("firebase-functions/v2/https");
const { defineString } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const nodemailer = require("nodemailer");

initializeApp();

// Set these in functions/.env (gitignored). Avoids Secret Manager API.
const smtpHost = defineString("SMTP_HOST", { default: "smtp.mail.me.com" });
const smtpPort = defineString("SMTP_PORT", { default: "587" });
const smtpUser = defineString("SMTP_USER", { default: "dkleo@me.com" });
const emailTo = defineString("EMAIL_TO", { default: "dkleo@me.com" });
const smtpPass = defineString("SMTP_PASS");

const VISIT_LABELS = {
  remote: "Remote help",
  "in-home": "In-home visit (Portland metro)",
  membership: "Comfort Membership info",
  other: "Something else",
};

function clean(value, max) {
  return String(value || "")
    .trim()
    .slice(0, max);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

exports.submitContact = onRequest(
  {
    region: "us-west1",
    cors: true,
    maxInstances: 5,
  },
  async (req, res) => {
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const body = req.body || {};
    // Honeypot from bots that ignore frontend filtering
    if (body.company) {
      res.status(200).json({ ok: true });
      return;
    }

    const name = clean(body.name, 120);
    const phone = clean(body.phone, 40);
    const email = clean(body.email, 200);
    const visitType = clean(body.visitType, 40);
    const message = clean(body.message, 4000);
    const preferredTime = clean(body.preferredTime, 200);

    if (!name || !phone || !email || !visitType || !message) {
      res.status(400).json({ error: "Please fill in all required fields." });
      return;
    }

    if (!isValidEmail(email)) {
      res.status(400).json({ error: "Please enter a valid email address." });
      return;
    }

    if (!VISIT_LABELS[visitType]) {
      res.status(400).json({ error: "Invalid visit type." });
      return;
    }

    const record = {
      name,
      phone,
      email,
      visitType,
      visitTypeLabel: VISIT_LABELS[visitType],
      message,
      preferredTime: preferredTime || null,
      source: "website",
      createdAt: FieldValue.serverTimestamp(),
      userAgent: clean(req.get("user-agent"), 300) || null,
    };

    const db = getFirestore();
    const docRef = await db.collection("contacts").add(record);

    let emailSent = false;
    let emailError = null;

    try {
      const pass = smtpPass.value();
      if (!pass) {
        throw new Error("SMTP_PASS secret is not set");
      }

      const transporter = nodemailer.createTransport({
        host: smtpHost.value(),
        port: Number(smtpPort.value()) || 587,
        secure: false,
        auth: {
          user: smtpUser.value(),
          pass,
        },
      });

      const visitLabel = VISIT_LABELS[visitType];
      const text = [
        "New contact form submission from LordsTechSupport.com",
        "",
        "Name: " + name,
        "Phone: " + phone,
        "Email: " + email,
        "Visit type: " + visitLabel,
        "Preferred time: " + (preferredTime || "(not provided)"),
        "",
        "Message:",
        message,
        "",
        "Firestore doc: contacts/" + docRef.id,
      ].join("\n");

      await transporter.sendMail({
        from: '"Lords Tech Support Website" <' + smtpUser.value() + ">",
        to: emailTo.value(),
        replyTo: email,
        subject: "New inquiry: " + name + " (" + visitLabel + ")",
        text,
      });
      emailSent = true;
    } catch (err) {
      emailError = err && err.message ? err.message : "Email send failed";
      console.error("Contact email failed", err);
      await docRef.set(
        {
          emailSent: false,
          emailError,
        },
        { merge: true }
      );
    }

    if (emailSent) {
      await docRef.set({ emailSent: true }, { merge: true });
    }

    // Submission is stored even if email fails; operator can read Firestore.
    res.status(200).json({
      ok: true,
      id: docRef.id,
      emailSent,
    });
  }
);
