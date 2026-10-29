(function () {
  const config = window.LTS_CONFIG || {};
  const appointmentLink = document.getElementById("google-appointment-link");
  const bookingNote = document.getElementById("booking-setup-note");
  const form = document.getElementById("contact-form");
  const statusEl = document.getElementById("contact-status");
  const submitBtn = document.getElementById("contact-submit");

  const bookingReadyNote = document.getElementById("booking-ready-note");
  const header = document.querySelector(".logo-header");
  const appointmentUrl = (config.googleAppointmentUrl || "").trim();

  // Keep linked sections from hiding under the sticky header.
  function updateHeaderOffset() {
    const isSticky = header && window.getComputedStyle(header).position === "sticky";
    const offset = isSticky ? header.offsetHeight : 0;
    document.documentElement.style.setProperty("--header-offset", offset + "px");
  }
  updateHeaderOffset();
  window.addEventListener("resize", updateHeaderOffset);

  // Book buttons: until a Google appointment link is set in config.js, they
  // go to the booking section, and the booking section's main button goes to
  // the contact form. Once the link is set, they all open the calendar.
  function openInNewTab(link) {
    link.href = appointmentUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    if (!link.querySelector(".visually-hidden")) {
      const note = document.createElement("span");
      note.className = "visually-hidden";
      note.textContent = " (opens in a new tab)";
      link.appendChild(note);
    }
  }

  if (appointmentUrl) {
    document.querySelectorAll("[data-book-link]").forEach(openInNewTab);
    if (appointmentLink) {
      appointmentLink.textContent = "See open times";
      appointmentLink.dataset.placeholder = "false";
      openInNewTab(appointmentLink);
    }
    if (bookingNote) bookingNote.hidden = true;
    if (bookingReadyNote) bookingReadyNote.hidden = false;
  }

  // Links to the contact form: optionally pre-pick the type of help, then put
  // the cursor in the first box so people can start typing right away.
  document.querySelectorAll('a[href="#contact"]').forEach(function (link) {
    link.addEventListener("click", function () {
      if (!form) return;
      const visitType = link.getAttribute("data-visit-type");
      if (visitType && form.visitType) {
        form.visitType.value = visitType;
      }
      window.setTimeout(function () {
        if (form.name) form.name.focus({ preventScroll: true });
      }, 0);
    });
  });

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
        "Opening your email app with your message filled in. Just press Send. You can also call 917-579-2367."
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
