(function () {
  const config = window.LTS_CONFIG || {};
  const appointmentLink = document.getElementById("google-appointment-link");
  const bookingNote = document.getElementById("booking-setup-note");
  const form = document.getElementById("contact-form");
  const statusEl = document.getElementById("contact-status");
  const submitBtn = document.getElementById("contact-submit");

  if (appointmentLink && config.googleAppointmentUrl) {
    appointmentLink.href = config.googleAppointmentUrl;
    appointmentLink.target = "_blank";
    appointmentLink.rel = "noopener noreferrer";
    appointmentLink.dataset.placeholder = "false";
    if (bookingNote) {
      bookingNote.hidden = true;
    }
  }

  function setStatus(message, type) {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = "contact-status" + (type ? " " + type : "");
  }

  function buildMailto(payload) {
    const subject = encodeURIComponent("Lords Tech Support inquiry");
    const body = encodeURIComponent(
      [
        "Name: " + payload.name,
        "Phone: " + payload.phone,
        "Email: " + payload.email,
        "Visit type: " + payload.visitType,
        "Preferred time: " + (payload.preferredTime || "(not provided)"),
        "",
        payload.message,
      ].join("\n")
    );
    return "mailto:dkleo@me.com?subject=" + subject + "&body=" + body;
  }

  if (!form) return;

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    setStatus("");

    const honeypot = (form.company && form.company.value) || "";
    if (honeypot) {
      setStatus("Thanks — your message was sent.", "success");
      form.reset();
      return;
    }

    const payload = {
      name: (form.name.value || "").trim(),
      phone: (form.phone.value || "").trim(),
      email: (form.email.value || "").trim(),
      visitType: form.visitType.value || "",
      message: (form.message.value || "").trim(),
      preferredTime: (form.preferredTime.value || "").trim(),
    };

    if (!payload.name || !payload.phone || !payload.email || !payload.visitType || !payload.message) {
      setStatus("Please fill in all required fields.", "error");
      return;
    }

    const functionUrl = (config.contactFunctionUrl || "").trim();

    if (!functionUrl) {
      setStatus(
        "Opening your email app so we still get your message. You can also call 917-579-2367.",
        "error"
      );
      window.location.href = buildMailto(payload);
      return;
    }

    submitBtn.disabled = true;
    setStatus("Sending your message…");

    try {
      const response = await fetch(functionUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(function () {
        return {};
      });

      if (!response.ok) {
        throw new Error(data.error || "Could not send message.");
      }

      setStatus(
        "Thank you! Your message was saved and emailed to us. We’ll be in touch soon.",
        "success"
      );
      form.reset();
    } catch (err) {
      setStatus(
        "We couldn’t reach the server. Opening your email app as a backup — or call 917-579-2367.",
        "error"
      );
      window.location.href = buildMailto(payload);
    } finally {
      submitBtn.disabled = false;
    }
  });
})();
