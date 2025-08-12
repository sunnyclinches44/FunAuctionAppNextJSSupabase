# 🏷️ Auction App

A simple real-time auction platform built with **Next.js** and **Supabase**.  
Designed for scenarios where a single **admin** creates an auction session and others join via a **link or QR code** without logging in.

---

## 📌 Features

- **Admin Login** via Supabase Email Magic Link
- **Session Creation**: Only logged-in admin can create sessions
- **Public Join**: Anyone can join via shared session code or QR link (no login required)
- **Real-time Bidding**: Instant updates for all participants
- **Session Sharing**: QR code & link for quick join
- **Supabase Database** integration for session and bid tracking

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router)
- **Backend**: Supabase (Auth, Database, Realtime)
- **Styling**: TailwindCSS
- **Deployment**: Vercel

---

## 🚀 Getting Started

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
