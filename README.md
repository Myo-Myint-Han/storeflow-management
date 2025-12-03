# StoreFlow - Store Management System

A comprehensive multi-store management system built with Next.js 16, React 19, and Supabase. Designed for managing products, sales, purchases, and analytics across multiple store locations in Thailand.

## 🚀 Features

### For Store Owners

- **Dashboard Analytics**: Track sales, profit, peak hours, and top products
- **Multi-Store Management**: Manage multiple store locations
- **Product Management**: Full CRUD operations for inventory
- **Sales History**: View detailed transaction history with filters
- **Purchase Tracking**: Record and monitor inventory purchases
- **Low Stock Alerts**: Automatic notifications for products running low
- **Role-Based Access**: Manage owner and receptionist roles

### For Receptionists

- **Point of Sale (POS)**: Fast and intuitive sales interface
- **Product Search**: Quick product lookup by name, SKU, or category
- **Real-time Stock Updates**: Instant inventory updates after sales
- **Multiple Payment Methods**: Support for cash, card, and other payments

## 🛠️ Tech Stack

- **Framework**: Next.js 16 with App Router
- **UI Library**: React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **State Management**: TanStack React Query
- **Date Handling**: date-fns
- **Charts**: Recharts (lazy-loaded)
- **Deployment**: Vercel (Singapore region)

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Vercel account (for deployment)

## 🔧 Installation

1. **Clone the repository**

```bash
git clone <your-repo-url>
cd storeflow-management
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Set up Supabase database**

Run the following SQL in your Supabase SQL editor to create the necessary tables:

```sql
-- Create stores table
CREATE TABLE stores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  address TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'receptionist')),
  store_id UUID REFERENCES stores,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create products table
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID REFERENCES stores NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT,
  category TEXT,
  buying_price DECIMAL(10,2) NOT NULL,
  selling_price DECIMAL(10,2) NOT NULL,
  stock INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 10,
  image_url TEXT,
  created_by UUID REFERENCES profiles,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create sales table
CREATE TABLE sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID REFERENCES stores NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  profit DECIMAL(10,2) NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'other')),
  sold_by UUID REFERENCES profiles,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create sale_items table
CREATE TABLE sale_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID REFERENCES sales ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products NOT NULL,
  quantity INTEGER NOT NULL,
  price_at_sale DECIMAL(10,2) NOT NULL,
  cost_at_sale DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  profit DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create purchases table
CREATE TABLE purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID REFERENCES stores NOT NULL,
  product_id UUID REFERENCES products NOT NULL,
  quantity INTEGER NOT NULL,
  cost_per_unit DECIMAL(10,2) NOT NULL,
  total_cost DECIMAL(10,2) NOT NULL,
  supplier TEXT,
  notes TEXT,
  purchased_by UUID REFERENCES profiles,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (example for products)
CREATE POLICY "Users can view products" ON products
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert products" ON products
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
```

5. **Run the development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🌐 Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

The project is configured for Singapore region (`sin1`) for optimal performance in Thailand.

## 📁 Project Structure

```
storeflow-management/
├── app/                      # Next.js App Router
│   ├── dashboard/           # Dashboard pages
│   │   ├── products/       # Product management
│   │   ├── sales/          # Sales management
│   │   ├── purchases/      # Purchase tracking
│   │   └── stores/         # Store management
│   ├── login/              # Authentication
│   └── layout.tsx          # Root layout
├── components/
│   └── ui/                 # shadcn/ui components
├── hooks/                  # Custom React hooks
│   ├── useSupabaseQuery.ts # TanStack Query hooks
│   └── useDebounce.ts      # Debounce hook
├── lib/
│   ├── supabase/           # Supabase clients
│   ├── cache-actions.ts    # Cache invalidation
│   └── cache-utils.ts      # Cached queries
├── providers/              # React context providers
├── types/                  # TypeScript types
└── public/                 # Static assets
```

## 🔑 User Roles

### Owner Role

- Full system access
- View analytics dashboard
- Manage all stores and products
- Track purchases and sales
- Manage staff accounts

### Receptionist Role

- Limited to assigned store
- Access POS system
- View products
- Record sales
- Cannot access analytics or admin features

## 💡 Key Features Explained

### Performance Optimizations

- **React Query Caching**: 5-minute stale time for products and stores
- **Lazy Loading**: Charts loaded on-demand to reduce initial bundle size
- **Optimistic Updates**: Instant UI feedback on sales completion
- **Connection Pooling**: Configured for Supabase via Vercel
- **Regional Deployment**: Singapore region for low latency in Thailand

### Real-time Updates

- Automatic cache invalidation on data changes
- Background refetching with React Query
- Optimistic UI updates for better UX

### Analytics Dashboard

- Today's sales and profit metrics
- Peak sales hours visualization
- Top 5 products by revenue
- Top 5 categories breakdown
- Payment method distribution
- Low stock alerts

## 🔒 Security

- Row Level Security (RLS) policies on all tables
- Authentication via Supabase Auth
- Role-based access control (RBAC)
- Protected routes with middleware
- Server-side session validation

## 🎨 Styling

- Tailwind CSS for utility-first styling
- shadcn/ui for accessible components
- Responsive design for mobile and desktop
- Dark mode ready (configured in tailwind)

## 📱 Responsive Design

- Mobile-first approach
- Optimized for tablets and desktops
- Sidebar navigation for large screens
- Bottom navigation for mobile (if implemented)

## 🐛 Troubleshooting

### Slow Loading

- Check Supabase connection pooling settings
- Verify regional deployment (should be `sin1`)
- Review React Query cache configuration

### Authentication Issues

- Clear browser cookies and localStorage
- Verify Supabase environment variables
- Check RLS policies in Supabase

### Data Not Updating

- Check cache invalidation in `cache-actions.ts`
- Verify React Query is properly configured
- Review Supabase RLS policies

## 📝 License

This project is private and proprietary.

## 👨‍💻 Developer

Built with ❤️ for efficient store management in Thailand.

## 🤝 Support

For support, please contact the project maintainer.

---

**Currency**: All prices are in Thai Baht (฿)  
**Region**: Optimized for Thailand market  
**Version**: 1.0.0
