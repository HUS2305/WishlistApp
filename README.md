# WishlistApp

A modern wishlist application built with React Native (Expo) for iOS and Android, with a NestJS backend API.

## 🚀 Quick Start

### Test the UI Right Now (No Setup Required!)

```bash
# 1. Install dependencies
npm install

# 2. Start mobile app
npm run mobile:dev

# 3. Scan QR code with Expo Go app on your phone
```

See [QUICK_TEST.md](./QUICK_TEST.md) for the fastest way to test, or [SETUP.md](./SETUP.md) for full setup instructions.

### Full Setup (With Backend)

```bash
# Install dependencies
npm install

# Set up database (configure DATABASE_URL in services/backend/.env first)
npm run db:generate
npm run db:migrate

# Start development servers
npm run dev
```

## 📱 Features

### MVP Features
- ✅ User authentication (Clerk)
- ✅ Wishlist management (CRUD)
- ✅ Item management with priorities
- ✅ Friend system
- ✅ Privacy controls (Private, Friends-only, Public)
- ✅ Affiliate link tracking
- 🔄 Clipboard detection (in progress)
- 🔄 Photo capture (in progress)
- 🔄 Push notifications (in progress)

### Planned Features
- Web app (Next.js)
- Group gifting
- Comments and reservations
- Discovery feed
- Analytics dashboard

## 🏗️ Architecture

### Monorepo Structure
- **apps/mobile**: React Native + Expo app
- **apps/web**: Future Next.js web app
- **services/backend**: NestJS API
- **packages/database**: Prisma schema & migrations
- **packages/api-client**: Shared API client
- **packages/config**: Shared configurations

### Tech Stack
- **Mobile**: React Native, Expo, TypeScript, Expo Router, React Query, Zustand, NativeWind
- **Backend**: NestJS, Prisma, PostgreSQL, Clerk
- **DevOps**: Turborepo, GitHub Actions, Expo EAS

## 📚 Documentation

- [Quick Test Guide](./QUICK_TEST.md) - **Start here!** Fastest way to test the UI
- [Testing Guide](./TESTING.md) - Comprehensive testing instructions
- [Setup Guide](./SETUP.md) - Full development environment setup
- [Implementation Plan](./IMPLEMENTATION_PLAN.md) - Detailed implementation roadmap

## 🛠️ Development

```bash
# Run all services
npm run dev

# Run specific service
npm run mobile:dev
npm run backend:dev

# Database commands
npm run db:generate
npm run db:migrate
npm run db:studio

# Build
npm run build
```

## 📝 Project Status

**Phase 1: Foundation** ✅
- Monorepo structure
- Database schema
- Backend API structure
- Mobile app structure

**Phase 2: Core Features** 🔄
- Authentication flow
- Wishlist CRUD
- Item management
- Friend system

**Phase 3: Advanced Features** ⏳
- Clipboard detection
- Photo capture
- Notifications
- Affiliate redirect

## 🤝 Contributing

This is a private project. See the implementation plan for feature roadmap.

## 📄 License

Private - All rights reserved
