This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# GMB Scheduling Post

A Next.js application for scheduling and managing Google My Business posts across multiple locations.

## Features

- Google My Business integration
- Multi-location post management
- Scheduled posting with queue system
- Review management
- Location synchronization

## GMB Location Sync & Timeout Resolution

### Problem

The `fetchAndStoreGMBLocations` function was exceeding Vercel's serverless function timeout limits due to:

- Sequential API calls to Google My Business API
- Multiple database operations in loops
- No timeout handling for long-running operations

### Solution

We've implemented a multi-layered approach to resolve timeout issues:

#### 1. **Optimized Direct Function** (`fetchAndStoreGMBLocations`)

- **Timeout handling**: Added Promise.race with 25s timeout for accounts API, 20s for locations API
- **Batching**: Process 3 accounts simultaneously to reduce total execution time
- **Efficient database operations**: Batch database reads and writes
- **Early termination**: Stop processing if approaching Vercel timeout (8s buffer)

#### 2. **API Route** (`/api/gmb-sync`)

- **Server-side execution**: Runs in Vercel's serverless environment with extended timeout (60s)
- **Session validation**: Secure server-side authentication
- **Error handling**: Proper error responses and logging

#### 3. **Background Worker** (`workers/gmb-sync-worker.ts`)

- **Queue-based processing**: Uses BullMQ for reliable background job processing
- **Redis persistence**: Jobs survive server restarts
- **Retry logic**: Automatic retry with exponential backoff
- **Concurrency control**: Process one sync job at a time

### Usage

#### Option 1: Direct API Call (Recommended)

```typescript
// From dashboard - uses the API route
const handleRefreshLocations = async () => {
  const response = await fetch("/api/gmb-sync", { method: "POST" });
  // Handle response...
};
```

#### Option 2: Background Queue

```typescript
// Queue the sync job for background processing
import { queueGMBLocationSync } from "@/services/gmbService";

await queueGMBLocationSync(session);
```

#### Option 3: Run Worker

```bash
# Start the background worker
npm run worker
```

### Configuration

#### Environment Variables

```env
# Redis configuration for queue system
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Vercel timeout (Pro plan required for >10s)
# Set in vercel.json or function config
```

#### Vercel Configuration

```json
// vercel.json
{
  "functions": {
    "app/api/gmb-sync/route.ts": {
      "maxDuration": 60
    }
  }
}
```

### Performance Improvements

1. **API Timeouts**: 25s for accounts, 20s for locations
2. **Batch Processing**: 3 accounts simultaneously
3. **Database Optimization**: Batch operations instead of individual queries
4. **Early Termination**: Stop before Vercel timeout
5. **Background Processing**: Queue system for long-running operations

### Monitoring

- Check sync status: `getGMBSyncStatus()`
- Monitor queue: BullMQ dashboard
- Logs: Console and Vercel function logs
- Metrics: Processed count, skipped count, execution time

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run background worker
npm run worker

# Build for production
npm run build
```

## Deployment

1. Set up Redis instance
2. Configure environment variables
3. Deploy to Vercel
4. Start background worker (optional, for queue processing)

## Troubleshooting

### Timeout Issues

- Use the API route instead of direct function calls
- Check Redis connection for queue system
- Monitor function execution time in Vercel logs
- Consider upgrading to Vercel Pro for longer timeouts

### Sync Failures

- Verify Google My Business API access
- Check access token validity
- Review error logs in console
- Use background worker for retry logic
