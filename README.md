# Drewbert - Community Overdose Response

[![Netlify Status](https://api.netlify.com/api/v1/badges/b48e1c8e-7556-4100-b82c-d07e5ddc5b0a/deploy-status)](https://app.netlify.com/projects/effervescent-sunshine-219a54/deploys)

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://buymeacoffee.com/drewbertapp)

A community-driven overdose detection and response system built for [Bolt's World's Largest Hackathon](https://worldslargesthackathon.devpost.com). This Progressive Web App (PWA) connects people in crisis with nearby trained responders and emergency services.

![Drewbert Mascot](public/drew_alien_transparent.png)

## 🎯 Built For

This project was created for [Bolt's World's Largest Hackathon](https://worldslargesthackathon.devpost.com) using [Bolt.new](https://bolt.new) - showcasing the power of AI-assisted development in building production-ready applications.

## 🌟 Features

- **Emergency Response System**: Quick access to emergency help with location-based alerts
- **Community Monitoring**: Buddy system for checking on friends and family
- **Real-time Dashboard**: Live alerts and response coordination for trained responders
- **Progressive Web App**: Install on any device for quick access
- **AI Chat Assistant**: 24/7 support and guidance powered by OpenAI
- **Secure**: Built with Supabase for authentication and real-time data

## 🚀 Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with custom design system
- **Backend**: Supabase (PostgreSQL + Real-time subscriptions)
- **PWA**: Service Worker with offline capabilities
- **AI**: OpenAI Assistant API
- **Maps**: Google Maps API integration
- **Deployment**: Netlify

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/Drewbert-2025.git
   cd Drewbert-2025
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Fill in your API keys in the `.env` file:
   - Supabase URL and Anon Key
   - Google Maps API Key
   - OpenAI API Key and Assistant ID
   - Geocoding API Key

4. **Start development server**
   ```bash
   npm run dev
   ```

## 📁 Project Structure

```
src/
├── components/           # React components
│   ├── LandingPage.tsx  # Main landing page
│   └── BoltBadge.tsx    # Hackathon attribution badge
├── App.tsx              # Main application component
├── main.tsx             # Application entry point
└── index.css            # Global styles with Tailwind

public/                  # Static assets
├── drew_alien_*.png     # Drewbert mascot images
├── manifest.json        # PWA manifest
└── *.png               # PWA icons

supabase/               # Database migrations and config
```

## 🎨 Design System

The project uses a custom design system built with Tailwind CSS featuring:

- **Primary Colors**: Neon blue palette (`#00d4ff`)
- **Accent Colors**: Orange palette (`#ff6b35`)
- **Alert Colors**: Coral palette for emergency contexts
- **Typography**: Space Grotesk and Manrope fonts
- **Animations**: Custom neon effects and gentle animations

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

### Key Configuration Files

- [`vite.config.ts`](vite.config.ts) - Vite configuration with PWA setup
- [`tailwind.config.js`](tailwind.config.js) - Custom design system
- [`tsconfig.json`](tsconfig.json) - TypeScript configuration

## 🐛 Debugging

For real-time features debugging, see [`REALTIME_DEBUG.md`](REALTIME_DEBUG.md) which includes:
- Console message patterns to look for
- Troubleshooting steps for subscription issues
- Manual testing procedures
- Performance optimization notes

## 🚨 Important Notes

**This is a demonstration version** built for the hackathon. Key points:

- No actual volunteer response network is active
- All emergency features are for demo purposes only
- **In real emergencies, always call 911 immediately**
- The platform showcases capabilities and user experience

## 🤝 Contributing

This project was built during a hackathon, but contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes following the existing code style
4. Test thoroughly
5. Submit a pull request

## 🏆 Hackathon Achievement

Built with [Bolt.new](https://bolt.new) for the [World's Largest Hackathon](https://worldslargesthackathon.devpost.com), demonstrating rapid prototyping and AI-assisted development capabilities.

## 📞 Support

- Check the AI chat assistant in the bottom right corner of the app
- Review debugging documentation in [`REALTIME_DEBUG.md`](REALTIME_DEBUG.md)
- Open an issue on GitHub for bugs or feature requests

---

**Remember: This is a demo application. In actual medical emergencies, always call 911 or your local emergency services immediately.**
