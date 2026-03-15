# SznPay - Digital Payment Platform

SznPay is a modern, comprehensive digital payment platform that enables lightning-fast payments, international transfers, and virtual card management. Built for modern businesses and designed for global reach.

## Features

- 💸 **Lightning Fast Transfers** - Send money instantly across multiple countries with advanced payment infrastructure
- 🔒 **Bank-Grade Security** - Military-grade encryption and multi-factor authentication
- 💳 **Virtual Cards** - Create Verve, Visa, and Mastercard virtual cards instantly for online payments
- 🌍 **Global Reach** - Send money to over 180 countries with competitive exchange rates
- 📊 **Multi-Currency Support** - Handle NGN, USD, EUR, GBP, CAD, AUD and more
- 📈 **Real-time Analytics** - Track your financial portfolio with live updates

## Technology Stack

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

All shadcn/ui components have been downloaded under `@/components/ui`.

## File Structure

- `index.html` - HTML entry point
- `vite.config.ts` - Vite configuration file
- `tailwind.config.js` - Tailwind CSS configuration file
- `package.json` - NPM dependencies and scripts
- `src/app.tsx` - Root component of the project
- `src/main.tsx` - Project entry point
- `src/index.css` - Existing CSS configuration
- `src/pages/Index.tsx` - Home page logic

## Components

- All shadcn/ui components are pre-downloaded and available at `@/components/ui`

## Styling

- Add global styles to `src/index.css` or create new CSS files as needed
- Use Tailwind classes for styling components

## Development

- Import components from `@/components/ui` in your React components
- Customize the UI by modifying the Tailwind configuration

## Note

- The `@/` path alias points to the `src/` directory
- In your typescript code, don't re-export types that you're already importing

# Commands

**Install Dependencies**

```shell
pnpm i
```

**Add Dependencies**

```shell
pnpm add some_new_dependency

**Start Preview**

```shell
pnpm run dev
```

**To build**

```shell
pnpm run build
```
