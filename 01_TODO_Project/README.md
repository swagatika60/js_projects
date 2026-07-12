# TaskFlow — To-Do project

A structured to-do app built with vanilla HTML, CSS, and JavaScript.

## Features

- Add and delete todos
- Mark todos as complete
- Search / filter todos
- **Save data** — auto-save to `localStorage`, manual **Save now**, **Export/Import** JSON backup
- **Reminders** — optional date/time per task; browser notifications when due
- **Separate blocks** — Overdue, Today, Upcoming, and No-reminder sections
- Clear all completed todos
- Active task counter

## Run locally

Open `index.html` in a browser, or use a local server:

```bash
npx serve .
```

## Layout

- **Sidebar** — stats, save/export, notifications
- **Reminder blocks** — Overdue · Today · Upcoming (grid)
- **General tasks** — tasks without reminders

## Tech

- HTML, CSS (design tokens, no framework)
- JavaScript (no build step)
- Google Fonts (DM Sans)