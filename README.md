# Postbell Automation App 👋

**Postbell Automation App** is a cross-platform mobile and web application built with **Expo**, **React Native**, **Expo Router**, and **Gluestack UI (NativeWind)**. It provides complete automation management for social media posts, festival auto-posting calendars, customer setup workflows, subscription plans, user and role access management, and admin/customer dashboards.

---

## 🚀 Getting Started

### Prerequisites
- Node.js `v22.6.0` or higher (Recommended: `v22.12.0`)
- Expo CLI (`npx expo`)

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npx expo start
```

Or run directly on target platforms:

```bash
# Start Android dev build
npm run android

# Start iOS dev build
npm run ios

# Start Web dev build
npm run web
```

In the Expo output, you'll find options to open the app in:
- [Development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go)

---

## 📁 Project Folder Structure

```
app/
├── (auth)/                          # Authentication screens
│   ├── _layout.tsx                  # Auth layout
│   ├── login.tsx                    # Login screen
│   └── forgot-password.tsx          # Forgot password screen
├── (tabs)/                          # Main bottom navigation tabs
│   ├── _layout.tsx                  # Tabs layout
│   ├── index.tsx                    # Home tab
│   ├── posts.tsx                    # Posts management tab
│   ├── profile.tsx                  # Profile tab
│   └── menu.tsx                     # Menu tab
├── pages/                           # Feature pages & administration modules
│   ├── dashboard/                   # Admin Dashboard
│   ├── customerDashboard/           # Customer Dashboard
│   ├── customerGeneralSetting/      # Customer setup wizard & general settings
│   ├── festivalAutoPost/            # Festival auto-post & calendar view
│   ├── posts/                       # Post editor, details & management
│   ├── subscriptionPlans/           # Subscription plans management
│   ├── MySubscriptionPage/          # Active customer subscriptions
│   ├── customerSubscription/        # Customer subscriptions list
│   ├── userList/                    # User management & access control
│   ├── customers/                   # Customer listing & details
│   ├── roleList/                    # Role management & editor
│   ├── features/                    # Feature management & editor
│   ├── blogs/                       # Blog management & editor
│   ├── generalSetting/              # System general settings
│   ├── systemLogs/                  # System logs & audit history
│   └── contactUs/                   # Contact us support page
├── _layout.tsx                      # Root layout wrapper & theme providers
├── index.tsx                        # App entry point & auth router redirect
└── +not-found.tsx                   # 404 page

components/                          # Reusable UI & Layout Components
├── common/                          # Custom dialogs & shared widgets
│   └── StatusConfirmDialog.tsx      # Confirmation dialog component
├── ui/                              # Gluestack UI component library
│   ├── box/                         # Box container
│   ├── button/                      # Custom buttons
│   ├── card/                        # Cards & containers
│   ├── modal/                       # Modal dialogs
│   ├── table/                       # Data table components
│   └── ...                          # Input, Select, Toast, Drawer, Spinner, etc.
├── GlobalTabBar.tsx                 # Custom floating tab bar navigation
└── HtmlTable.tsx                    # Dynamic HTML table renderer

context/                             # State Management & Providers
├── AuthContext.tsx                  # Authentication context state
├── AuthProvider.tsx                 # Auth provider component
└── ThemeContext.tsx                 # Theme context provider

services/                            # Network & Services
└── api.ts                           # Centralized API service & HTTP client

utils/                               # Helper Utilities
└── storage.ts                       # Local storage utility (AsyncStorage wrapper)

assets/                              # Static Assets
└── images/                          # Logos, icons & app graphics
```

---

## 🛠 Available Scripts

In the project directory, you can run:

| Command | Description |
| :--- | :--- |
| `npm start` | Starts the Expo development server |
| `npm run android` | Runs the app on an Android emulator/device |
| `npm run ios` | Runs the app on an iOS simulator/device |
| `npm run web` | Runs the app in a web browser |
| `npm run lint` | Runs ESLint to check for code issues |
| `npm run lint:fix` | Automatically fixes ESLint errors |
| `npm run prettier` | Formats codebase using Prettier |
| `npm run build:web` | Exports production build for web |
| `npm run build:android` | Builds production Android APK/AAB locally |

---

## 📚 Learn More

To learn more about the tech stack used in this project:

- [Expo Documentation](https://docs.expo.dev/)
- [Expo Router Guide](https://docs.expo.dev/router/introduction)
- [Gluestack UI Docs](https://gluestack.io/)
- [React Native Documentation](https://reactnative.dev/)
