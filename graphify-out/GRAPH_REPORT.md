# Graph Report - src  (2026-04-18)

## Corpus Check
- Corpus is ~44,570 words - fits in a single context window. You may not need a graph.

## Summary
- 450 nodes · 575 edges · 64 communities detected
- Extraction: 83% EXTRACTED · 17% INFERRED · 0% AMBIGUOUS · INFERRED: 98 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Live Order Operations|Live Order Operations]]
- [[_COMMUNITY_Canteen Availability UI|Canteen Availability UI]]
- [[_COMMUNITY_Admin Menu Analytics|Admin Menu Analytics]]
- [[_COMMUNITY_Checkout Cart Pipeline|Checkout Cart Pipeline]]
- [[_COMMUNITY_Routing Access Control|Routing Access Control]]
- [[_COMMUNITY_Scanner Camera Diagnostics|Scanner Camera Diagnostics]]
- [[_COMMUNITY_Admin Operations UI|Admin Operations UI]]
- [[_COMMUNITY_Invoice Order Utilities|Invoice Order Utilities]]
- [[_COMMUNITY_Frontend Service Backbone|Frontend Service Backbone]]
- [[_COMMUNITY_Cart Item Normalization|Cart Item Normalization]]
- [[_COMMUNITY_Kitchen Status Actions|Kitchen Status Actions]]
- [[_COMMUNITY_JWT Session Lifecycle|JWT Session Lifecycle]]
- [[_COMMUNITY_Operations Dashboard Pages|Operations Dashboard Pages]]
- [[_COMMUNITY_Modal Primitive Set|Modal Primitive Set]]
- [[_COMMUNITY_Analytics Data Formatting|Analytics Data Formatting]]
- [[_COMMUNITY_Auth State Management|Auth State Management]]
- [[_COMMUNITY_Validation Utilities|Validation Utilities]]
- [[_COMMUNITY_Phone Scanner Flow|Phone Scanner Flow]]
- [[_COMMUNITY_Scanner Session Service|Scanner Session Service]]
- [[_COMMUNITY_Canteen State Helpers|Canteen State Helpers]]
- [[_COMMUNITY_Theme Switching|Theme Switching]]
- [[_COMMUNITY_Analytics Charts|Analytics Charts]]
- [[_COMMUNITY_Error Boundary|Error Boundary]]
- [[_COMMUNITY_Shared State Contexts|Shared State Contexts]]
- [[_COMMUNITY_Skeleton Loaders|Skeleton Loaders]]
- [[_COMMUNITY_Application Entry|Application Entry]]
- [[_COMMUNITY_Blockchain Wallet|Blockchain Wallet]]
- [[_COMMUNITY_Auth Service Helpers|Auth Service Helpers]]
- [[_COMMUNITY_Manager API Helpers|Manager API Helpers]]
- [[_COMMUNITY_Menu Service Helpers|Menu Service Helpers]]
- [[_COMMUNITY_Badge Component|Badge Component]]
- [[_COMMUNITY_Page Loader|Page Loader]]
- [[_COMMUNITY_Pagination UI|Pagination UI]]
- [[_COMMUNITY_Rating Modal|Rating Modal]]
- [[_COMMUNITY_Star Rating|Star Rating]]
- [[_COMMUNITY_Stat Card|Stat Card]]
- [[_COMMUNITY_Wallet Button|Wallet Button]]
- [[_COMMUNITY_Local Storage Hook|Local Storage Hook]]
- [[_COMMUNITY_Storage Constants|Storage Constants]]
- [[_COMMUNITY_Rating Experience|Rating Experience]]
- [[_COMMUNITY_Blockchain Wallet Bridge|Blockchain Wallet Bridge]]
- [[_COMMUNITY_Theme Toggle Bridge|Theme Toggle Bridge]]
- [[_COMMUNITY_Student Cart Bridge|Student Cart Bridge]]
- [[_COMMUNITY_Main Entry File|Main Entry File]]
- [[_COMMUNITY_Polyfills File|Polyfills File]]
- [[_COMMUNITY_Input Component File|Input Component File]]
- [[_COMMUNITY_Kitchen Service File|Kitchen Service File]]
- [[_COMMUNITY_Rating Service File|Rating Service File]]
- [[_COMMUNITY_Test Service File|Test Service File]]
- [[_COMMUNITY_Dummy Data File|Dummy Data File]]
- [[_COMMUNITY_Polyfills Module|Polyfills Module]]
- [[_COMMUNITY_Input Component|Input Component]]
- [[_COMMUNITY_QR Scanner Modal|QR Scanner Modal]]
- [[_COMMUNITY_Stat Card Component|Stat Card Component]]
- [[_COMMUNITY_Analytics Hook|Analytics Hook]]
- [[_COMMUNITY_Debounce Hook|Debounce Hook]]
- [[_COMMUNITY_Local Storage Utility|Local Storage Utility]]
- [[_COMMUNITY_Menu Data Hook|Menu Data Hook]]
- [[_COMMUNITY_Orders Data Hook|Orders Data Hook]]
- [[_COMMUNITY_Pagination Hook|Pagination Hook]]
- [[_COMMUNITY_Not Found Page|Not Found Page]]
- [[_COMMUNITY_Canteen Toggle Page|Canteen Toggle Page]]
- [[_COMMUNITY_Test Service|Test Service]]
- [[_COMMUNITY_Brand Logo|Brand Logo]]

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 18 edges
2. `Skeleton` - 12 edges
3. `useCanteen()` - 11 edges
4. `Constants` - 11 edges
5. `API Client` - 10 edges
6. `OrderCard()` - 8 edges
7. `StudentLayout()` - 8 edges
8. `useOrders()` - 8 edges
9. `Orders Service` - 8 edges
10. `ChefLayout()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `OrdersBarChart()` --semantically_similar_to--> `RevenueAreaChart()`  [INFERRED] [semantically similar]
  src\components\charts\OrdersBarChart.jsx → src\components\charts\RevenueAreaChart.jsx
- `Drawer()` --semantically_similar_to--> `Modal()`  [INFERRED] [semantically similar]
  src\components\ui\Drawer.jsx → src\components\ui\Modal.jsx
- `NotificationProvider()` --calls--> `useAuth()`  [INFERRED]
  src\context\NotificationContext.jsx → src\context\AuthContext.jsx
- `ChefLayout()` --calls--> `useOrders()`  [INFERRED]
  src\components\layout\ChefLayout.jsx → src\hooks\useOrders.js
- `KitchenLayout()` --calls--> `useAuth()`  [INFERRED]
  src\components\layout\KitchenLayout.jsx → src\context\AuthContext.jsx

## Hyperedges (group relationships)
- **Shared App Shell** — adminlayout_adminlayout, cheflayout_cheflayout, studentlayout_studentlayout, sidebar_sidebar, topbar_topbar [INFERRED 0.88]
- **Canteen Opening Readiness Flow** — cheflayout_cheflayout, kitchenlayout_kitchenlayout, canteenbanner_canteenbanner, canteenreadinesscard_canteenreadinesscard [INFERRED 0.90]
- **Admin Panel Navigation** — admin_layout, admin_dashboard, admin_analytics, admin_orders, admin_menu, admin_users [INFERRED 0.95]
- **Auth Entry Flow** — login, register, oauth_success [INFERRED 0.90]
- **Canteen-Gated Workflows** — canteen_toggle, student_cart, student_menu, student_orders, chef_orders, kitchen_dashboard [INFERRED 0.88]

## Communities

### Community 0 - "Live Order Operations"
Cohesion: 0.07
Nodes (12): CanteenProvider(), ChefOrders(), getEmptyStateText(), getEmptyStateText(), KitchenDashboard(), NotificationBell(), NotificationProvider(), useNotifications() (+4 more)

### Community 1 - "Canteen Availability UI"
Cohesion: 0.09
Nodes (13): AdminLayout(), CanteenBanner(), useCanteen(), CanteenReadinessCard(), StudentCart(), useCart(), ChefLayout(), KitchenLayout() (+5 more)

### Community 2 - "Admin Menu Analytics"
Cohesion: 0.09
Nodes (15): AdminAnalytics(), AdminDashboard(), AdminMenu(), ChefMenu(), formatCurrency(), formatDate(), formatDateTime(), formatTime() (+7 more)

### Community 3 - "Checkout Cart Pipeline"
Cohesion: 0.11
Nodes (18): buildCheckoutPayload(), buildOrderItems(), cartSnapshotsMatch(), createCartSnapshot(), createOrderItemCandidates(), fetchCartSnapshot(), getAuthStorage(), getCheckoutFoodItemId() (+10 more)

### Community 4 - "Routing Access Control"
Cohesion: 0.1
Nodes (14): PublicOnly(), RequireRole(), RootRedirect(), useAuth(), CanteenToggle(), getActionButtonClass(), getRoleHome(), Login (+6 more)

### Community 5 - "Scanner Camera Diagnostics"
Cohesion: 0.14
Nodes (14): checkCameraSupport(), classifyCameraError(), classifyLiveScannerError(), collectScannerDiagnostics(), createCameraIssue(), formatPermissionState(), getCameraPermissionState(), getHtml5QrcodeGlobals() (+6 more)

### Community 6 - "Admin Operations UI"
Cohesion: 0.12
Nodes (11): AdminOrders(), getDisplayStatus(), isPaymentPending(), AdminUsers(), normalizeActive(), normalizeRole(), normalizeUser(), RoleChip() (+3 more)

### Community 7 - "Invoice Order Utilities"
Cohesion: 0.12
Nodes (12): canAccessInvoice(), extractFilename(), getFallbackInvoiceFilename(), normaliseOrder(), resolveInvoiceFilename(), applyRoleSubscriptions(), buildClient(), createSockJSFactory() (+4 more)

### Community 8 - "Frontend Service Backbone"
Cohesion: 0.22
Nodes (18): Analytics Service, API Client, App Routes, Auth Service, Canteen Service, Cart Utils, Cart Service, Constants (+10 more)

### Community 9 - "Cart Item Normalization"
Cohesion: 0.23
Nodes (14): buildPreviousItemMap(), firstNonEmptyString(), getCartItemIdentity(), getCartRowId(), getFoodItemId(), getFoodSource(), normaliseCartItem(), normaliseCartItems() (+6 more)

### Community 10 - "Kitchen Status Actions"
Cohesion: 0.23
Nodes (10): formatCurrency(), formatElapsedTime(), getActionLabel(), getDisplayStatus(), getElapsedSecondsFromPreparing(), getNextStatus(), getPriorityFromBackend(), getStatusStyle() (+2 more)

### Community 11 - "JWT Session Lifecycle"
Cohesion: 0.25
Nodes (10): clearStoredAuthStorage(), decodeJwtPayload(), getAuthStorage(), getStoredJwt(), getStoredRefreshToken(), persistTokenMetadata(), refreshAccessTokenSilently(), scheduleSilentRefresh() (+2 more)

### Community 12 - "Operations Dashboard Pages"
Cohesion: 0.2
Nodes (14): Admin Analytics, Admin Dashboard, Admin Layout, Admin Menu, Admin Orders, Admin Users, Chef Menu, Chef Orders (+6 more)

### Community 13 - "Modal Primitive Set"
Cohesion: 0.17
Nodes (5): Button(), Drawer(), InvoicePreviewModal(), ManagerPhoneScannerModal(), Modal()

### Community 14 - "Analytics Data Formatting"
Cohesion: 0.18
Nodes (0): 

### Community 15 - "Auth State Management"
Cohesion: 0.31
Nodes (7): decodeJwtPayload(), getAuthStorage(), isStaffRole(), normalizeUser(), persistAuth(), persistTokenMetadata(), sanitizeRole()

### Community 16 - "Validation Utilities"
Cohesion: 0.31
Nodes (7): isEmail(), isMinLength(), isPositiveNumber(), isRequired(), validateLogin(), validateMenuItem(), validateRegister()

### Community 17 - "Phone Scanner Flow"
Cohesion: 0.22
Nodes (2): getHtml5QrcodeGlobals(), loadHtml5QrcodeLibrary()

### Community 18 - "Scanner Session Service"
Cohesion: 0.31
Nodes (5): buildScannerUrl(), getScannerSessionErrorMessage(), isScannerSessionExpiredError(), normaliseScannerSession(), tagExpiredScannerError()

### Community 19 - "Canteen State Helpers"
Cohesion: 0.44
Nodes (8): extractCanteenPayload(), getCanteenView(), getOrderingCopy(), isCanteenStateLike(), isFutureTime(), isRecord(), normaliseCanteenState(), parseCanteenTimestamp()

### Community 20 - "Theme Switching"
Cohesion: 0.29
Nodes (3): ThemeToggleButton(), useTheme(), ThemeToggle()

### Community 21 - "Analytics Charts"
Cohesion: 0.33
Nodes (2): OrdersBarChart(), RevenueAreaChart()

### Community 22 - "Error Boundary"
Cohesion: 0.33
Nodes (1): ErrorBoundary

### Community 23 - "Shared State Contexts"
Cohesion: 0.5
Nodes (5): Auth Context, Canteen Context, Cart Context, Notification Context, useCanteenStatus

### Community 24 - "Skeleton Loaders"
Cohesion: 0.5
Nodes (0): 

### Community 25 - "Application Entry"
Cohesion: 0.67
Nodes (2): App(), Main Entry

### Community 26 - "Blockchain Wallet"
Cohesion: 0.67
Nodes (0): 

### Community 27 - "Auth Service Helpers"
Cohesion: 1.0
Nodes (2): normaliseRole(), normaliseUser()

### Community 28 - "Manager API Helpers"
Cohesion: 0.67
Nodes (0): 

### Community 29 - "Menu Service Helpers"
Cohesion: 0.67
Nodes (0): 

### Community 30 - "Badge Component"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Page Loader"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Pagination UI"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Rating Modal"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Star Rating"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Stat Card"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Wallet Button"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Local Storage Hook"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "Storage Constants"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Rating Experience"
Cohesion: 1.0
Nodes (2): Rating Modal, Star Rating

### Community 40 - "Blockchain Wallet Bridge"
Cohesion: 1.0
Nodes (2): Blockchain Context, Wallet Button

### Community 41 - "Theme Toggle Bridge"
Cohesion: 1.0
Nodes (2): Theme Context, Theme Toggle

### Community 42 - "Student Cart Bridge"
Cohesion: 1.0
Nodes (2): Student Cart, Student Menu

### Community 43 - "Main Entry File"
Cohesion: 1.0
Nodes (0): 

### Community 44 - "Polyfills File"
Cohesion: 1.0
Nodes (0): 

### Community 45 - "Input Component File"
Cohesion: 1.0
Nodes (0): 

### Community 46 - "Kitchen Service File"
Cohesion: 1.0
Nodes (0): 

### Community 47 - "Rating Service File"
Cohesion: 1.0
Nodes (0): 

### Community 48 - "Test Service File"
Cohesion: 1.0
Nodes (0): 

### Community 49 - "Dummy Data File"
Cohesion: 1.0
Nodes (0): 

### Community 50 - "Polyfills Module"
Cohesion: 1.0
Nodes (1): Polyfills

### Community 51 - "Input Component"
Cohesion: 1.0
Nodes (1): Input

### Community 52 - "QR Scanner Modal"
Cohesion: 1.0
Nodes (1): QR Scanner Modal

### Community 53 - "Stat Card Component"
Cohesion: 1.0
Nodes (1): Stat Card

### Community 54 - "Analytics Hook"
Cohesion: 1.0
Nodes (1): useAnalytics

### Community 55 - "Debounce Hook"
Cohesion: 1.0
Nodes (1): useDebounce

### Community 56 - "Local Storage Utility"
Cohesion: 1.0
Nodes (1): useLocalStorage

### Community 57 - "Menu Data Hook"
Cohesion: 1.0
Nodes (1): useMenu

### Community 58 - "Orders Data Hook"
Cohesion: 1.0
Nodes (1): useOrders

### Community 59 - "Pagination Hook"
Cohesion: 1.0
Nodes (1): usePagination

### Community 60 - "Not Found Page"
Cohesion: 1.0
Nodes (1): Not Found page

### Community 61 - "Canteen Toggle Page"
Cohesion: 1.0
Nodes (1): Canteen Toggle

### Community 62 - "Test Service"
Cohesion: 1.0
Nodes (1): Test Service

### Community 63 - "Brand Logo"
Cohesion: 1.0
Nodes (1): Green Rounded-Square Logo

## Ambiguous Edges - Review These
- `Wallet Button` → `Blockchain Context`  [AMBIGUOUS]
  src/context/BlockchainContext.jsx · relation: semantically_similar_to

## Knowledge Gaps
- **31 isolated node(s):** `Main Entry`, `Polyfills`, `Input`, `Page Loader`, `QR Scanner Modal` (+26 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Badge Component`** (2 nodes): `Badge()`, `Badge.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Page Loader`** (2 nodes): `PageLoader()`, `PageLoader.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Pagination UI`** (2 nodes): `Pagination()`, `Pagination.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Rating Modal`** (2 nodes): `RatingModal()`, `RatingModal.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Star Rating`** (2 nodes): `StarRating.jsx`, `StarRating()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Stat Card`** (2 nodes): `StatCard.jsx`, `StatCard()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Wallet Button`** (2 nodes): `WalletButton.jsx`, `WalletButton()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Local Storage Hook`** (2 nodes): `useLocalStorage.js`, `useLocalStorage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Storage Constants`** (2 nodes): `getStoragePrefix()`, `constants.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Rating Experience`** (2 nodes): `Rating Modal`, `Star Rating`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Blockchain Wallet Bridge`** (2 nodes): `Blockchain Context`, `Wallet Button`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Theme Toggle Bridge`** (2 nodes): `Theme Context`, `Theme Toggle`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Student Cart Bridge`** (2 nodes): `Student Cart`, `Student Menu`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Main Entry File`** (1 nodes): `main.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Polyfills File`** (1 nodes): `polyfills.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Input Component File`** (1 nodes): `Input.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Kitchen Service File`** (1 nodes): `kitchenService.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Rating Service File`** (1 nodes): `ratingService.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Test Service File`** (1 nodes): `testService.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Dummy Data File`** (1 nodes): `dummyData.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Polyfills Module`** (1 nodes): `Polyfills`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Input Component`** (1 nodes): `Input`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `QR Scanner Modal`** (1 nodes): `QR Scanner Modal`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Stat Card Component`** (1 nodes): `Stat Card`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Analytics Hook`** (1 nodes): `useAnalytics`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Debounce Hook`** (1 nodes): `useDebounce`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Local Storage Utility`** (1 nodes): `useLocalStorage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Menu Data Hook`** (1 nodes): `useMenu`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Orders Data Hook`** (1 nodes): `useOrders`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Pagination Hook`** (1 nodes): `usePagination`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Not Found Page`** (1 nodes): `Not Found page`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Canteen Toggle Page`** (1 nodes): `Canteen Toggle`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Test Service`** (1 nodes): `Test Service`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Brand Logo`** (1 nodes): `Green Rounded-Square Logo`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Wallet Button` and `Blockchain Context`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **Why does `useAuth()` connect `Routing Access Control` to `Live Order Operations`, `Canteen Availability UI`, `Admin Menu Analytics`, `Cart Item Normalization`, `Auth State Management`?**
  _High betweenness centrality (0.127) - this node is a cross-community bridge._
- **Why does `normaliseCartItems()` connect `Cart Item Normalization` to `Checkout Cart Pipeline`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Are the 17 inferred relationships involving `useAuth()` (e.g. with `KitchenLayout()` and `Sidebar()`) actually correct?**
  _`useAuth()` has 17 INFERRED edges - model-reasoned connections that need verification._
- **Are the 10 inferred relationships involving `useCanteen()` (e.g. with `ChefLayout()` and `CanteenBanner()`) actually correct?**
  _`useCanteen()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Main Entry`, `Polyfills`, `Input` to the rest of the system?**
  _31 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Live Order Operations` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._