# Rewa FRST Run Club — Web Application

Mobile-first community web application for **Rewa FRST Run Club** in Rewa, Madhya Pradesh, India. Built with React 19, Vite, Tailwind CSS, React Router, Firebase Authentication (Google Sign-In), and Cloud Firestore, with an automatic `localStorage` fallback seeded with 12 runners, 60 runs, and 3 events.

## 1. Live GPS Run Recording & Background Note
- The **Record** tab (`/record`) uses `navigator.geolocation.watchPosition` (`enableHighAccuracy: true`) and the Haversine formula to measure live distance in kilometers.
- **Important Note on Phone Lock & Backgrounding**: Because this is a mobile web application running inside a browser tab, **GPS tracking can pause or stop if the phone screen locks or if the browser goes to the background**. We request the Screen Wake Lock API (`navigator.wakeLock.request('screen')`) while recording and auto-save progress to `localStorage` every 10 seconds, but runners should keep the browser open and on-screen while recording a run.
- GPS points with accuracy worse than `25 m` or sudden jumps faster than `8 m/s` are automatically ignored.
- No route coordinates or live locations are ever stored or shared with other users.
- Finished GPS runs and manual run entries are saved with `status: "pending"` and do not count toward the leaderboard until an admin approves them. Runs faster than `3:00 min/km` or longer than `25 km` are automatically flagged for admin review.

## 2. Pages & Navigation
1. `/` — **Home**: Club group photo banner (`/public/club-photo.jpg`), intro, next run details, registration button, and club stats.
2. `/runs` & `/runs/:id` — **Runs**: Upcoming and past Sunday runs with full event details and registration links.
3. `/record` — **Record**: Live GPS tracker (`Ready`, `Running`, and `Summary` states) plus manual run submission (`status: "pending"`).
4. `/board` & `/runner/:uid` — **Board**: Monthly and all-time leaderboards (counting approved runs only), runner profiles, and monthly + milestone rewards.
5. `/profile` & `/login` — **Profile**: Runner stats, run history, profile editor, and embedded **Admin tools** (Approve/Reject pending runs, log runs, manage events, mark rewards claimed, update registration links).
6. `/dev` — **Developer Tools**: Hidden utility page to switch between Demo Runner, Demo Admin, and Guest views.

## 3. Firebase Setup & How to Make a User an Admin
1. Firebase configuration is loaded from `firebase-applet-config.json` (or `VITE_FIREBASE_*` environment variables).
2. To promote a runner to Admin:
   - Have the user sign in once with Google so their document is created at `/users/{uid}`.
   - Open **Firebase Console > Firestore Database > Data**, locate `/users/{uid}`, and change `role` from `"runner"` to `"admin"`.
   - For local/preview testing, visit `/dev` to switch to the Demo Admin account.
