# 🍽️ Smart Canteen Management System (SCMS)

<p align="center">
  <b>A full-stack, real-time canteen automation system built with modern web technologies.</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Frontend-React%20(Vite)-blue?style=for-the-badge&logo=react"/>
  <img src="https://img.shields.io/badge/Backend-Spring%20Boot-green?style=for-the-badge&logo=springboot"/>
  <img src="https://img.shields.io/badge/Database-PostgreSQL-blue?style=for-the-badge&logo=postgresql"/>
  <img src="https://img.shields.io/badge/Deployment-Render-black?style=for-the-badge&logo=render"/>
</p>

---

## 🚀 Live Demo

🔗 **Frontend:** *Coming Soon*
🔗 **Backend API:** *Coming Soon*

---

## 📸 Preview

> Add screenshots or demo GIF here
> (Dashboard, Orders, Admin Panel, etc.)

---

## ✨ Features

### 👤 User

* 🔐 JWT Authentication & Authorization
* 📧 Email Verification (OTP-based)
* 🛒 Smart Cart & Checkout
* 💰 Wallet Integration
* 📦 Real-time Order Tracking

### 👨‍🍳 Kitchen / Manager

* 📋 View and manage all orders
* 🔄 Update order lifecycle
* ⚡ Real-time updates via WebSockets

### 🛠️ Admin

* 👥 User management (roles, activation)
* 🏪 Control canteen status (Open/Close)
* 📊 System monitoring

---

## 🏗️ System Architecture

```text
Frontend (React + Vite)
        ↓
 REST APIs + WebSocket (STOMP)
        ↓
Backend (Spring Boot)
        ↓
PostgreSQL Database
```

---

## 🧰 Tech Stack

| Layer      | Technology                   |
| ---------- | ---------------------------- |
| Frontend   | React (Vite), Tailwind CSS   |
| Backend    | Spring Boot, Spring Security |
| Realtime   | WebSocket (SockJS + STOMP)   |
| Database   | PostgreSQL                   |
| Deployment | Render                       |

---

## 📂 Project Structure

```bash
SCMS/
├── frontend/
│   ├── src/
│   ├── public/
│   ├── index.html
│   └── package.json
│
├── backend/
│   ├── src/
│   ├── pom.xml
│   └── application.properties
```

---

## ⚙️ Getting Started

### 🔹 Clone Repository

```bash
git clone https://github.com/Abhinav611a/Smart-Canteen-Management-System-SCMS-Frontend.git
cd Smart-Canteen-Management-System-SCMS-Frontend
```

### 🔹 Install Dependencies

```bash
npm install
```

### 🔹 Run Development Server

```bash
npm run dev
```

### 🔹 Build for Production

```bash
npm run build
```

---

## 🔑 Environment Variables

Create `.env` file:

```env
VITE_API_BASE_URL=https://your-backend-url.onrender.com
```

---

## 🚀 Deployment

### Frontend (Render Static Site)

```bash
Build Command: npm install && npm run build
Publish Directory: dist
```

### Backend (Render Web Service)

* Spring Boot deployed as Web Service
* REST + WebSocket enabled

---

## 🔌 API & Realtime Communication

* 📡 REST APIs via Axios
* ⚡ WebSocket using STOMP protocol
* 🔄 Live updates for order status

---

## 🧠 Advanced Concepts Used

* 🔐 Role-Based Access Control (RBAC)
* 🔄 Real-time system design
* ⚙️ Modular service architecture
* 📦 Context-based state management
* 🔁 WebSocket lifecycle handling
* 🚀 Optimized Vite build pipeline

---

## 🐛 Known Limitations

* ⏳ Free-tier backend may sleep (Render)
* 🌐 Initial API call delay possible

---

## 📈 Future Improvements

* 📱 Mobile app version
* 📊 Advanced analytics dashboard
* 💳 Payment gateway integration
* 🔔 Push notifications

---

## 🤝 Contributing

```bash
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push and create a Pull Request
```

---

## 📜 License

MIT License © 2026

---

## 👨‍💻 Author

**Abhinav Varshney**

* GitHub: https://github.com/Abhinav611a

---

## ⭐ Support

If you like this project, consider giving it a ⭐ on GitHub!

---
