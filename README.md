# 🍽 CanteenDAO — Decentralized Canteen Management System

A production-ready React frontend for a blockchain-powered canteen management platform with **3 role-based dashboards**, **ethers.js v6** integration, **Recharts analytics**, and **JWT authentication**.

---

## ⚙️ Tech Stack

| Tech              | Version   |
|-------------------|-----------|
| Node.js           | 20 LTS    |
| React             | 18.2.0    |
| Vite              | 5.1.4     |
| Tailwind CSS      | 3.4.1     |
| Axios             | 1.6.8     |
| ethers.js         | 6.11.1    |
| React Router DOM  | 6.22.3    |
| Recharts          | 2.x       |
| Framer Motion     | 11.x      |
| React Hot Toast   | 2.x       |

---

## 🚀 Installation

### 1. Clone & Install

```bash
# Navigate to the project
cd canteen-dao

# Install all dependencies (exact versions from package.json)
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_API_BASE_URL=http://localhost:8080/api
VITE_CONTRACT_ADDRESS=0xYourDeployedContractAddress
VITE_CHAIN_ID=31337
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### 4. Build for Production

```bash
npm run build
npm run preview
```

---

## 🔑 Demo Login Credentials

| Role    | Email               | Password  |
|---------|---------------------|-----------|
| Student | student@demo.com    | demo123   |
| Chef    | chef@demo.com       | demo123   |
| Admin   | admin@demo.com      | demo123   |

> These work **without** a running backend (dummy data fallback in dev mode).

---

## 📂 Project Structure

```
src/
├── assets/                    # Static assets (images, icons, fonts)
│
├── components/
│   ├── layout/
│   │   ├── AdminLayout.jsx    # Admin shell (sidebar + topbar)
│   │   ├── ChefLayout.jsx     # Chef shell
│   │   ├── StudentLayout.jsx  # Student shell
│   │   ├── Sidebar.jsx        # Reusable sidebar with role-based nav
│   │   └── Topbar.jsx         # Top navbar with wallet + theme toggle
│   │
│   ├── ui/
│   │   ├── Button.jsx         # Polymorphic button (5 variants, 3 sizes)
│   │   ├── Input.jsx          # Form input with label, error, icon slots
│   │   ├── StatCard.jsx       # KPI metric card with trend indicator
│   │   ├── Skeleton.jsx       # Loading skeletons (card, row, table)
│   │   ├── WalletButton.jsx   # MetaMask connect / display button
│   │   ├── ThemeToggle.jsx    # Dark/light mode toggle
│   │   ├── PageLoader.jsx     # Full-screen loading spinner
│   │   └── ErrorBoundary.jsx  # React error boundary with fallback UI
│   │
│   └── charts/                # Chart components (extend Recharts wrappers here)
│
├── pages/
│   ├── auth/
│   │   ├── Login.jsx          # JWT login with demo shortcuts
│   │   └── Register.jsx       # Registration with role selection
│   │
│   ├── student/
│   │   ├── Menu.jsx           # Browse & filter menu, add to cart
│   │   ├── Cart.jsx           # Cart review + blockchain payment
│   │   ├── Orders.jsx         # Order history with status tracker + tx hash
│   │   └── Profile.jsx        # User profile + wallet info
│   │
│   ├── chef/
│   │   ├── ChefDashboard.jsx  # Daily revenue charts + order summary
│   │   ├── ChefOrders.jsx     # Live order board (accept/reject/advance)
│   │   └── ChefMenu.jsx       # Enable/disable menu items
│   │
│   ├── admin/
│   │   ├── AdminDashboard.jsx # System KPIs + top items + recent tx
│   │   ├── AdminAnalytics.jsx # Full analytics: area, bar, pie, vendor perf
│   │   ├── AdminOrders.jsx    # All orders with filter + tx hash view
│   │   ├── AdminMenu.jsx      # Full CRUD menu management
│   │   └── AdminUsers.jsx     # User list with role filter + toggle
│   │
│   └── NotFound.jsx           # Animated 404 page
│
├── services/
│   ├── api.js                 # Axios instance + request/response interceptors
│   ├── auth.js                # Login, register, profile API calls
│   └── blockchain.js          # Full ethers.js v6 service:
│                              #   connectWallet, getContractInstance,
│                              #   placeOrderOnChain, getTransactionStatus
│
├── context/
│   ├── AuthContext.jsx        # JWT auth state (login/logout/register)
│   ├── ThemeContext.jsx       # Dark/light theme with localStorage
│   ├── CartContext.jsx        # Shopping cart reducer
│   └── BlockchainContext.jsx  # Wallet connection state + event listeners
│
├── hooks/
│   ├── useOrders.js           # Fetch orders with loading/error state
│   ├── useMenu.js             # Fetch menu items
│   └── useLocalStorage.js     # Persistent state hook
│
├── utils/
│   ├── helpers.js             # Currency, date, address formatters
│   └── dummyData.js           # Dev/testing data for all entities
│
├── routes/
│   └── AppRoutes.jsx          # Full route tree with guards:
│                              #   RequireAuth, RequireRole, PublicOnly
│
├── App.jsx                    # Root — composes all providers
├── main.jsx                   # ReactDOM.createRoot + Toaster
└── index.css                  # Tailwind + design system tokens
```

---

## 🔐 Authentication Flow

```
User submits login form
  → authService.login()
  → JWT stored in localStorage
  → apiClient default header set
  → User stored in AuthContext
  → Navigate to role-based home:
      STUDENT → /student/menu
      CHEF    → /chef/orders
      ADMIN   → /admin/dashboard
