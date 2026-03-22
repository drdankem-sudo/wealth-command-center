# Wealth Command Center

A personal wealth management dashboard built with Next.js 16, Supabase, and live market APIs. Track assets, liabilities, portfolio health, and forecast your financial independence — all in one place.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Quick Start](#quick-start)
3. [Environment Variables](#environment-variables)
4. [Database Setup (Supabase)](#database-setup-supabase)
5. [Feature Guide](#feature-guide)
   - [Dashboard (Home)](#dashboard-home)
   - [Market Intelligence](#market-intelligence-markets)
6. [Asset Classes](#asset-classes)
7. [Liabilities System](#liabilities-system)
8. [API Integrations](#api-integrations)
9. [The Pricing Engine](#the-pricing-engine)
10. [Appreciation & Depreciation Engine](#appreciation--depreciation-engine)
11. [Yield & Income Tracking](#yield--income-tracking)
12. [Escape Velocity Forecaster (Monte Carlo)](#escape-velocity-forecaster-monte-carlo)
13. [Portfolio Analytics](#portfolio-analytics)
14. [Rebalancing Alerts](#rebalancing-alerts)
15. [Currency Toggle (USD/KES)](#currency-toggle-usdkes)
16. [Cron Job (Daily Sync)](#cron-job-daily-sync)
17. [Security](#security)
18. [Project Structure](#project-structure)
19. [Deployment](#deployment)
20. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js 16 App Router                │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │
│  │  page.tsx │  │ markets/ │  │   /api/update-prices │  │
│  │ (Server)  │  │ page.tsx │  │      (Cron Job)      │  │
│  └────┬─────┘  └────┬─────┘  └──────────┬───────────┘  │
│       │              │                    │              │
│  ┌────▼──────────────▼────────────────────▼───────────┐ │
│  │              Client Components                      │ │
│  │  MetricCards · Charts · Ledgers · EscapeVelocity   │ │
│  │  PortfolioAnalytics · RebalancingAlerts · LiveTicker│ │
│  │  FearGreedGauge · NewsFeed · EarningsCalendar ...  │ │
│  └────────────────────┬───────────────────────────────┘ │
│                       │                                  │
│  ┌────────────────────▼───────────────────────────────┐ │
│  │            CurrencyProvider (React Context)         │ │
│  │      Wraps entire dashboard — USD/KES toggle        │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                  ▼
   ┌──────────┐    ┌─────────────┐    ┌──────────────┐
   │ Supabase │    │  Finnhub    │    │  CoinGecko   │
   │ (Auth +  │    │  goldapi.io │    │  ExchangeRate│
   │  Postgres│    │  Treasury   │    │  RapidAPI    │
   │  + RLS)  │    │  CNN F&G    │    │  Commodities │
   └──────────┘    └─────────────┘    └──────────────┘
```

**Tech stack:**
- **Framework:** Next.js 16 (App Router, Server Components, Server Actions, Turbopack)
- **Database:** Supabase (PostgreSQL + Auth + Row Level Security)
- **Charts:** Recharts (Area, Pie, Bar charts)
- **Validation:** Zod schemas on all server actions
- **Styling:** Tailwind CSS (dark theme, slate palette)
- **Icons:** Lucide React
- **Auth:** Supabase email/password + optional MFA (TOTP)

---

## Quick Start

```bash
# 1. Clone and install
git clone <your-repo-url>
cd wealth-dashboard
npm install

# 2. Set up environment variables (see next section)
cp .env.local.example .env.local
# Fill in your keys

# 3. Run the Supabase SQL migrations (see Database Setup)

# 4. Start development server
npm run dev

# 5. Open http://localhost:3000
```

---

## Environment Variables

Create a `.env.local` file in the project root:

```bash
# ─── SUPABASE (Required) ───
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJ...              # Service role key (for cron job, bypasses RLS)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...     # Anon/public key

# ─── MARKET APIs ───
FINNHUB_API_KEY=your_finnhub_key         # Free at finnhub.io — US stocks, news, earnings
GOLD_API_KEY=your_goldapi_key            # Free tier at goldapi.io — Gold spot price
RAPIDAPI_KEY=your_rapidapi_key           # For NSE Kenya stocks via RapidAPI
COMMODITIES_API_KEY=your_key             # commodities-api.com — commodity prices

# ─── SECURITY ───
CRON_SECRET=a-long-random-string         # Protects /api/update-prices endpoint
```

| Variable | Required | Free Tier | What it does |
|----------|----------|-----------|--------------|
| `SUPABASE_URL` | Yes | Yes | Database connection |
| `SUPABASE_SERVICE_KEY` | Yes | Yes | Bypasses RLS for cron job |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Yes | Client-side auth |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Yes | Client-side auth |
| `FINNHUB_API_KEY` | Yes | Yes (60 calls/min) | US stock prices, dividends, news, earnings |
| `GOLD_API_KEY` | Optional | Yes (limited) | Gold spot price in USD/oz |
| `RAPIDAPI_KEY` | Optional | Varies | NSE Kenya stock prices |
| `COMMODITIES_API_KEY` | Optional | Yes (limited) | Commodity prices |
| `CRON_SECRET` | Yes | N/A | Bearer token for cron endpoint |

---

## Database Setup (Supabase)

You need **3 tables** in your Supabase project. The `assets` and `net_worth_history` tables should already exist if you bootstrapped the project. Run the following in **Supabase Dashboard → SQL Editor**:

### Step 1: Create the Liabilities Table

```sql
CREATE TABLE IF NOT EXISTS public.liabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  liability_type TEXT NOT NULL,
  balance NUMERIC DEFAULT 0,
  interest_rate NUMERIC DEFAULT 0,
  monthly_payment NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.liabilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own liabilities"
  ON public.liabilities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own liabilities"
  ON public.liabilities FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own liabilities"
  ON public.liabilities FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own liabilities"
  ON public.liabilities FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_liabilities_user_id ON public.liabilities(user_id);
```

### Step 2: Add Extended Asset Columns

```sql
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS annual_growth_rate NUMERIC DEFAULT 0;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS annual_yield NUMERIC DEFAULT 0;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS pending_yield_cash NUMERIC DEFAULT 0;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS target_allocation NUMERIC DEFAULT 0;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS monthly_income NUMERIC DEFAULT 0;
```

### Expected Table Schemas

**`assets`** — Your wealth items:
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key → auth.users |
| name | TEXT | Display name |
| asset_class | TEXT | One of the 14 supported classes |
| ticker_symbol | TEXT | Nullable — for live-priced assets |
| shares | NUMERIC | Number of shares/units/oz |
| balance | NUMERIC | Current value in USD |
| annual_growth_rate | NUMERIC | % per year (negative = depreciation) |
| annual_yield | NUMERIC | Dividend/interest yield % |
| pending_yield_cash | NUMERIC | Accrued but uncollected yield |
| target_allocation | NUMERIC | Target portfolio % (for rebalancing) |
| monthly_income | NUMERIC | Fixed monthly income (e.g., startup distributions) |

**`liabilities`** — Your debts:
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key → auth.users |
| name | TEXT | e.g., "Chase Sapphire" |
| liability_type | TEXT | Mortgage, Car Loan, Credit Card, Student Loan, Personal Loan, Other |
| balance | NUMERIC | Outstanding balance |
| interest_rate | NUMERIC | Annual APR % |
| monthly_payment | NUMERIC | Your monthly payment amount |

**`net_worth_history`** — Daily snapshots:
| Column | Type | Notes |
|--------|------|-------|
| user_id | UUID | Foreign key → auth.users |
| recorded_date | DATE | One record per user per day |
| net_worth | NUMERIC | Total assets minus total liabilities |

**`live_prices`** — Cached market prices:
| Column | Type | Notes |
|--------|------|-------|
| ticker_symbol | TEXT | Primary key (e.g., "BTC") |
| current_price | NUMERIC | Latest price |
| last_updated | TIMESTAMPTZ | When it was last refreshed |

---

## Feature Guide

### Dashboard (Home)

The main dashboard at `/` is a server component that fetches all your data and renders:

#### 1. Live Ticker Bar
A scrolling horizontal ticker at the top showing real-time prices for SPY, BTC, ETH, gold, and KES/USD exchange rate. Updates on page load.

#### 2. Metric Cards
Top-level summary cards showing:
- **Net Worth** — Total assets minus total liabilities
- **BTC Price** — Live Bitcoin price from the `live_prices` table
- **Annual Yield Income** — Sum of `(balance × annual_yield%)` + `(monthly_income × 12)` across all assets
- **Fixed Assets** — Total value of illiquid holdings (real estate, farms, VC funds, bonds, gold, etc.)
- **Total Liabilities** — Sum of all debt balances (only shows if you have liabilities)
- **Depreciating Assets** — Total value of assets with negative growth rates (vehicles, equipment)

All values respect the USD/KES currency toggle.

#### 3. Charts Section
- **Net Worth History** — Area chart of your net worth over time (from `net_worth_history` table)
- **Asset Allocation** — Donut/pie chart by asset class
- **Actual vs Target** — Grouped bar chart comparing your actual allocation % to your target % per asset class

#### 4. Add Asset / Add Liability Forms
Side panel with forms to add new assets or liabilities. Smart forms that change fields based on asset class:
- **Securities/Crypto/NSE:** Shows ticker + shares fields, auto-fetches price
- **Gold:** Shows weight (troy oz) field, auto-fetches gold spot price
- **Startup Equity:** Shows monthly income field
- **Vehicle/Equipment:** Shows depreciation rate (pre-filled with defaults)
- **All classes:** Optional target allocation % and yield %

#### 5. Portfolio Analytics
Comprehensive portfolio health panel (see [Portfolio Analytics](#portfolio-analytics) section).

#### 6. Rebalancing Alerts
Drift detection with buy/sell recommendations (see [Rebalancing Alerts](#rebalancing-alerts) section).

#### 7. Escape Velocity Forecaster
Monte Carlo simulation projecting when passive income exceeds expenses (see [Escape Velocity](#escape-velocity-forecaster-monte-carlo) section).

#### 8. Asset Ledger
Full table of all assets with columns: Name, Class, Ticker, Shares, Balance, Growth %, Yield %, Monthly Income, and action buttons. Currency-aware. Responsive — hides less important columns on mobile.

#### 9. Liability Ledger
Full table of all liabilities grouped by type with columns: Name, Type, Balance, APR, Monthly Payment, Annual Interest Cost, Estimated Payoff Date, and action buttons. Payoff date uses amortization math.

#### 10. Vault Security
MFA enrollment section at the bottom. Supports TOTP (Google Authenticator, Authy, etc.).

---

### Market Intelligence (`/markets`)

A separate page dedicated to market analysis. Accessible via the "Markets" link in the header.

#### Fear & Greed Gauges
- **CNN Fear & Greed Index** — Overall market sentiment (0-100 scale)
- **Crypto Fear & Greed** — Crypto-specific sentiment from Alternative.me
- Visual gauges with color coding (Extreme Fear → Extreme Greed)

#### Treasury Rates
US Treasury bill, note, and bond average rates from the Treasury.gov fiscal data API. Falls back to treasury ETF prices (SHY, IEF, TLT) if the primary API is unavailable.

#### News Feed
Personalized financial news based on your portfolio tickers. Powered by Finnhub's company news API.

#### Company Profile
Look up any stock's key metrics, financial ratios, and company info. Pre-populated with your portfolio tickers.

#### Earnings Calendar
Upcoming and recent earnings reports for companies in your portfolio. Shows EPS estimates vs actuals.

#### Economic Calendar
Federal Reserve meetings, CPI releases, GDP reports, unemployment data, and other key macro events. Highlights important events and shows beat/miss coloring.

---

## Asset Classes

The system supports 14 asset classes, each with different behavior:

### Live-Priced (Auto-updated via APIs)

| Class | Pricing Source | Auto-Yield | Notes |
|-------|---------------|------------|-------|
| **Securities** | Finnhub (US stocks) | Yes — dividend yield fetched automatically | Ticker + shares required |
| **Crypto** | CoinGecko | No | Supports BTC, ETH, SOL, and any CoinGecko coin ID |
| **NSE Equities** | RapidAPI NSE | No | Nairobi Stock Exchange, KES pricing |
| **Gold** | goldapi.io | No | Enter weight in troy ounces |
| **Commodities** | commodities-api.com | No | Ticker + shares required |

### Manually Valued (Growth/depreciation via engine)

| Class | Default Growth | Typical Use |
|-------|---------------|-------------|
| **Real estate** | Set your own % | Property, land |
| **Farm/ranch** | Set your own % | Agricultural holdings |
| **VC fund** | Set your own % | Venture capital investments |
| **Startup Equity** | Set your own % | Private company equity; supports monthly income |
| **Bonds/Tbills** | Set your own % | Fixed income (use yield field for coupon rate) |
| **Sacco/MMF** | Set your own % | Savings cooperatives, money market funds |
| **Cash** | 0% | Bank accounts, emergency fund |

### Depreciating

| Class | Default Rate | Notes |
|-------|-------------|-------|
| **Vehicle** | -15%/year | Cars, motorcycles, boats |
| **Equipment** | -25%/year | Computers, machinery, tools |

You can override the default depreciation rate when adding an asset.

---

## Liabilities System

Track mortgages, loans, credit cards, and any other debts.

**Supported types:** Mortgage, Car Loan, Credit Card, Student Loan, Personal Loan, Other

**How it works:**
1. Add a liability with name, type, current balance, APR (interest rate), and monthly payment
2. The daily cron job accrues interest: `balance += balance × (APR / 100) / 365`
3. The liability ledger calculates an estimated payoff date using amortization math
4. Total liabilities are subtracted from total assets to compute net worth
5. Daily net worth snapshots (assets - liabilities) are saved to `net_worth_history`

**Security:** All liability operations (add/delete/update) verify `user_id` ownership. Zod validates all inputs.

---

## API Integrations

### Finnhub (`FINNHUB_API_KEY`)
- **Stock quotes:** `GET /api/v1/quote?symbol=AAPL` — Real-time US stock prices
- **Dividend yield:** `GET /api/v1/stock/metric?symbol=AAPL&metric=all` — Auto-populates `annual_yield`
- **Company news:** `GET /api/v1/company-news` — Personalized news feed
- **Earnings calendar:** `GET /api/v1/calendar/earnings` — Upcoming/recent earnings
- **Economic calendar:** `GET /api/v1/calendar/economic` — Fed meetings, CPI, GDP, etc.
- **Company profile:** `GET /api/v1/stock/profile2` + `/stock/metric` — Key company metrics
- **Free tier:** 60 API calls/minute

### CoinGecko (No key needed)
- **Crypto prices:** `GET /api/v3/simple/price?ids=bitcoin&vs_currencies=usd`
- Supports any coin ID (bitcoin, ethereum, solana, etc.)
- Rate limited but generous free tier

### goldapi.io (`GOLD_API_KEY`)
- **Gold spot price:** `GET /api/XAU/USD`
- Returns price per troy ounce
- Free tier: ~300 calls/month

### ExchangeRate-API (No key needed)
- **FX rates:** `GET /api/v4/latest/USD`
- Used for USD → KES conversion
- Cached server-side for 1 hour (`{ next: { revalidate: 3600 } }`)

### US Treasury (No key needed)
- **Treasury rates:** `GET /services/api/fiscal_service/v2/accounting/od/avg_interest_rates`
- Average interest rates for bills, notes, and bonds
- Free, no authentication required

### CNN Fear & Greed (No key needed)
- Fetched via proxy route `/api/markets?type=fear-greed`
- Returns 0-100 index with classification

### Alternative.me Crypto Fear & Greed (No key needed)
- `GET https://api.alternative.me/fng/`
- Returns 0-100 crypto sentiment index

### RapidAPI NSE Kenya (`RAPIDAPI_KEY`)
- **NSE stock prices:** Via `nairobi-stock-exchange-nse.p.rapidapi.com`
- Real-time Nairobi Stock Exchange prices

### Commodities API (`COMMODITIES_API_KEY`)
- **Commodity prices:** `GET /api/latest?base=USD&symbols=TICKER`
- Supports various commodity tickers

---

## The Pricing Engine

When you **add an asset**, the system prices it automatically based on asset class:

```
addAsset() →
  ├─ Securities?  → fetchFinnhub(ticker) → price × shares = balance
  │                  Also fetches dividend yield automatically
  ├─ Crypto?      → fetchCrypto(ticker)  → price × shares = balance
  ├─ NSE Equities? → fetchNSE(ticker)    → price × shares = balance
  ├─ Gold?        → fetchGold()          → gold_price × troy_oz = balance
  └─ Other?       → Use manually entered balance
```

**Consolidation:** If you add shares of a stock you already own (same ticker), the system consolidates — it adds the new shares to your existing position and recalculates the balance. No duplicates.

---

## Appreciation & Depreciation Engine

The daily cron job (`/api/update-prices`) handles both appreciation and depreciation using a single engine:

```
For each asset NOT already live-priced today:
  1. Apply daily compound growth:
     balance *= (1 + annual_growth_rate/100) ^ (1/365)

  2. If growth rate is negative (depreciation):
     Same formula naturally shrinks the balance
     Floor at $0 (can't go negative)

  3. Accrue daily yield (if annual_yield > 0):
     pending_yield_cash += balance × (annual_yield/100) / 365
```

**Key point:** Live-priced assets (stocks, crypto, gold) skip the appreciation engine because their price is already determined by the market. The engine only runs on manually-valued assets.

**Examples:**
- Real estate at +8%/year: $500,000 → grows ~$109/day
- Vehicle at -15%/year: $30,000 → loses ~$12/day
- Bonds at +5% growth, 4% yield: Balance grows AND accrues yield separately

---

## Yield & Income Tracking

The system tracks passive income from two sources:

### 1. Yield-Based Income
Calculated as `balance × annual_yield / 100` for each asset. The `annual_yield` field is:
- **Auto-populated** for Securities (fetched from Finnhub's dividend data)
- **Manually entered** for everything else (bond coupon rates, rental yield %, etc.)

### 2. Monthly Income
A fixed `monthly_income` field for assets that generate regular cash flow:
- **Startup Equity:** Variable monthly distributions
- **Real Estate:** Rental income
- **Farm/ranch:** Agricultural revenue

### Total Passive Income
`Annual Yield Income = Σ(balance × yield%) + Σ(monthly_income × 12)`

This total is displayed on the dashboard metric card and used in the Escape Velocity forecaster.

---

## Escape Velocity Forecaster (Monte Carlo)

The crown jewel — a simulation-based projection of when your passive income will exceed your living expenses.

### How It Works

1. **Runs 1,000 Monte Carlo simulations** using your actual portfolio data
2. Each simulation projects 25 years into the future
3. Uses **Box-Muller transform** to generate normally distributed random returns
4. Each year in each simulation:
   - Actual growth = `normalRandom(weightedGrowthRate, volatility)`
   - Net worth grows by the random return
   - Passive income (yield) is added
   - Annual expenses are subtracted
5. Results are aggregated into percentile bands: P10, P25, P50, P75, P90

### Interactive Controls
- **Monthly Expenses slider:** $1,000 – $50,000 (this is your lifestyle cost)
- **Volatility slider:** 5% – 30% (market uncertainty)
- **View toggle:** Net Worth projection vs Passive Income projection

### The Escape Point
When the **P50 (median) passive income** line crosses above your **annual expenses** line — that's your escape velocity date. The year when, statistically, you're financially independent.

### Chart Elements
- **Shaded fan chart** showing P10-P90 range (wider = more uncertainty)
- **Bold median line** (P50)
- **Red dashed line** — Your annual expense threshold
- **Green "ESCAPE" reference line** — The crossover point

### Data Inputs (from your portfolio)
- Starting net worth = total assets - total liabilities
- Weighted growth rate = asset-weighted average of all `annual_growth_rate` values
- Weighted yield rate = asset-weighted average of all `annual_yield` values
- Annual yield income = actual computed passive income

---

## Portfolio Analytics

Real-time health metrics for your portfolio:

### Metrics Calculated

| Metric | Formula | What It Means |
|--------|---------|---------------|
| **Annual Return** | Average period-over-period return × 365 | Your annualized portfolio growth rate |
| **Volatility** | σ of returns × √365 | How much your portfolio value swings |
| **Sharpe Ratio** | (Return - 4.5%) / Volatility | Risk-adjusted return (higher = better) |
| **Diversification Score** | (1 - Herfindahl Index) × 100 | How spread out your holdings are |

### Sharpe Ratio Interpretation
- **> 1.0:** Excellent risk-adjusted returns
- **0.5 – 1.0:** Good
- **0 – 0.5:** OK
- **< 0:** Negative (losing money relative to risk-free rate)

### Diversification Score
Uses the **Herfindahl-Hirschman Index** — the sum of squared sector weights. A score of:
- **> 70%:** Well diversified
- **40-70%:** Moderate concentration
- **< 40%:** Highly concentrated (risky)

### Visual Elements
- **Sector pie chart** with color-coded segments
- **Allocation detail** list with percentages and dollar amounts
- **Income source breakdown** — yield vs monthly income

---

## Rebalancing Alerts

Monitors the drift between your actual portfolio allocation and your target allocation.

### How It Works
1. For each asset class, compute: `actual% = (class_balance / total_net_worth) × 100`
2. Compare to your `target_allocation` setting
3. `drift = actual% - target%`
4. If `|drift| > 5%` (configurable threshold), trigger an alert

### Alert Actions
- **Drift > +5%:** "Sell" suggestion — you're overweight in this class
- **Drift < -5%:** "Buy" suggestion — you're underweight in this class
- **|Drift| ≤ 5%:** "OK" — within tolerance

### Visual Elements
- Progress bar showing actual allocation with white target marker
- Color coding: Green (buy), Red (sell), Neutral (OK)
- Dollar amount needed to rebalance: `adjust = |drift / 100| × total_net_worth`

### Setting Targets
Add `target_allocation` when creating/editing an asset. The total of all targets should sum to 100%, but the system works even if they don't.

---

## Currency Toggle (USD/KES)

A global currency toggle that converts ALL dashboard values between US Dollars and Kenyan Shillings.

### How It Works
1. **Server-side:** The KES exchange rate is fetched from ExchangeRate-API on page load (cached 1 hour)
2. **Client-side:** `CurrencyProvider` wraps the entire dashboard with React Context
3. Every component calls `useCurrency()` to get the `format()` function
4. `format(usdAmount)` automatically converts and formats based on current currency selection
5. Toggle persists in component state (resets on page reload)

### Format Function
```typescript
format(amount: number, opts?: { compact?: boolean }) => string
// format(50000)                → "$50,000" or "KES 6,500,000"
// format(1500000, {compact:true}) → "$1.5M" or "KES 195.0M"
```

The toggle button appears in the MetricCards section of the dashboard.

---

## Cron Job (Daily Sync)

The `/api/update-prices` endpoint runs daily at midnight (configured via `vercel.json`).

### What It Does (In Order)

| Step | Action | API Used |
|------|--------|----------|
| 1 | Update crypto prices | CoinGecko |
| 2 | Update US stock prices + dividend yields | Finnhub |
| 3 | Update NSE Kenya stock prices | RapidAPI |
| 4 | Update gold prices | goldapi.io |
| 5 | Update commodity prices | Commodities API |
| 6 | Run appreciation/depreciation engine | Internal math |
| 7 | Accrue daily interest on liabilities | Internal math |
| 8 | Record net worth snapshot | Insert to net_worth_history |

### Security
Protected by `CRON_SECRET` bearer token. The endpoint checks:
```
Authorization: Bearer <CRON_SECRET>
```
Returns 401 if the token doesn't match. Vercel's cron system automatically sends this header.

### Manual Trigger
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-domain.com/api/update-prices
```

---

## Security

### Authentication
- Supabase Auth with email/password
- Optional MFA via TOTP (Google Authenticator, Authy)
- All server actions verify `auth.getUser()` before any database operation

### Row Level Security (RLS)
Every table has RLS policies ensuring users can only access their own data:
```sql
USING (auth.uid() = user_id)
```

### Input Validation
All server actions use **Zod schemas** to validate:
- Asset names (1-100 chars)
- Asset classes (enum whitelist)
- Ticker symbols (regex: `^[A-Z0-9._-]{1,12}$`)
- Numeric ranges (balance 0-100B, yield 0-100%, etc.)
- UUIDs for delete/update operations

### Ownership Checks
Delete and update operations always scope queries by `user_id`:
```sql
.eq('id', id).eq('user_id', user.id)
```

### API Key Protection
- All API keys are server-side only (no `NEXT_PUBLIC_` prefix)
- Market data components use proxy routes (`/api/ticker`, `/api/markets`) to avoid exposing keys to the browser
- Finnhub API key sent via `X-Finnhub-Token` header (not URL params)

### ISR (Incremental Static Regeneration)
- Dashboard: `revalidate = 30` seconds
- Markets page: `revalidate = 60` seconds
- Exchange rate: cached 1 hour server-side

---

## Project Structure

```
wealth-dashboard/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Main dashboard (server component)
│   │   ├── actions.ts                  # Asset server actions (add/delete/update)
│   │   ├── liability-actions.ts        # Liability server actions
│   │   ├── layout.tsx                  # Root layout
│   │   ├── login/
│   │   │   └── page.tsx                # Login page
│   │   ├── settings/
│   │   │   └── page.tsx                # Settings page
│   │   ├── markets/
│   │   │   └── page.tsx                # Market Intelligence page
│   │   └── api/
│   │       ├── update-prices/
│   │       │   └── route.ts            # Daily cron job
│   │       ├── ticker/
│   │       │   └── route.ts            # Finnhub proxy for client components
│   │       └── markets/
│   │           └── route.ts            # Market data proxy (news, earnings, etc.)
│   ├── components/
│   │   ├── CurrencyProvider.tsx        # USD/KES context provider
│   │   ├── MetricCards.tsx             # Dashboard summary cards
│   │   ├── DashboardCharts.tsx         # Net worth, allocation, target charts
│   │   ├── AddAssetForm.tsx            # Smart asset creation form
│   │   ├── AddLiabilityForm.tsx        # Liability creation form
│   │   ├── AssetLedger.tsx             # Full asset table with CRUD
│   │   ├── LiabilityLedger.tsx         # Full liability table with CRUD
│   │   ├── EscapeVelocity.tsx          # Monte Carlo forecaster
│   │   ├── PortfolioAnalytics.tsx      # Sharpe, volatility, diversification
│   │   ├── RebalancingAlerts.tsx       # Drift detection & suggestions
│   │   ├── LiveTicker.tsx              # Scrolling price ticker bar
│   │   ├── LogoutButton.tsx            # Auth logout
│   │   ├── MfaEnroll.tsx               # TOTP MFA setup
│   │   └── markets/
│   │       ├── FearGreedGauge.tsx       # CNN + Crypto fear & greed
│   │       ├── TreasuryRates.tsx        # US Treasury yield display
│   │       ├── NewsFeed.tsx             # Personalized financial news
│   │       ├── CompanyProfile.tsx       # Stock company lookup
│   │       ├── EarningsCalendar.tsx     # Upcoming/recent earnings
│   │       └── EconomicCalendar.tsx     # Fed, CPI, GDP events
│   ├── utils/
│   │   ├── supabase-server.ts          # Server-side Supabase client
│   │   └── supabase-browser.ts         # Client-side Supabase client
│   └── middleware.ts                   # Auth middleware
├── supabase-liabilities.sql            # Database migration script
├── vercel.json                         # Cron schedule config
├── .env.local                          # Environment variables (not committed)
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.ts
```

---

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Connect repo to Vercel
3. Add all environment variables in Vercel dashboard
4. The cron job is configured in `vercel.json`:
   ```json
   {
     "crons": [{
       "path": "/api/update-prices",
       "schedule": "0 0 * * *"
     }]
   }
   ```
   This runs daily at midnight UTC. Vercel automatically sends the `CRON_SECRET` as a bearer token.

### Build

```bash
npm run build    # Production build
npm run start    # Start production server
npm run dev      # Development with Turbopack
npm run lint     # ESLint check
```

---

## Troubleshooting

### "Ticker not found" / Balance stays at 0
- Check that `FINNHUB_API_KEY` is set correctly
- Verify the ticker symbol is valid (must be uppercase, e.g., `AAPL` not `aapl`)
- Crypto tickers use CoinGecko IDs: `BTC`, `ETH`, `SOL` (the system maps these automatically)

### Net worth history chart is empty
- The cron job must run at least twice to generate history points
- Trigger manually: `curl -H "Authorization: Bearer YOUR_SECRET" http://localhost:3000/api/update-prices`

### Exchange rate not loading / KES toggle shows wrong values
- ExchangeRate-API is fetched server-side on page load
- If it fails, a fallback rate of 130 KES/USD is used
- Hard refresh the page to retry

### "Unauthorized" when cron job runs
- Make sure `CRON_SECRET` is set in both `.env.local` and Vercel environment variables
- The cron endpoint requires: `Authorization: Bearer <CRON_SECRET>`

### Rebalancing alerts not showing
- You need to set `target_allocation` on at least one asset class
- Targets are set when adding/editing assets via the form

### Escape Velocity shows "N/A"
- The forecaster needs your total assets, weighted growth rate, and weighted yield rate
- All computed from your actual assets — add some assets first

### SQL migration errors
- Run Part 1 and Part 2 separately
- "Already exists" errors are safe to ignore
- Make sure you're running in the **correct** Supabase project database

### Build errors
- Run `npm run build` to check for TypeScript errors
- Common fix: ensure all Recharts Tooltip formatters use `any` types
- Ensure `supabase-server.ts` and `supabase-browser.ts` exist in `src/utils/`

---

## Roadmap

Planned features (Phase 3+):
- **AI Market Brief** — Daily Claude-powered portfolio summary
- **Insider Trading Feed** — Track insider buys/sells for your holdings
- **Macro Dashboard** — Yield curves, sector rotation, economic indicators
- **Security Headers** — CSP, HSTS, X-Frame-Options in `next.config.ts`
- **RLS for live_prices** — Remove service key dependency for BTC price

---

*Built with Next.js 16, Supabase, Recharts, and a lot of financial APIs.*
