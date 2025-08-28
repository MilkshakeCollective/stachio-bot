# 🥤 Milkshake Collective – Bot Template

A modern and customizable **Discord bot template** built and maintained by the Milkshake Collective.  
This template is designed in **TypeScript** with a focus on scalability, maintainability, and best practices.

---

## ✨ Features

- 📦 Modular **command & event system**
- 🛢 **Prisma ORM** for database management
- 🚀 **Turborepo** for monorepo setup and scalability
- ⚡ **TypeScript** with full type-safety
- 🔒 Role-based permission utilities
- 🛠 Dev-tools: **dotenv, prettier, pino**
- 🤖 Powered by **discord.js**

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/MilkshakeCollective/bot-template.git
cd bot-template
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Rename `.env.template` to `.env` file in the root directory and configure your environment variables:

```
# Discord bot credentials
CLIENT_TOKEN="YOUR_DISCORD_CLIENT_TOKEN"
CLIENT_ID="YOUR_DISCORD_CLIENT_ID"
CLIENT_SECRET="YOUR_DISCORD_CLIENT_SECRET"

# Crash handler
ENABLE_CRASH_HANDLER=true
ENABLE_CRASH_WEBHOOK=true
EXIT_ON_CRASH=false
CRASH_HANDLER_WEBHOOK="YOUR_CRASH_HANDLER_WEBHOOK_URL"

# Channels
WEEKLY_REPORT_CHANNEL_ID="YOUR_WEEKLY_REPORT_CHANNEL_ID"
APPEAL_LOG_CHANNEL_ID="YOUR_APPEAL_LOG_CHANNEL_ID"

# Database URLs
DATABASE_URL="YOUR_PRISMA_DATABASE_URL"
DIRECT_DATABASE_URL="mysql://USERNAME:PASSWORD@HOST:PORT/DATABASE_NAME"
```

### 4. Build the bot.

```bash
npm run build
```

### 5. Generate Prisma Client

```bash
npm run prisma
```

### 6. Run the bot

```bash
npm run start-bot
```

---

## 🤝 Contributing

We welcome contributions from the community!
Feel free to open issues, suggest features, or submit pull requests.

---

## 📌 Links

- 💬 **Community**: [Join our Discord](https://discord.gg/wSAkewmzAM)
- 🔗 **GitHub**: [Milkshake Collective](https://github.com/MilkshakeCollective)
- ☕ **Support us**: [Ko-Fi](https://ko-fi.com/duckodas)

---

## 📜 License

This project is licensed under the [GPL-3.0 License](LICENSE).
