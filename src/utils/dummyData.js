// ─── Dummy Users ──────────────────────────────────────────────────────────────
export const DUMMY_USERS = [
  { id: 1, name: 'Alex Chen',     email: 'student@demo.com', password: 'demo123', role: 'USER',    avatar: 'AC' },
  { id: 2, name: 'Chef Marco',    email: 'chef@demo.com',    password: 'demo123', role: 'MANAGER', avatar: 'CM' },
  { id: 3, name: 'Admin Sarah',   email: 'admin@demo.com',   password: 'demo123', role: 'ADMIN',   avatar: 'AS' },
  { id: 4, name: 'Kitchen Staff', email: 'kitchen@demo.com', password: 'demo123', role: 'KITCHEN', avatar: 'KS' },
]

// ─── Menu Items ───────────────────────────────────────────────────────────────
export const DUMMY_MENU = [
  { id: 1,  name: 'Dal Tadka + Rice',     category: 'MAIN',     foodCategory: 'MAIN',     price: 60,  available: true,  emoji: '🍛', description: 'Yellow lentils tempered with cumin, garlic & ghee', rating: 4.8, ordersToday: 42 },
  { id: 2,  name: 'Paneer Butter Masala', category: 'MAIN',     foodCategory: 'MAIN',     price: 90,  available: true,  emoji: '🧀', description: 'Soft paneer in rich tomato-butter gravy',           rating: 4.7, ordersToday: 38 },
  { id: 3,  name: 'Veg Biryani',          category: 'MAIN',     foodCategory: 'MAIN',     price: 80,  available: true,  emoji: '🍚', description: 'Fragrant basmati rice with mixed vegetables',       rating: 4.9, ordersToday: 67 },
  { id: 4,  name: 'Chole Bhature',        category: 'MAIN',     foodCategory: 'MAIN',     price: 70,  available: false, emoji: '🫓', description: 'Spiced chickpea curry with fluffy bhatura',         rating: 4.6, ordersToday: 0  },
  { id: 5,  name: 'Samosa (2 pcs)',       category: 'SNACK',    foodCategory: 'SNACK',    price: 20,  available: true,  emoji: '🥟', description: 'Crispy pastry stuffed with spiced potatoes & peas', rating: 4.5, ordersToday: 85 },
  { id: 6,  name: 'Bread Pakoda',         category: 'SNACK',    foodCategory: 'SNACK',    price: 25,  available: true,  emoji: '🍞', description: 'Potato-stuffed bread fritter, fried golden',        rating: 4.3, ordersToday: 44 },
  { id: 7,  name: 'Masala Chai',          category: 'BEVERAGE', foodCategory: 'BEVERAGE', price: 15,  available: true,  emoji: '☕', description: 'Spiced Indian tea with ginger, cardamom & milk',    rating: 4.9, ordersToday: 120 },
  { id: 8,  name: 'Mango Lassi',          category: 'BEVERAGE', foodCategory: 'BEVERAGE', price: 35,  available: true,  emoji: '🥭', description: 'Chilled mango yoghurt drink',                       rating: 4.8, ordersToday: 55 },
  { id: 9,  name: 'Cold Coffee',          category: 'BEVERAGE', foodCategory: 'BEVERAGE', price: 40,  available: true,  emoji: '🥤', description: 'Creamy blended coffee with ice cream',              rating: 4.6, ordersToday: 31 },
  { id: 10, name: 'Gulab Jamun (2 pcs)',  category: 'DESSERT',  foodCategory: 'DESSERT',  price: 30,  available: true,  emoji: '🍮', description: 'Soft milk-solid dumplings in rose-flavoured syrup', rating: 4.9, ordersToday: 38 },
]

