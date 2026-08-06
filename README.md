# Lords Tech Support Firebase Site

One-page website for LordsTechSupport.com: booking, rates, and contact — hosted on Firebase.

## What’s included

- Public rates ($75/hour) and Comfort Membership (“contact for monthly pricing”)
- Booking section ready for a **Google Appointment Schedule** link
- Contact form → **Cloud Function** saves to **Firestore** (`contacts`) and emails **dkleo@me.com**
- Phone CTA: **917-579-2367**
- Portland Metropolitan Area · remote or in-home

## One-time setup

### 1. Firebase login & Blaze plan

Cloud Functions (for email) require the **Blaze (pay-as-you-go)** plan.

```bash
npm install -g firebase-tools
firebase login
firebase use lordstechsupport
```

Enable **Firestore** in the [Firebase Console](https://console.firebase.google.com/project/lordstechsupport/firestore).

### 2. Install function dependencies

```bash
cd functions
npm install
cd ..
```

### 3. Configure email (iCloud / me.com)

`dkleo@me.com` uses iCloud SMTP. Create an [Apple app-specific password](https://appleid.apple.com/account/manage), then:

```bash
cd functions
copy .env.example .env
```

Edit `functions/.env` and set `SMTP_PASS` to your app-specific password (no quotes).  
`functions/.env` is gitignored — do not commit it.

| Param | Default |
|-------|---------|
| `SMTP_HOST` | `smtp.mail.me.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `dkleo@me.com` |
| `EMAIL_TO` | `dkleo@me.com` |
| `SMTP_PASS` | *(required in `.env`)* |

**Note:** We use `functions/.env` instead of `firebase functions:secrets:set` so you don’t need the Secret Manager API enabled.

### 4. Deploy backend, then wire the site

```bash
firebase deploy --only firestore,functions
```

Copy the printed URL for `submitContact` (looks like):

`https://us-west1-lordstechsupport.cloudfunctions.net/submitContact`

Edit `public/config.js`:

```js
window.LTS_CONFIG = {
  googleAppointmentUrl: "https://calendar.google.com/calendar/appointments/...",
  contactFunctionUrl: "https://us-west1-lordstechsupport.cloudfunctions.net/submitContact",
};
```

### 5. Google Appointment Schedule

1. Google Calendar → **Create** → **Appointment schedule**
2. Offer remote and/or in-home slots for Portland metro
3. Copy the sharing link into `googleAppointmentUrl` in `public/config.js`

### 6. Deploy hosting

```bash
firebase deploy --only hosting
```

Or everything:

```bash
npm run deploy
```

## Contact data

Each submission is stored in Firestore:

**Collection:** `contacts`

| Field | Description |
|-------|-------------|
| `name`, `phone`, `email` | Contact info |
| `visitType` / `visitTypeLabel` | remote, in-home, membership, other |
| `message` | Inquiry text |
| `preferredTime` | Optional |
| `createdAt` | Server timestamp |
| `emailSent` | Whether notify email succeeded |

View in Firebase Console → Firestore. Rules block all public client access; only the Admin SDK (Cloud Function) writes.

If email fails but Firestore write succeeds, the form still returns success and the row is kept (`emailSent: false`).

## Local notes

- Until `contactFunctionUrl` is set, the form falls back to opening a prefilled **mailto:** to `dkleo@me.com`.
- Until `googleAppointmentUrl` is set, Book links point visitors to the contact form.
