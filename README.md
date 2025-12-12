# 🏪 StoreFlow - Multi-Store Management System

A comprehensive point-of-sale and inventory management system designed for multi-store businesses in Thailand. Built with Next.js 16, React 19, Supabase, and TypeScript.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16.0-black)
![React](https://img.shields.io/badge/React-19.2-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e)

---

## ✨ Features

### 👔 For Store Owners

- **📊 Analytics Dashboard** - Real-time sales tracking, profit analysis, and performance metrics
- **🏢 Multi-Store Management** - Centralized control of multiple store locations
- **📦 Product Management** - Create, edit, and track inventory across all stores
- **💰 Purchase Tracking** - Record stock purchases and supplier management
- **📈 Sales Analytics** - Revenue reports, profit margins, and sales trends
- **⚠️ Low Stock Alerts** - Automatic inventory warnings and notifications
- **👥 User Management** - Add owners and receptionists with role-based access
- **🎯 Category Management** - Organize products by categories
- **💼 Store Settings** - Configure store locations, contacts, and details

### 💵 For Receptionists

- **🛒 Point of Sale (POS)** - Fast, intuitive sales processing interface
- **🔍 Product Search** - Quick product lookup with debounced search
- **📱 Store-Specific Access** - See only assigned store's inventory
- **📋 Sales History** - View transaction history for assigned store
- **💳 Payment Methods** - Support for cash, card, and other payment types
- **📊 Real-time Stock Updates** - Instant inventory updates after sales
- **🎨 Optimistic UI** - Fast, responsive interface with immediate feedback

### 🔐 Security & Performance

- **🛡️ Role-Based Access Control** - Strict separation between Owner and Receptionist permissions
- **🏪 Store Isolation** - Receptionists can only access their assigned store
- **🔒 Secure Authentication** - Powered by Supabase Auth with session management
- **⚡ Optimized Performance** - 1-3 second load times (reduced from 6-12 seconds)
- **💾 Smart Caching** - TanStack React Query with 5-minute cache
- **🚀 Singapore Deployment** - Optimized for Thailand/Southeast Asia with minimal latency

---

## 🛠️ Technology Stack

### Frontend

- **Next.js 16** - React framework with App Router
- **React 19** - Latest React with improved performance
- **TypeScript 5** - Type-safe development
- **Tailwind CSS 3.4** - Utility-first CSS framework
- **shadcn/ui** - High-quality UI component library
- **Recharts** - Data visualization and charts

### Backend & Database

- **Supabase** - PostgreSQL database with real-time capabilities
- **Supabase Auth** - Secure authentication and session management
- **Row-Level Security** - Database-level security policies

### State Management & Data Fetching

- **TanStack React Query** - Server state management with caching
- **React Context** - Authentication and global state

### Deployment

- **Vercel** - Edge network deployment (Singapore region)
- **Vercel Edge Functions** - Serverless API endpoints

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier available)
- Vercel account (optional, for deployment)

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/storeflow.git
cd storeflow
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

To get these values:

