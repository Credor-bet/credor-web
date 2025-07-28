# Credor Web Application

A modern, responsive web version of the Credor betting/social platform built with Next.js 14, Supabase, and Tailwind CSS.

## Features

- 🔐 **Authentication**: Email/password and Google OAuth
- 💰 **Wallet Management**: Balance tracking and payment processing
- 🎯 **Betting System**: Create and manage bets with friends
- 👥 **Social Features**: Friend management and requests
- 📱 **Responsive Design**: Mobile-first with PWA capabilities
- ⚡ **Real-time Updates**: Live bet status and notifications

## Tech Stack

- **Frontend**: React 18 + Next.js 14 (App Router)
- **State Management**: Zustand
- **Styling**: Tailwind CSS + shadcn/ui components
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **Real-time**: Supabase Realtime subscriptions
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account and project

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd credor-web
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication routes
│   ├── (dashboard)/       # Protected dashboard routes
│   ├── auth/              # OAuth callback handlers
│   └── globals.css        # Global styles
├── components/
│   ├── ui/               # shadcn/ui components
│   └── layout/           # Layout components
├── lib/
│   ├── supabase.ts       # Supabase client
│   ├── store.ts          # Zustand stores
│   └── utils.ts          # Utility functions
└── types/                # TypeScript types
```

## Database Schema

The application uses Supabase with the following key tables:

- **users**: User profiles and statistics
- **wallets**: User wallet balances
- **bets**: Betting challenges and status
- **matches**: Sports matches and outcomes
- **friendships**: Friend relationships
- **transactions**: Payment history

## Development

### Adding New Components

Use shadcn/ui to add new components:
```bash
npx shadcn@latest add <component-name>
```

### State Management

The app uses Zustand for state management with separate stores for:
- Authentication (`useAuthStore`)
- Betting (`useBettingStore`)
- Friends (`useFriendsStore`)

### Styling

The app uses Tailwind CSS with shadcn/ui components. Custom styles can be added to `src/app/globals.css`.

## Deployment

The app is configured for deployment on Vercel:

1. Connect your repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.
