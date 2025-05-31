# Weather Data Automation

## Overview
The weather system automatically updates weather forecasts twice daily using GitHub Actions.

## Setup Instructions

### 1. Environment Variables
Add to your `.env` file:
```bash
VITE_WEATHER_UPDATE_API_KEY=your_secure_random_key_here
```

### 2. GitHub Secrets
In your GitHub repository, add these secrets:
- `WEATHER_UPDATE_API_KEY`: Same as your env variable
- `WEATHER_UPDATE_URL`: Your deployed app URL + `/api/weather/update`
  Example: `https://your-app.vercel.app/api/weather/update`

### 3. GitHub Actions
The workflow runs automatically at:
- 4:00 AM Philippine Time (8:00 PM UTC previous day)
- 4:00 PM Philippine Time (8:00 AM UTC)

### 4. Manual Triggers
You can manually trigger updates:
1. Go to GitHub Actions tab
2. Select "Automated Weather Update"
3. Click "Run workflow"
4. Optionally set batch size or skip cleanup

## Security Features
- API key authentication for automated requests
- Referer checking for manual website requests
- Rate limiting and timeout protection
- Detailed logging for monitoring

## Monitoring
Check the GitHub Actions logs to monitor:
- Update success/failure status
- Number of records processed
- Processing time
- Error details if any failures occur

## Troubleshooting
Common issues:
1. **401 Unauthorized**: Check API key in GitHub secrets
2. **Timeout**: Weather API might be slow, check logs
3. **Database errors**: Check Supabase connection and limits
