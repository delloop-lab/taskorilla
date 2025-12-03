# How to Geocode Old Tasks

After fixing the Portuguese postcode geocoding, you may want to update existing tasks that have postcodes but no coordinates.

## Option 1: Using the API Endpoint (Recommended)

You can call the API endpoint to automatically geocode all tasks that have postcodes but are missing coordinates:

### Using curl:
```bash
curl -X POST http://localhost:3000/api/geocode-tasks \
  -H "Content-Type: application/json"
```

### Using PowerShell (Windows):
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/geocode-tasks" -Method POST -Headers @{"Content-Type"="application/json"}
```

### Using fetch in browser console:
```javascript
// First, get your session token
const { data: { session } } = await supabase.auth.getSession()

// Then call the API with the token
fetch('/api/geocode-tasks', { 
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`
  }
})
  .then(r => r.json())
  .then(data => {
    console.log('✅ Geocoding Results:', data)
    console.log(`Updated: ${data.updated}, Failed: ${data.failed}, Total: ${data.total}`)
    if (data.errors && data.errors.length > 0) {
      console.log('Errors:', data.errors)
    }
  })
  .catch(error => console.error('❌ Error:', error))
```

### Response:
```json
{
  "message": "Geocoding complete",
  "total": 25,
  "updated": 23,
  "failed": 2,
  "errors": ["Task abc123: Could not geocode postcode 12345"]
}
```

## Option 2: Manual Update via Task Edit

Users can manually update their tasks:
1. Go to the task detail page
2. Click "Edit Task"
3. The postcode field will automatically geocode when they save

## What Gets Updated

The script will:
- Find all tasks with postcodes but missing `latitude` or `longitude`
- Geocode each postcode using the new GEO API PT (for Portuguese) or Nominatim (for others)
- Update the task with:
  - `latitude` and `longitude` coordinates
  - `location` field with the formatted address

## Notes

- The script processes tasks one at a time with a small delay to avoid rate limiting
- Tasks that fail to geocode will be logged but won't break the process
- Only tasks with both `postcode` and `country` will be geocoded
- The script is safe to run multiple times (it only updates tasks missing coordinates)

## Map View

Once tasks have coordinates, they will automatically appear on the map view at `/tasks/map`. The map shows:
- Task markers with budget amounts
- Clickable markers that show task details
- Popup with task title, description, and budget

