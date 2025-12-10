# Vercel Deployment Fix Guide

## Problem
Your Python serverless function is crashing with exit status 1 on Vercel.

## Root Causes
1. Missing GEMINI_API_KEY environment variable
2. Incorrect vercel.json configuration
3. Potential missing dependencies

## Solution Steps

### Step 1: Add Environment Variable to Vercel

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Select your project: `pfm-backend`
3. Go to **Settings** → **Environment Variables**
4. Add the following variable:
   - **Name**: `GEMINI_API_KEY`
   - **Value**: `AIzaSyAj0IlBxZUnskZLEvmzZUQQLObMRqGiJjE`
   - **Environment**: Select all (Production, Preview, Development)
5. Click **Save**

### Step 2: Verify vercel.json Configuration

The vercel.json has been updated to:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "api/index.py"
    }
  ],
  "env": {
    "GEMINI_API_KEY": "@gemini_api_key"
  }
}
```

### Step 3: Redeploy

After adding the environment variable:

1. **Option A - Trigger redeploy from Vercel dashboard:**
   - Go to Deployments tab
   - Click the three dots on the latest deployment
   - Select "Redeploy"

2. **Option B - Push a new commit:**
   ```bash
   cd d:\pfm\backend
   git add .
   git commit -m "Fix Vercel deployment configuration"
   git push
   ```

### Step 4: Check Deployment Logs

1. Go to your Vercel dashboard
2. Click on the latest deployment
3. Check the **Build Logs** and **Function Logs** tabs
4. Look for any remaining errors

## Expected Result

After these fixes, your deployment should succeed and you should see:
- Build Status: ✓ Ready
- Function Status: ✓ Running
- Your API accessible at: https://pfm-backend-phi.vercel.app/

## Test Your Deployment

Once deployed, test these endpoints:

1. **Health Check:**
   ```
   GET https://pfm-backend-phi.vercel.app/health
   ```

2. **Root Endpoint:**
   ```
   GET https://pfm-backend-phi.vercel.app/
   ```

3. **Parse Expense:**
   ```
   POST https://pfm-backend-phi.vercel.app/api/expenses/parse
   Body: {"text": "500 on biryani"}
   ```

## Common Issues & Solutions

### Issue: Still getting 500 errors
**Solution:** Check Function Logs in Vercel for specific error messages

### Issue: Import errors
**Solution:** Ensure all dependencies are in requirements.txt

### Issue: Timeout errors
**Solution:** Gemini API calls might be slow - this is normal for cold starts

## Alternative: Use Environment Variable Directly

If the `@gemini_api_key` reference doesn't work, you can set it directly in Vercel:

1. Remove the `env` section from vercel.json
2. Add GEMINI_API_KEY directly in Vercel dashboard (Settings → Environment Variables)
3. Redeploy

## Need More Help?

Check the Vercel logs for specific error messages and share them for further debugging.
