# CarePoint design notes

## Who uses it and what they need

| User | Main task | What the UI prioritises |
|---|---|---|
| Patient (often on a phone) | Find the right doctor and a time that works, then remember it | Search first, visible weekly hours, a date strip that shows non-working days, slots grouped by part of the day, a reference number that is easy to read out |
| Doctor (desktop between consultations) | Know who is next and answer requests quickly | A time-ordered agenda for today with inline actions, pending requests underneath |
| Administrator | Keep the roster correct and answer "what happened to booking X?" | Dense tables, search by reference, live figures, an audit trail |

The three dashboards are deliberately different: the patient overview is built around the next appointment slip, the doctor view around a day agenda, and the admin view around figures and tables.

## Visual language

* **Colour** — warm paper background `#fbfaf7`, navy ink `#14213d`, one teal accent `#0f766e` for actions. Status colours (amber pending, teal confirmed, slate completed, red cancelled/declined) are used only for status. Tokens live in `client/src/index.css` (`@theme`).
* **Type** — Source Serif 4 for headings, evoking a printed hospital card; Public Sans for interface text and forms. Both are self-hosted through Fontsource (SIL Open Font License), so no external font requests.
* **Shape** — 6 px controls, 10 px cards, borders instead of heavy shadows, no gradients except a faint paper tone behind the home hero.
* **Signature element** — the appointment slip (`AppointmentSlip.jsx`): reference in monospace at the top, a dashed "tear-off" divider, the essentials (when, where, fee) in a compact grid.
* **Doctor images** — monogram tiles (`DoctorAvatar.jsx`) instead of stock photos: no licensing questions, nothing to break, and no implication that fictional doctors are real people.

## Interaction rules

* Every destructive action (cancel, decline, deactivate) goes through `ConfirmationDialog`; doctor/admin cancellations and declines require a reason the patient will see.
* Unavailable slots and non-working days stay visible but disabled, with an accessible label explaining why.
* Errors say what happened and what to do ("This time was just booked by someone else. Refresh the available times and pick another slot.").
* Loading uses skeletons shaped like the content; empty states explain what will appear there.
* Motion is limited to colour transitions and spinners and is disabled under `prefers-reduced-motion`.
* Focus is always visible (amber outline); dialogs are native `<dialog>` elements with Escape support; form errors are linked with `aria-describedby`.

## Mobile

Directory filters fold behind a button so results appear first; dashboard section navigation becomes a horizontal tab row; the date strip scrolls horizontally with snap points; tables scroll inside their card rather than the page.