// ─── Orders ───────────────────────────────────────────────────────────────────
export const DUMMY_ORDERS = [
  { id: 'ORD-001', studentName: 'Arjun Sharma', items: [{ name: 'Dal Tadka + Rice', qty: 1, price: 60 }, { name: 'Mango Lassi', qty: 2, price: 35 }],      total: 130, status: 'READY',     createdAt: '2024-03-15T09:10:00Z', orderNumber: '#ORD-001', statusLabel: 'Ready for Pickup', totalItems: 2 },
  { id: 'ORD-002', studentName: 'Priya Nair',   items: [{ name: 'Veg Biryani', qty: 1, price: 80 }],                                                        total: 80,  status: 'PREPARING', createdAt: '2024-03-15T09:22:00Z', orderNumber: '#ORD-002', statusLabel: 'Preparing',        totalItems: 1 },
  { id: 'ORD-003', studentName: 'Rahul Gupta',  items: [{ name: 'Samosa (2 pcs)', qty: 2, price: 20 }, { name: 'Masala Chai', qty: 1, price: 15 }],         total: 55,  status: 'PENDING',   createdAt: '2024-03-15T09:35:00Z', orderNumber: '#ORD-003', statusLabel: 'Pending',          totalItems: 2, canReorder: true },
  { id: 'ORD-004', studentName: 'Sneha Reddy',  items: [{ name: 'Paneer Butter Masala', qty: 1, price: 90 }, { name: 'Cold Coffee', qty: 1, price: 40 }],   total: 130, status: 'COMPLETED', createdAt: '2024-03-15T08:50:00Z', orderNumber: '#ORD-004', statusLabel: 'Completed',        totalItems: 2, canReorder: true, canDownloadInvoice: true },
  { id: 'ORD-005', studentName: 'Vikram Patel', items: [{ name: 'Chole Bhature', qty: 1, price: 70 }],                                                       total: 70,  status: 'CANCELLED', createdAt: '2024-03-15T08:30:00Z', orderNumber: '#ORD-005', statusLabel: 'Cancelled',        totalItems: 1 },
  { id: 'ORD-006', studentName: 'Kavya Singh',  items: [{ name: 'Gulab Jamun (2 pcs)', qty: 2, price: 30 }, { name: 'Dal Tadka + Rice', qty: 1, price: 60 }], total: 120, status: 'COMPLETED', createdAt: '2024-03-14T11:00:00Z', orderNumber: '#ORD-006', statusLabel: 'Completed',     totalItems: 2, canReorder: true, canDownloadInvoice: true },
]

// ─── Analytics Data ────────────────────────────────────────────────────────────
export const DUMMY_DAILY_REVENUE = [
  { day: 'Mon', revenue: 420, orders: 48 },
  { day: 'Tue', revenue: 380, orders: 42 },
  { day: 'Wed', revenue: 510, orders: 57 },
  { day: 'Thu', revenue: 475, orders: 53 },
  { day: 'Fri', revenue: 620, orders: 71 },
  { day: 'Sat', revenue: 290, orders: 32 },
  { day: 'Sun', revenue: 180, orders: 21 },
]

export const DUMMY_MONTHLY_REVENUE = [
  { month: 'Sep', revenue: 8200,  orders: 912 },
  { month: 'Oct', revenue: 9400,  orders: 1043 },
  { month: 'Nov', revenue: 8800,  orders: 978 },
  { month: 'Dec', revenue: 7200,  orders: 800 },
  { month: 'Jan', revenue: 10200, orders: 1133 },
  { month: 'Feb', revenue: 11500, orders: 1277 },
  { month: 'Mar', revenue: 12800, orders: 1422 },
]

export const DUMMY_CATEGORY_BREAKDOWN = [
  { name: 'Main',     value: 58, color: '#22c55e' },
  { name: 'Beverage', value: 22, color: '#3b82f6' },
  { name: 'Snack',    value: 12, color: '#f59e0b' },
  { name: 'Dessert',  value: 8,  color: '#ec4899' },
]

export const DUMMY_TOP_ITEMS = [
  { name: 'Masala Chai',          orders: 320, value: 320, revenue: 4800  },
  { name: 'Veg Biryani',          orders: 245, value: 245, revenue: 19600 },
  { name: 'Samosa (2 pcs)',       orders: 210, value: 210, revenue: 4200  },
  { name: 'Mango Lassi',          orders: 187, value: 187, revenue: 6545  },
  { name: 'Dal Tadka + Rice',     orders: 164, value: 164, revenue: 9840  },
]

export const DUMMY_VENDOR_PERFORMANCE = [
  { name: 'Main Counter',  orders: 421, value: 421, revenue: 32800 },
  { name: 'Snack Corner',  orders: 387, value: 387, revenue: 9675  },
  { name: 'Beverages',     orders: 312, value: 312, revenue: 7800  },
]


export const ORDER_STATUS_FLOW = ['PENDING', 'PREPARING', 'READY', 'COMPLETED']

export const STATUS_CONFIG = {
  PENDING:   { label: 'Pending',   color: 'badge-yellow', icon: '⏳' },
  PREPARING: { label: 'Preparing', color: 'badge-blue',   icon: '👨‍🍳' },
  READY:     { label: 'Ready',     color: 'badge-green',  icon: '✅' },
  COMPLETED: { label: 'Completed', color: 'badge-gray',   icon: '📦' },
  CANCELLED: { label: 'Cancelled', color: 'badge-red',    icon: '❌' },
}
