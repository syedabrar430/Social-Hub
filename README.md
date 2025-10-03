# SocialHub - Modern Social Media Platform

A full-stack social media platform with React.js frontend and FastAPI backend, featuring Google OAuth authentication and modern design.

## 🎨 Features

### Authentication & User Management
- **Email/Password Registration & Login** with validation
- **Google OAuth Integration** - Sign up/Login with Google
- **JWT Token Authentication** for secure API access
- **User Profile Management** with profile pictures from Google

### Frontend Features
- **Modern UI** with pastel design and smooth animations
- **Responsive Design** - Mobile-first approach
- **Feed System** - Social posts with interactions
- **Real-time Notifications** system
- **Chat/Messaging** interface
- **Profile Management** with edit capabilities

### Backend Features
- **FastAPI REST API** with automatic documentation
- **SQLite Database** with SQLAlchemy ORM
- **Password Hashing** with bcrypt
- **JWT Authentication** with refresh tokens
- **Google OAuth Verification** server-side
- **CORS Enabled** for frontend integration

## 🚀 Complete Setup Guide

### Prerequisites
- **Node.js** (16.x or higher)
- **Python** (3.8 or higher)
- **Git**
- **Google Cloud Console** account (for OAuth)

---

## 📋 Step 1: Project Setup

### 1.1 Clone the Repository
```bash
git clone <repository-url>
cd Social-Hub
```

### 1.2 Project Structure
```
Social-Hub/
├── src/                    # Frontend React app
├── backend/               # FastAPI backend
├── public/               # Static assets
├── .env.example         # Frontend environment template
├── backend/.env.example # Backend environment template
└── README.md           # This file
```

---

## 🔑 Step 2: Google OAuth Setup

### 2.1 Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** → **"New Project"**
3. Enter project name: **"Social Hub"**
4. Click **"Create"**

### 2.2 Enable Google Identity API
1. Go to **"APIs & Services"** → **"Library"**
2. Search for **"Google Identity"**
3. Click **"Enable"**

### 2.3 Configure OAuth Consent Screen
1. Go to **"APIs & Services"** → **"OAuth consent screen"**
2. Choose **"External"** → **"Create"**
3. Fill required fields:
   - **App name**: "Social Hub"
   - **User support email**: Your email
   - **Developer contact**: Your email
4. Click **"Save and Continue"** through all steps

### 2.4 Create OAuth Credentials
1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. Select **"Web application"**
4. Add **Authorized JavaScript origins**:
   ```
   http://localhost:8080
   http://localhost:5173
   http://localhost:3000
   ```
5. Click **"Create"**
6. **Copy the Client ID** - you'll need this!

---

## 🗄️ Step 3: Database Setup

The database will be automatically created when you first run the backend. No manual setup required!

- **Database**: SQLite (automatically created as `backend/social_hub.db`)
- **Tables**: Users table with Google OAuth support
- **Migrations**: Handled automatically by SQLAlchemy

---

## 🔧 Step 4: Environment Configuration

### 4.1 Frontend Environment Setup
```bash
# Copy the example file
cp .env.example .env
```

Edit `.env` and update:
```env
# Backend API URL
VITE_API_URL=http://localhost:8001

# Google OAuth Client ID (from Step 2.4)
VITE_GOOGLE_CLIENT_ID=your-actual-client-id-here.apps.googleusercontent.com
```

### 4.2 Backend Environment Setup
```bash
# Copy the example file
cp backend/.env.example backend/.env
```

Edit `backend/.env` and update:
```env
# JWT Secret - Generate a secure random string
SECRET_KEY=your-super-secret-jwt-key-here-make-it-very-long-and-random

# Database (SQLite file will be created automatically)
DATABASE_URL=sqlite:///./social_hub.db

# JWT expiration (in minutes)
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Google OAuth (from Step 2.4)
GOOGLE_CLIENT_ID=your-actual-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
```

