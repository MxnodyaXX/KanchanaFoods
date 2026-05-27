# School Catering Order Management System

A professional web-based system for managing daily food orders from school staff, built with Next.js 14, MongoDB Atlas, and Mongoose.

---

## Features

- **Public Staff Order Page** — Mobile-friendly menu with cart, payment method selection, and real-time wallet balance
- **Admin Dashboard** — Daily order summary, food prep list, WhatsApp share, print, open/close orders
- **Menu Management** — Add/edit/disable items, set daily availability, upload images
- **Staff Management** — Add staff, view wallet & unpaid balances, order history
- **Payments & Wallet** — Record advance payments, cash payments, credit settlements
- **Reports** — Daily/weekly/monthly reports, food popularity, unpaid staff, staff-wise totals

---

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide React
- **Backend**: Next.js API Routes, Node.js
- **Database**: MongoDB Atlas, Mongoose
- **Auth**: NextAuth.js (credentials)
- **Deployment**: Vercel (recommended)

---

## Local Development Setup

### 1. Prerequisites

- Node.js 18+ installed
- MongoDB Atlas account (free tier works)
- Git

### 2. Clone & Install

```bash
cd c:\KanchanaProducts
npm install
```

### 3. Configure Environment Variables

Copy the example env file and fill in your values:

```bash
copy .env.local.example .env.local
```

Edit `.env.local`:

```env
# Get this from MongoDB Atlas → Connect → Connect your application
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/school-catering?retryWrites=true&w=majority

# Generate a random secret: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
NEXTAUTH_SECRET=your-generated-secret-here

# This must match your local URL exactly
NEXTAUTH_URL=http://localhost:3000

# Admin login credentials
ADMIN_EMAIL=admin@school.com
ADMIN_PASSWORD=Admin@123456
```

### 4. MongoDB Atlas Setup

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free cluster (M0)
3. Create a database user with read/write access
4. Allow network access from anywhere (0.0.0.0/0) or your IP
5. Get the connection string: Cluster → Connect → Connect your application → Copy URI
6. Replace `<username>` and `<password>` in the URI

### 5. Seed Sample Data (Optional but Recommended)

```bash
npx ts-node --project tsconfig.json scripts/seed.ts
```

This creates:
- 12 sample staff members with various wallet/unpaid balances
- 10 menu items (rice, noodles, soup, beverages)
- Today's daily order status

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Application Routes

| Route | Description | Access |
|-------|-------------|--------|
| `/` | Home page with navigation | Public |
| `/order` | Staff food order form | Public |
| `/login` | Admin login | Public |
| `/admin` | Admin dashboard | Protected |
| `/admin/menu` | Menu management | Protected |
| `/admin/staff` | Staff management | Protected |
| `/admin/payments` | Payments & wallet | Protected |
| `/admin/reports` | Reports & analytics | Protected |

---

## Default Admin Credentials

```
Email: admin@school.com
Password: Admin@123456
```

**Change these in `.env.local` before going live!**

---

## Business Logic

### When a staff member places an order:

**Cash Payment**
- Order is created with `paymentStatus: Unpaid`
- Admin confirms cash received from the dashboard
- If overpaid → excess goes to wallet balance

**Wallet/Advance Payment**
- If wallet balance ≥ order total → full deduction, marked as `AdvanceUsed`
- If wallet balance < order total → partial wallet deduction, rest is unpaid
- If no wallet balance → falls back to unpaid

**Pay Later**
- Order marked as `Unpaid`
- Staff's `unpaidBalance` is increased

### Admin recording cash payment:
1. Enter cash received amount
2. If exact → order marked Paid
3. If more than total → marked Paid, excess added to wallet
4. If less than total → marked Partial, difference added to unpaid balance

---

## Deployment to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/school-catering.git
git push -u origin main
```

### 2. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project" → Import your GitHub repository
3. Add Environment Variables:
   - `MONGODB_URI` — your Atlas connection string
   - `NEXTAUTH_SECRET` — a long random string
   - `NEXTAUTH_URL` — your Vercel deployment URL (e.g., `https://your-app.vercel.app`)
   - `ADMIN_EMAIL` — admin email
   - `ADMIN_PASSWORD` — admin password
4. Click Deploy

### 3. Update NEXTAUTH_URL

After deployment, update `NEXTAUTH_URL` in Vercel env vars to your actual domain.

---

## Database Collections

| Collection | Purpose |
|------------|---------|
| `staffs` | Staff members with wallet/unpaid balances |
| `menuitems` | Food menu with pricing and availability |
| `orders` | All food orders with payment details |
| `payments` | Payment transaction log |
| `dailystatuses` | Daily order open/close status |

---

## API Endpoints

### Orders
- `GET /api/orders?date=today` — Get today's orders
- `POST /api/orders` — Create new order
- `PATCH /api/orders/:id` — Update order status/payment
- `DELETE /api/orders/:id` — Delete order

### Menu
- `GET /api/menu?available=true&today=true` — Get today's available menu
- `POST /api/menu` — Add menu item
- `PATCH /api/menu/:id` — Update menu item
- `DELETE /api/menu/:id` — Delete menu item

### Staff
- `GET /api/staff?active=true` — Get active staff
- `POST /api/staff` — Add staff member
- `PATCH /api/staff/:id` — Update staff
- `GET /api/staff/:id/history` — Get order & payment history

### Payments
- `GET /api/payments` — Get all transactions
- `POST /api/payments` — Record a payment

### Reports
- `GET /api/reports/daily?period=today` — Daily report
- `GET /api/reports/monthly?period=month` — Monthly report with staff/item breakdown

### Daily Status
- `GET /api/daily-status` — Get today's order status
- `PATCH /api/daily-status` — Open/close orders, update cutoff time

---

## Customization

### Change Order Cutoff Time
In the admin dashboard, the default cutoff is 9:30 AM. You can change this via the daily status API:
```bash
PATCH /api/daily-status
{ "cutoffTime": "10:00" }
```

### Add More Departments
Edit the `DEPARTMENTS` array in `/app/admin/staff/page.tsx`

### Modify Menu Categories  
Edit the `CATEGORIES` array in `/app/admin/menu/page.tsx`

### Change Admin Password
Update `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env.local` (or Vercel env vars)

---

## Troubleshooting

**"Please define the MONGODB_URI environment variable"**
→ Make sure `.env.local` exists and has a valid `MONGODB_URI`

**Orders not showing after placing**
→ Check the cutoff time — if it's passed 9:30 AM, orders may be closed

**Login not working**
→ Ensure `NEXTAUTH_URL` matches exactly where you are accessing the app

**Seed fails**
→ Ensure MongoDB Atlas allows connections from your IP

---

## License

Built for internal school catering management. Customize as needed.
