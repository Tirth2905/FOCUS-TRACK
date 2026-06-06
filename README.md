#CHROME EXTENSION FOR PRODUCTIVITY MANAGEMENT

COMPANY: CODTECH IT SOLUTIONS

NAME: SAVANI TIRTH NILESHBHAI

INTERN ID: CTIS9902

DOMAIN: MERN STACK WEB DEVELOPMENT

DURATION: 4 WEEEKS

MENTOR: NEELA SANTOSH

DISCRIPTION:-
FocusTrack — Productivity Tracker Chrome Extension
In an age of endless notifications, social media feeds, and browser rabbit holes, staying focused has become one of the hardest challenges for developers, students, and professionals alike. FocusTrack is a full-stack productivity tracking solution built as a Chrome extension with a MERN backend, designed to give users complete visibility into how they spend their time online — and the tools to take back control of it.

What is FocusTrack?
FocusTrack is a Manifest V3 Chrome extension that silently runs in the background and monitors the time you spend on every website you visit. It categorizes your browsing by domain, visualizes your daily and weekly patterns, lets you block distracting websites instantly, and syncs all your data to a personal MongoDB database through a secure Express REST API. The entire system works offline by default — your data is always stored locally in Chrome — and the backend layer adds optional cloud sync so your productivity data follows you across devices.

Core Features
The extension's Dashboard tab gives you a live view of today's browsing broken down by website, with proportional bars showing exactly where your time is going. Every second you spend on a tab is tracked automatically with no manual input required. The moment you switch tabs or windows, the timer updates and the data is saved.
The Block tab puts you in control. You can type any domain to block it instantly, or use the one-click Quick Presets to block the most common distractions — Twitter, Reddit, YouTube, Instagram, Facebook, and TikTok. When you try to visit a blocked site, the extension intercepts the navigation and shows a clean, minimal blocked page reminding you to stay focused. Unblocking is just as easy — one click removes any site from the list.
The Report tab shows a 7-day bar chart of your total browsing time per day, along with a ranked list of your most visited sites for the week. You can export your entire history as a CSV file for use in spreadsheets or as a JSON file for custom analysis. This makes FocusTrack useful not just as a blocker, but as a genuine data tool for understanding your own habits.
The Account tab connects the extension to the MERN backend. Users can register and log in with email and password, and then sync their tracking data to MongoDB with a single click. This means your productivity history is backed up, persistent, and accessible from any device where you install the extension and sign in.

Technical Architecture
The Chrome extension is built with Manifest V3, using a background service worker for persistent tab tracking across all windows. A content script handles visibility change events, and the popup interface is built with vanilla HTML, CSS, and JavaScript for maximum performance with zero framework overhead. Data is stored locally using the Chrome Storage API before being optionally pushed to the backend.
The backend is a Node.js and Express REST API with MongoDB as the database via Mongoose ODM. Authentication is handled using JSON Web Tokens with bcrypt password hashing. The API exposes 14 endpoints covering authentication, time tracking sync, report generation, and user preferences management. CORS is configured to allow requests from the extension, and all routes are protected with a JWT middleware layer.
The database schema is designed for efficiency — tracking records are stored per user per day with compound indexes for fast lookups, and bulk write operations are used for syncing multiple days at once. Reports are generated server-side by aggregating site-level data across date ranges, returning totals, percentages, and ranked lists.

Tech Stack
MongoDB, Express.js, Node.js, Chrome Extension Manifest V3, Vanilla JavaScript, HTML5, CSS3, JSON Web Tokens, bcryptjs, Mongoose, Chrome Storage API, Chrome Alarms API, Chrome Notifications API.

Use Cases
FocusTrack is built for anyone who wants honest data about their online habits — developers tracking how much time goes into actual coding versus browsing, students managing study sessions, remote workers trying to minimize distraction, or anyone doing a digital detox. It requires no subscription, no third-party service, and no data ever leaves your own machine unless you choose to sync it.


OUTPUT:-
<img width="1894" height="911" alt="Image" src="https://github.com/user-attachments/assets/8ee21616-3ea7-4f80-bf20-955c41fcb129" />
<img width="1916" height="1013" alt="Image" src="https://github.com/user-attachments/assets/3f0244cd-6731-4f48-9d16-bff93a943c17" />