- Go to [Supabase Dashboard](https://app.supabase.com)
- Select your project
- Go to Settings → API
- Copy the Project URL and anon/public key

4. **Set up the database**

Run the following SQL in Supabase SQL Editor:

```sql
-- Create businesses table (for future multi-tenancy)
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create stores table
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  address TEXT,
  phone TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'receptionist')),
  store_id UUID REFERENCES stores(id),
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT,
  category TEXT,
  buying_price NUMERIC NOT NULL,
  selling_price NUMERIC NOT NULL,
  stock INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 10,
  image_url TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create sales table
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  total_amount NUMERIC NOT NULL,
  profit NUMERIC NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'other')),
  sold_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create sale_items table
CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  price_at_sale NUMERIC NOT NULL,
  cost_at_sale NUMERIC NOT NULL,
  subtotal NUMERIC NOT NULL,
  profit NUMERIC NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create purchases table
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  cost_per_unit NUMERIC NOT NULL,
  total_cost NUMERIC NOT NULL,
  supplier TEXT,
  notes TEXT,
  purchased_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX idx_products_store_id ON products(store_id);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_sales_store_id ON sales(store_id);
CREATE INDEX idx_sales_created_at ON sales(created_at);
CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product_id ON sale_items(product_id);
CREATE INDEX idx_purchases_store_id ON purchases(store_id);
CREATE INDEX idx_purchases_product_id ON purchases(product_id);
```

5. **Create your first owner account**

In Supabase Dashboard:

- Go to Authentication → Users → Add user
- Create an account with your email and password
- Then insert a profile record in the `profiles` table:

```sql
INSERT INTO profiles (id, email, full_name, role, store_id)
VALUES (
  'your-user-id-from-auth',
  'owner@yourcompany.com',
  'Your Name',
  'owner',
  NULL
);
```

6. **Run the development server**

```bash
npm run dev
```

7. **Open your browser**

Navigate to [http://localhost:3000](http://localhost:3000)

---

## 📊 Database Schema

### Tables Overview

```
┌─────────────┐     ┌──────────┐     ┌──────────┐
│  profiles   │────>│  stores  │<────│ products │
└─────────────┘     └──────────┘     └──────────┘
       │                   │               │
       │                   │               │
       │                   v               v
       │            ┌──────────┐    ┌──────────────┐
       └───────────>│  sales   │───>│ sale_items   │
                    └──────────┘    └──────────────┘
                          │
                          v
                    ┌──────────┐
                    │purchases │
                    └──────────┘
```

### Core Tables

**stores** - Store locations

```sql
- id: UUID (Primary Key)
- name: Store name
- location: City/area
- address: Full address
- phone: Contact number
```

**profiles** - User accounts

```sql
- id: UUID (Foreign Key to auth.users)
- email: User email
- full_name: Display name
- role: 'owner' or 'receptionist'
- store_id: NULL for owners, store UUID for receptionists
```

**products** - Product inventory

```sql
- id: UUID (Primary Key)
- store_id: Store reference
- name: Product name
- sku: Stock keeping unit
- category: Product category
- buying_price: Cost price
- selling_price: Retail price
- stock: Current inventory
- low_stock_threshold: Alert threshold
```

**sales** - Sales transactions

```sql
- id: UUID (Primary Key)
- store_id: Store reference
- total_amount: Sale total
- profit: Profit amount
- payment_method: cash/card/other
- sold_by: User reference
- created_at: Transaction timestamp
```

**sale_items** - Individual items in sales

```sql
- id: UUID (Primary Key)
- sale_id: Sale reference
- product_id: Product reference
- quantity: Items sold
- price_at_sale: Selling price at time of sale
- subtotal: Line item total
- profit: Line item profit
```

**purchases** - Inventory purchases

```sql
- id: UUID (Primary Key)
- store_id: Store reference
- product_id: Product reference
- quantity: Units purchased
- cost_per_unit: Cost per item
- total_cost: Total purchase cost
- supplier: Supplier name
```

---

## 👥 User Roles & Permissions

### Owner (Full Access)

**Permissions:**

- ✅ View all stores and data
- ✅ Create, edit, delete products
- ✅ Record sales and purchases
- ✅ View analytics dashboard
- ✅ Manage stores
- ✅ Create and manage users
- ✅ Access settings

**Database:**

```sql
role: 'owner'
store_id: NULL  -- Can access all stores
```

**Example:**

```
Owner: mario@business.com
├─ Store 1: Bangkok (can access)
├─ Store 2: Phuket (can access)
└─ Store 3: Chiang Mai (can access)
```

### Receptionist (Store-Specific)

**Permissions:**

- ✅ View assigned store only
- ✅ Create, edit products for assigned store
- ✅ Record sales for assigned store
- ✅ View sales history for assigned store
- ❌ Cannot access other stores
- ❌ Cannot view analytics dashboard
- ❌ Cannot manage stores
- ❌ Cannot manage users

**Database:**

```sql
role: 'receptionist'
store_id: 'store-uuid'  -- Locked to specific store
```

**Example:**

```
Receptionist: rec1@company.com
├─ Store 1: Bangkok (assigned, can access)
├─ Store 2: Phuket (CANNOT access)
└─ Store 3: Chiang Mai (CANNOT access)
```

---

## 🎯 Key Features in Detail

### 📊 Analytics Dashboard (Owners Only)

**Real-time Metrics:**

- Today's sales and profit
- Period sales (7 days / 30 days / This month)
- Total orders and average order value
- Items in stock and low stock alerts

**Visual Analytics:**

- Peak sales hours chart (hourly breakdown)
- Top 5 products by revenue
- Top 5 categories by sales
- Payment methods distribution
- Low stock items list

**Smart Filtering:**

- Filter by time period
- Store-specific analytics
- Category breakdowns
- Profit margin analysis

### 🛒 Point of Sale (POS)

**Fast Sales Processing:**

- Search products by name, SKU, or category
- Add items to cart with quantity control
- Real-time stock validation
- Multiple payment methods (cash, card, other)
- Optimistic UI updates (instant feedback)
- Automatic inventory deduction

**Cart Management:**

- Increase/decrease quantities
- Remove items
- View subtotals and profit margins
- Payment method selection
- One-click checkout

**Receipt Details:**

- Transaction ID
- Date and time
- Items purchased with quantities
- Unit prices and subtotals
- Total amount and profit
- Payment method

### 📦 Product Management

**Product Features:**

- Create products with detailed information
- SKU tracking
- Category organization
- Buy/sell price management
- Stock levels and thresholds
- Low stock alerts
- Myanmar language support

**Bulk Operations:**

- Filter by store
- Search across multiple fields
- Sort by various criteria
- Export to CSV (coming soon)

**Inventory Tracking:**

- Real-time stock updates
- Low stock warnings
- Purchase history
- Stock movement tracking

### 💰 Purchase Tracking (Owners Only)

**Record Purchases:**

- Link to specific products
- Record supplier information
- Track cost per unit
- Add notes and details
- Automatic stock updates

**Purchase Analytics:**

- Total spent tracking
- Items purchased counts
- Average cost calculations
- Supplier management

---

## 🔐 Security Implementation

### Authentication

**Supabase Auth:**

- Email/password authentication
- Session management
- Secure password hashing
- Password reset via email

**Middleware Protection:**

```typescript
// middleware.ts
- Protected routes: /dashboard/*
- Redirects: Unauthenticated users → /login
- Auto-redirect: Authenticated users at /login → /dashboard
```

### Authorization

**Role-Based Access:**

```typescript
// Owner check
if (profile?.role === "owner") {
  // Full access
}

// Receptionist check
if (profile?.role === "receptionist") {
  // Limited access
  // Must use profile.store_id for queries
}
```

**Store Isolation:**

```typescript
// Receptionists can only query their store
query = query.eq("store_id", profile.store_id);
```

### Row-Level Security (Recommended)

Add RLS policies in Supabase:

```sql
-- Products: Receptionists see only their store
CREATE POLICY "Receptionists see own store products" ON products
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'owner')
    OR
    store_id IN (SELECT store_id FROM profiles WHERE id = auth.uid())
  );

-- Sales: Receptionists see only their store
CREATE POLICY "Receptionists see own store sales" ON sales
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'owner')
    OR
    store_id IN (SELECT store_id FROM profiles WHERE id = auth.uid())
  );
```

---

## ⚡ Performance Optimizations

### Load Time Improvements

**Before:** 6-12 seconds initial load  
**After:** 1-3 seconds initial load  
**Improvement:** 75-83% faster

### Optimization Techniques

1. **Non-Blocking Authentication**

```typescript
// AuthProvider.tsx
- Start with loading=false
- Load auth in background
- Render UI immediately
```

2. **React Query Caching**

```typescript
// ReactQueryProvider.tsx
staleTime: 5 * 60 * 1000,  // 5 minutes
gcTime: 10 * 60 * 1000,     // 10 minutes
```

3. **Lazy Loading**

```typescript
// LazyCharts.tsx
- Charts loaded only when needed
- Reduces initial bundle size
- Faster first paint
```

4. **Animations Disabled**

```css
/* globals.css */
* {
  animation-duration: 0s !important;
  transition-duration: 0s !important;
}
```

5. **Optimistic Updates**

```typescript
// sales/new/page.tsx
- Update UI immediately
- Background sync with database
- Better perceived performance
```

6. **Network Timeouts**

```typescript
// client.ts
- 10-second timeout for Thailand → US latency
- Better error handling
- Prevents hanging requests
```

7. **Edge Deployment**

```json
// vercel.json
"regions": ["sin1"]  // Singapore region
```

---

## 🌍 Localization

### Currency

- **Primary:** Thai Baht (฿)
- Format: ฿1,234.56

### Language Support

- **UI:** English
- **Product Names:** Full Unicode support (Myanmar, Thai, etc.)
- **Date Format:** Dec 12, 2024 (English format)

### Market Optimization

- Deployed in Singapore region
- Optimized for Southeast Asia
- Low latency for Thailand users (~30-50ms)

---

## 📱 Responsive Design

### Desktop (1024px+)

- Full sidebar navigation
- Multi-column layouts
- Detailed analytics charts
- Optimized for data entry

### Tablet (768px - 1023px)

- Collapsible sidebar
- Responsive tables
- Touch-optimized buttons
- Grid layouts

### Mobile (< 768px)

- Hamburger menu
- Single-column layouts
- Simplified charts
- Touch-friendly POS

---

## 🚀 Deployment

### Deploy to Vercel

1. **Push to GitHub**

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/storeflow.git
git push -u origin main
```

2. **Import to Vercel**

- Go to [Vercel Dashboard](https://vercel.com)
- Click "Import Project"
- Select your GitHub repository
- Configure environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. **Deploy**

- Click "Deploy"
- Vercel automatically detects Next.js
- Deploys to Singapore region (configured in vercel.json)

4. **Post-Deployment**

- Update Supabase authentication settings
- Add your Vercel domain to Supabase allowed URLs
- Test authentication flow

### Environment Variables in Vercel

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## 📚 Project Structure

```
storeflow/
├── app/                          # Next.js App Router
│   ├── (auth)/
│   │   └── login/               # Login page
│   │       └── page.tsx
│   ├── dashboard/               # Protected dashboard
│   │   ├── layout.tsx          # Dashboard layout with sidebar
│   │   ├── page.tsx            # Analytics dashboard (owners)
│   │   ├── products/           # Product management
│   │   │   ├── page.tsx       # Products list
│   │   │   ├── new/           # Create product
│   │   │   └── [id]/          # Edit product
│   │   ├── sales/             # Sales management
│   │   │   ├── page.tsx       # Sales history
│   │   │   └── new/           # POS system
│   │   ├── purchases/         # Purchase tracking (owners)
│   │   │   ├── page.tsx       # Purchases list
│   │   │   └── new/           # Record purchase
│   │   ├── stores/            # Store management (owners)
│   │   │   └── page.tsx
│   │   └── settings/          # User settings
│   │       └── page.tsx
│   ├── globals.css            # Global styles
│   └── layout.tsx             # Root layout
│
├── components/
│   └── ui/                    # shadcn/ui components
│       ├── alert-dialog.tsx
│       ├── avatar.tsx
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── dropdown-menu.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── select.tsx
│       ├── separator.tsx
│       ├── table.tsx
│       ├── LazyCharts.tsx    # Lazy-loaded charts
│       └── Loading.tsx       # Loading states
│
├── hooks/
│   ├── useDebounce.ts        # Debounce hook
│   └── useSupabaseQuery.ts   # React Query hooks
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts         # Browser client
│   │   └── server.ts         # Server client
│   └── utils.ts              # Utility functions
│
├── providers/
│   ├── AuthProvider.tsx      # Authentication context
│   └── ReactQueryProvider.tsx # React Query setup
│
├── types/
│   └── database.types.ts     # Supabase TypeScript types
│
├── middleware.ts             # Auth middleware
├── next.config.ts            # Next.js configuration
├── tailwind.config.ts        # Tailwind CSS config
├── tsconfig.json             # TypeScript config
├── package.json              # Dependencies
└── vercel.json               # Vercel deployment config
```

---

## 🧪 Testing

### Manual Testing Checklist

**Authentication:**

- [ ] Owner can login
- [ ] Receptionist can login
- [ ] Invalid credentials rejected
- [ ] Session persists on reload
- [ ] Logout works correctly

**Owner Features:**

- [ ] Dashboard loads with analytics
- [ ] Can view all stores
- [ ] Can create products
- [ ] Can edit products
- [ ] Can delete products
- [ ] Can record sales
- [ ] Can record purchases
- [ ] Can create stores
- [ ] Can manage users

**Receptionist Features:**

- [ ] Auto-redirected to POS
- [ ] Can only see assigned store
- [ ] Can create products
- [ ] Can record sales
- [ ] Cannot access dashboard
- [ ] Cannot access purchases
- [ ] Cannot access stores
- [ ] Cannot manage users

**POS System:**

- [ ] Product search works
- [ ] Can add items to cart
- [ ] Quantity controls work
- [ ] Stock validation works
- [ ] Payment methods work
- [ ] Sale completes successfully
- [ ] Stock updates correctly
- [ ] Receipt shows correct data

---

## 🐛 Troubleshooting

### Common Issues

**1. "Invalid API key" Error**

```
Problem: Supabase credentials not configured
Solution: Check .env.local has correct SUPABASE_URL and SUPABASE_ANON_KEY
```

**2. "Auth session not found"**

```
Problem: Session expired or middleware issues
Solution: Clear browser cookies and login again
```

**3. Products not showing**

```
Problem: Store filtering issue
Solution: Check profile.store_id matches product.store_id for receptionists
```

**4. Slow loading (6+ seconds)**

```
Problem: Authentication hanging
Solution: Ensure AuthProvider starts with loading=false
```

**5. TypeScript errors on build**

```
Problem: Supabase types mismatch
Solution: npx supabase gen types typescript --project-id your-project-id > types/database.types.ts
```

---

## 📈 Roadmap

### Version 1.0 (Current)

- ✅ Multi-store management
- ✅ Role-based access control
- ✅ Product inventory
- ✅ POS system
- ✅ Sales analytics
- ✅ Purchase tracking
- ✅ Performance optimizations

### Version 1.1 (Planned)

- [ ] Multi-tenancy (multiple businesses)
- [ ] User invitations
- [ ] Email notifications
- [ ] Receipt printing
- [ ] Barcode scanning
- [ ] CSV import/export

### Version 2.0 (Future)

- [ ] Mobile app (React Native)
- [ ] Offline mode
- [ ] Advanced reporting
- [ ] API access
- [ ] Integration with accounting software
- [ ] Customer loyalty program

---

## 🤝 Contributing

This is a private project for internal business use. External contributions are not accepted at this time.

---

## 📄 License

Private - Internal Business Use Only

---

## 👨‍💻 Author

Created for internal business operations in Thailand.

**Contact:**

- For business inquiries: owner@yourcompany.com

---

## 🙏 Acknowledgments

- **Next.js** - Amazing React framework
- **Supabase** - Powerful backend platform
- **shadcn/ui** - Beautiful UI components
- **TanStack Query** - Excellent data fetching library
- **Vercel** - Seamless deployment platform
- **Tailwind CSS** - Utility-first CSS framework

---

## 📊 Statistics

- **Load Time:** 1-3 seconds (75% improvement)
- **Database:** PostgreSQL (Supabase)
- **Tables:** 6 main tables
- **Components:** 20+ reusable UI components
- **TypeScript Coverage:** 100%
- **Deployment:** Vercel Edge (Singapore)
- **Supported Languages:** Unicode (Myanmar, Thai, English)

---

## 🔄 Version History

### v1.0.0 (December 2024)

- Initial release
- Multi-store management
- Role-based access control
- POS system
- Analytics dashboard
- Performance optimizations (75% faster)
- Singapore region deployment

---

**Built with ❤️ for efficient multi-store management in Thailand**

_Last Updated: December 2024_