---

## 🎯 Step 5: Backend Setup & Installation

### 5.1 Navigate to Backend Directory
```bash
cd backend
```

### 5.2 Create Python Virtual Environment
```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On Linux/Mac:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate
```

### 5.3 Install Python Dependencies
```bash
pip install -r requirements.txt
```

### 5.4 Start Backend Server
```bash
python main.py
```

✅ **Backend should now be running on**: `http://localhost:8001`
- API Documentation: `http://localhost:8001/docs`
- Health Check: `http://localhost:8001/health`

---

## 🎨 Step 6: Frontend Setup & Installation

### 6.1 Navigate to Project Root (open new terminal)
```bash
cd /path/to/Social-Hub
```

### 6.2 Install Node.js Dependencies
```bash
npm install
```

### 6.3 Start Frontend Development Server
```bash
npm run dev
```

✅ **Frontend should now be running on**: `http://localhost:8080`

---

## 🧪 Step 7: Testing the Application

### 7.1 Test Regular Authentication
1. Go to `http://localhost:8080/signup`
2. Fill in the signup form
3. Create account with email/password
4. Try logging in with created credentials

### 7.2 Test Google OAuth
1. Go to `http://localhost:8080/signup` or `http://localhost:8080/login`
2. Click **"Sign in with Google"** button
3. Complete Google OAuth flow
4. Verify you're redirected to the feed

### 7.3 Verify Database Storage
```bash
# Check users in database
sqlite3 backend/social_hub.db "SELECT * FROM users;"
```

---

## 📡 API Endpoints

### Authentication Endpoints
- `POST /auth/register` - Register with email/password
- `POST /auth/login` - Login with email/password
- `POST /auth/google` - Google OAuth authentication
- `GET /auth/me` - Get current user profile
- `POST /auth/logout` - Logout user

### Health & Info
- `GET /` - Welcome message
- `GET /health` - Health check
- `GET /docs` - Interactive API documentation

---

## 🛠 Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **shadcn/ui** component library
- **React Router** for navigation
- **Lucide React** for icons

### Backend
- **FastAPI** for REST API
- **SQLAlchemy** for ORM
- **SQLite** database
- **JWT** for authentication
- **Google OAuth** for social login
- **bcrypt** for password hashing
- **CORS** middleware enabled

### Authentication Flow
- **JWT Tokens** for session management
- **Google OAuth 2.0** integration
- **Password encryption** with bcrypt
- **Token-based API authentication**

---

## 🎨 Design Features

- **Pastel Color Scheme**: Modern, soft professional colors
- **Responsive Design**: Mobile-first approach
- **Smooth Animations**: CSS transitions and hover effects
- **Component Library**: Reusable UI components
- **Modern Typography**: Poppins font family

---

## 🔧 Development Scripts

### Frontend
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run linting
```

### Backend
```bash
python main.py              # Start development server
uvicorn main:app --reload   # Alternative start method
```

---

## 🚨 Troubleshooting

### Common Issues & Solutions

#### Google OAuth Errors
- **"OAuth client not found"**: Check Client ID in `.env` files
- **"Invalid origins"**: Add your domain to Google Console
- **"Token used too early"**: Sync system clock with NTP

#### Database Issues
- **"no such column"**: Delete `social_hub.db` and restart backend
- **Connection errors**: Check database permissions

#### CORS Issues
- **Frontend can't reach backend**: Verify backend is running on port 8001
- **CORS blocked**: Check CORS origins in `main.py`

#### Environment Variables
- **Variables not loading**: Restart development servers after changing `.env`
- **Missing variables**: Compare with `.env.example` files

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📞 Support

If you encounter any issues during setup:
1. Check the troubleshooting section above
2. Verify all environment variables are set correctly
3. Ensure both frontend and backend servers are running
4. Check browser console and terminal for error messages

Built with ❤️ using React.js, FastAPI, and modern web technologies