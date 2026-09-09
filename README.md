# CampusEvents — College Event Management & Ticketing System

A reusable, full-featured **frontend** for managing college fests, symposiums, workshops and competitions — built with React so it can be re-used every year instead of building a new site for each event.

> **Status:** Frontend-only. Uses `localStorage` + mock data. No backend, no database. Built to be plugged into a future **Node.js + Express.js + SQL** API without rewriting the UI.

---

## 1. Project Overview

CampusEvents lets **Guests** browse events, **Students/Participants** register and get digital QR tickets, and **Admins** create/manage events, verify payments, check participants in, and review reports — all from one platform.

## 2. Features

- Guest browsing, search & filter (no account needed)
- Student registration/login and Admin registration/login (separate roles, role locked at signup)
- Event creation with Draft/Publish/Suspend/Resume/Cancel lifecycle
- Free / Online (mocked) / Offline payment flows
- Automatic unique Ticket ID + QR code generation on confirmed registration
- Admin manual Ticket ID check-in with duplicate/invalid/refunded detection
- Refund request → Admin approve/reject workflow with ticket invalidation
- Admin dashboard, participant dashboard, and full reports page
- Fully responsive (desktop/tablet/mobile), **zero images** — pure CSS/typography/icons UI
- Data persists across refresh via `localStorage`

## 3. Technologies

React 18 · Vite · JavaScript (JSX) · React Router v6 · React Hooks (`useState`, `useEffect`, `useContext`, `useNavigate`, `useParams`, `useMemo`, `useCallback`) · CSS · `qrcode.react` (lightweight QR rendering, no images) · `localStorage`

No TypeScript, no Angular/Vue/Next.js, no Flask/Python, no UI frameworks.

## 4. Folder Structure

```
src/
├── components/     Reusable UI: Navbar, Footer, Sidebar, EventCard, TicketCard,
│                   StatusBadge, Modal, ConfirmDialog, ProtectedRoute, EventForm...
├── pages/          Public pages (Home, Events, EventDetails, Login, Register, NotFound)
│   ├── participant/  Dashboard, Registrations, Tickets, Payment, Refund, Profile
│   └── admin/        Dashboard, ManageEvents, Add/EditEvent, Registrations,
│                      Payments, Refunds, CheckIn, Reports, Profile
├── context/        AuthContext, EventContext, RegistrationContext, ToastContext
├── data/           initialData.js (seed data), seed.js (first-run seeder)
├── services/       authService, eventService, registrationService, paymentService,
│                   ticketService, refundService, reportService — the swappable layer
├── utils/          storage.js (centralized localStorage), ticketUtils.js, validation.js
├── App.jsx, main.jsx, index.css
```

## 5. How to Install

```bash
npm install
```

## 6. How to Run

```bash
npm run dev
```

Then open the printed local URL (typically `http://localhost:5173`).

Build for production preview:

```bash
npm run build
npm run preview
```

## 7. Demo Credentials

| Role        | Email               | Password    |
|-------------|----------------------|-------------|
| Admin       | admin@gmail.com      | admin123    |
| Participant | student@gmail.com    | student123  |

These are seeded automatically into `localStorage` on first launch. You can also register new accounts from the app.

## 8. Application Workflow

```
Guest → Login/Register → Student OR Admin → Role-based Dashboard
```

**Participant:** Browse/Search/Filter Events → Event Details → Register Now → (Login if guest) →
Select Payment (Free/Online/Offline) → Payment Confirmation → Ticket + QR generated →
My Tickets → Event Day Check-in by Admin → Attendance updated.

**Refund:** My Registrations → Request Refund → Reason → Pending → Admin Approves/Rejects →
Approved: registration cancelled, ticket invalidated, seat released, reports updated.
Rejected: reason stored and viewable by the participant.

**Admin:** Create Event (Draft/Publish) → Manage lifecycle (Suspend/Resume/Cancel) →
Verify offline payments → Approve/reject refunds → Check-in participants → View reports.

## 9. User Roles

- **Guest** — not a stored role, just "not logged in." Can browse/search but not register/pay.
- **Student / Participant** — registers, pays, gets tickets, requests refunds.
- **Admin** — creates/manages events, verifies payments, handles refunds, check-in, reports.

Role is chosen at registration and **cannot be changed** afterward. Admin self-registration is enabled for this college project only — see `authService.js` for a note on how to convert it to an invitation/approval flow later.

## 10. React Hooks Used

- `useState` — forms, filters, modals, toggles everywhere
- `useEffect` — loading data from services on mount (contexts), guest/auth redirects
- `useContext` — `AuthContext`, `EventContext`, `RegistrationContext`, `ToastContext` consumed via custom hooks (`useAuth`, `useEvents`, `useRegistrations`, `useToast`)
- `useNavigate` — programmatic redirects after login, registration, payment, refund actions
- `useParams` — `EventDetails`, `EditEvent`, `TicketDetails`, `Payment`, `RefundRequest`, etc.
- `useMemo` — filtering/sorting events, registrations, computing report aggregates
- `useCallback` — all context action functions (`login`, `registerForEvent`, `checkIn`, etc.) to keep stable references

## 11. localStorage Structure

Centralized in `src/utils/storage.js`. Keys used:

```
ems_users            All registered users (participants + admins)
ems_events           All events and their lifecycle status
ems_registrations    All registrations (registrationId, status, paymentStatus, ticketId...)
ems_payments         Payment records (mode, status, amount)
ems_tickets          Generated tickets (ticketId, QR value, status, checkedIn)
ems_refunds          Refund requests and their approve/reject outcome
ems_current_user     The currently logged-in user (session)
ems_seeded           Flag so seed data is only inserted once
```

No component calls `localStorage` directly — everything goes through `storage.js` and the `services/` layer.

## 12. Service Layer

Each domain has its own service file (`authService.js`, `eventService.js`, `registrationService.js`, `paymentService.js`, `ticketService.js`, `refundService.js`, `reportService.js`). Contexts call these services; **components never touch storage or business logic directly.**

## 13. Future Node.js + Express Integration

To connect the real backend later, only the **inside** of each service function needs to change — for example:

```js
// Today (eventService.js)
export function getAllEvents() {
  return getCollection(KEYS.EVENTS);
}

// Later
export function getAllEvents() {
  return fetch('http://localhost:5000/api/events').then(res => res.json());
}
```

Because components only import from `services/` (via `context/`), **no UI file needs to change** — `EventCard.jsx`, `Events.jsx`, `EventDetails.jsx`, etc. stay exactly as they are.

Planned backend: **Node.js + Express.js REST API**, not Flask/Python.

## 14. Future SQL Database Integration

Suggested tables mirror the current localStorage collections 1:1:

`users`, `events`, `registrations`, `payments`, `tickets`, `refunds`

Field names used throughout the frontend (e.g. `registrationId`, `eventId`, `paymentStatus`, `ticketId`, `checkedIn`) were chosen to map directly onto SQL columns, minimizing friction when the backend and schema are introduced.
