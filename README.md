# Trump Tracker - AI-Curated Trump News

A modern web application providing neutral, AI-curated news about Donald Trump and his cabinet.

## Features

- 🤖 AI-powered news neutralization
- 💳 Stripe subscription system
- 🔐 Secure authentication
- 📱 Responsive design
- 📊 Real-time updates

## News Neutralization Pipeline

The application uses a sophisticated AI pipeline to ensure neutral, fact-based news coverage:

### Process Flow

1. **News Fetching**
   - Regularly polls NewsAPI for Trump-related articles
   - Filters for English language content
   - Deduplicates based on URL

2. **AI Processing**
   - Uses OpenAI's GPT model for neutralization
   - Separate prompts for headlines and descriptions
   - Maintains factual accuracy while removing bias
   - Formats descriptions with bullet points for clarity

3. **Error Handling**
   - Graceful fallback to original content if AI fails
   - Detailed error logging
   - Status tracking for each article

4. **Storage**
   - Stores both original and neutralized versions
   - Tracks neutralization status
   - Maintains error logs for debugging

### Database Schema

The `news_headlines` table includes:
- `original_title`: Raw headline from source
- `neutral_title`: AI-neutralized headline
- `original_description`: Raw article description
- `neutral_description`: AI-neutralized description
- `neutralization_status`: Processing status (pending/completed/failed)
- `error_log`: Detailed error information if processing fails

## Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Stripe account
- NewsAPI account
- OpenAI API access

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd trump-tracker
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env.local`
   - Fill in all required values (see Environment Variables section)

4. Start the development server:
   ```bash
   npm run dev
   ```

## Environment Variables

Create a `.env.local` file with the following variables:

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
STRIPE_PRICE_ID=your_subscription_price_id
VITE_STRIPE_PUBLIC_KEY=your_stripe_publishable_key

# News API
NEWS_API_KEY=your_news_api_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# API Security
API_KEY=your_secure_api_key
```

### Development vs Production

- For development:
  - Use `.env.local` for local environment variables
  - Use Stripe test mode keys
  - Set `NODE_ENV=development`

- For production:
  - Set environment variables in your hosting platform
  - Use Stripe live mode keys
  - Set `NODE_ENV=production`

## Testing Stripe Integration

1. Use Stripe test mode
2. Test card: 4242 4242 4242 4242
3. Any future date for expiry
4. Any 3 digits for CVC

## Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Deploy to your hosting platform:
   - Upload the `dist` directory
   - Set all environment variables
   - Configure build command: `npm run build`
   - Configure start command: `npm run preview`

3. Set up Stripe webhooks:
   - Create a webhook endpoint in Stripe dashboard
   - Point it to: `https://your-domain.com/api/stripe-webhook`
   - Add the webhook secret to your environment variables

4. Configure the news fetch schedule:
   - Set up a cron job to hit the fetch endpoint daily
   - Recommended time: 00:00 UTC
   - Endpoint: `https://your-domain.com/api/fetch-news`
   - Include API key in headers: `Authorization: Bearer your_api_key`

## Monitoring & Logs

- View Supabase logs in the Supabase dashboard
- Monitor Stripe events in the Stripe dashboard
- Check edge function logs in Supabase Edge Functions logs

## Local Development

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Test the news fetch:
   ```bash
   curl -X POST https://your-domain.com/api/fetch-news \
     -H "Authorization: Bearer your_api_key"
   ```

3. Monitor the logs:
   - Check browser console for frontend errors
   - Check Supabase dashboard for backend logs
   - Check Stripe dashboard for webhook events

## License

MIT License - see LICENSE file for details