```

**401 handling**: Axios interceptor auto-clears token + redirects to `/login`.

---

## 🔗 Blockchain Integration (ethers.js v6)

```javascript
// Connect wallet
const { account, signer } = await blockchainService.connectWallet()

// Place order on-chain
const { transactionHash } = await blockchainService.placeOrderOnChain(
  signer,
  orderId,
  amountInEther
)

// Check tx status
const status = await blockchainService.getTransactionStatus(provider, txHash)
```

**Error cases handled**:
- MetaMask not installed
- User rejects connection
- User rejects transaction
- Wrong network
- Gas estimation failure
- Contract call exceptions

---

## 🌐 API Integration

All API calls go through `src/services/api.js`:

```javascript
// Axios instance auto-attaches JWT
import api from '@/services/api'

const orders = await api.get('/orders')
const order  = await api.post('/orders', { items, total })
```

Backend base URL: `http://localhost:8080/api` (proxied in dev via Vite)

---

## 🎨 Design System

- **Glassmorphism** cards with `backdrop-blur`
- **Brand color** — green (`#22c55e`) with glow shadows
- **Dark mode** — class-based (`dark:` prefix), persisted to localStorage
- **Typography** — DM Sans body + JetBrains Mono for code
- **Animations** — Framer Motion page transitions + Tailwind keyframes
- **Responsive** — mobile-first, sidebar collapses on lg breakpoint

---

## 📡 Spring Boot Backend Endpoints Expected

| Method | Endpoint                  | Description            |
|--------|---------------------------|------------------------|
| POST   | /api/auth/login           | Login → JWT            |
| POST   | /api/auth/register        | Register               |
| GET    | /api/auth/me              | Current user profile   |
| GET    | /api/menu                 | All menu items         |
| GET    | /api/orders               | Orders (role-filtered) |
| POST   | /api/orders               | Place new order        |
| PATCH  | /api/orders/:id/status    | Update order status    |
| PATCH  | /api/orders/:id           | Save tx hash           |
| GET    | /api/analytics/revenue    | Revenue data           |

---

## 🧪 Running Without Backend

The app works fully offline in dev mode using `DUMMY_*` data in `src/utils/dummyData.js`.
To switch to real API, remove the dummy fallback in `src/services/auth.js` and `src/hooks/useOrders.js`.
