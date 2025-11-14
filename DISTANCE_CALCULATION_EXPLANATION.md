# How Distance is Calculated from Postcodes

## Step-by-Step Process

### 1. **Postcode to Coordinates (Geocoding)**

When a user enters a postcode (e.g., "1000" for Lisbon, Portugal), the system:

```typescript
// From lib/geocoding.ts
export async function geocodePostcode(postcode: string): Promise<GeocodeResult | null> {
  // Calls OpenStreetMap Nominatim API
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(postcode)}&limit=1&addressdetails=1`
  )
  
  // Returns: { latitude: 38.7223, longitude: -9.1393, display_name: "Lisbon, Portugal" }
}
```

**Example:**
- User postcode: `1000` → Geocoded to: `lat: 38.7223, lng: -9.1393` (Lisbon, Portugal)
- Task postcode: `2000` → Geocoded to: `lat: -33.8688, lng: 151.2093` (Sydney, Australia)

### 2. **Distance Calculation (Haversine Formula)**

The distance between two points on Earth is calculated using the **Haversine formula**:

```typescript
// From lib/geocoding.ts
export function calculateDistance(
  lat1: number,  // User's latitude
  lon1: number, // User's longitude
  lat2: number,  // Task's latitude
  lon2: number   // Task's longitude
): number {
  const R = 6371 // Earth's radius in kilometers
  
  // Convert degrees to radians
  const dLat = toRad(lat2 - lat1)  // Difference in latitude
  const dLon = toRad(lon2 - lon1)  // Difference in longitude
  
  // Haversine formula
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c  // Distance in kilometers
  
  return Math.round(distance * 10) / 10 // Round to 1 decimal place
}
```

### 3. **Mathematical Example**

**Given:**
- User location: Lisbon, Portugal
  - Latitude: `38.7223°`
  - Longitude: `-9.1393°`
  
- Task location: Sydney, Australia
  - Latitude: `-33.8688°`
  - Longitude: `151.2093°`

**Calculation:**
1. Convert to radians:
   - `dLat = (-33.8688 - 38.7223) = -72.5911° = -1.267 radians`
   - `dLon = (151.2093 - (-9.1393)) = 160.3486° = 2.795 radians`

2. Apply Haversine formula:
   ```
   a = sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlon/2)
   c = 2 × atan2(√a, √(1-a))
   distance = R × c
   ```

3. Result: **~17,000 km** (approximately the distance from Portugal to Australia)

### 4. **Where It's Used in the App**

**In `app/tasks/page.tsx`:**

```typescript
// When user has a location set, calculate distance for each task
if (userLocation && task.latitude && task.longitude) {
  distance = calculateDistance(
    userLocation.lat,      // User's latitude from profile postcode
    userLocation.lng,      // User's longitude from profile postcode
    task.latitude,         // Task's latitude from task postcode
    task.longitude         // Task's longitude from task postcode
  )
}

// Display on task card
{task.distance !== undefined && (
  <p className="text-xs text-primary-600 font-medium">
    📍 {task.distance} km
  </p>
)}
```

### 5. **Why 3891.6 km?**

If you're seeing **3891.6 km**, here are some possible locations:

- **Portugal to somewhere in Eastern Europe/Russia**: ~3000-4000 km
- **Portugal to Middle East**: ~3000-5000 km
- **Portugal to Central Africa**: ~3000-5000 km

**To verify:**
1. Check your profile postcode → Get your lat/lng
2. Check the task's postcode → Get task's lat/lng
3. The Haversine formula calculates the great-circle distance (shortest path on Earth's surface)

### 6. **Accuracy**

The Haversine formula:
- ✅ Assumes Earth is a perfect sphere (good approximation)
- ✅ Accurate for most purposes (within ~0.5% error)
- ✅ Calculates "as the crow flies" distance (not driving distance)
- ⚠️ Does NOT account for:
  - Road networks
  - Terrain
  - Actual travel routes

### 7. **Testing the Calculation**

You can test with known distances:
- **Lisbon to Madrid**: ~500 km
- **Lisbon to London**: ~1,600 km
- **Lisbon to New York**: ~5,500 km
- **Lisbon to Sydney**: ~17,000 km

The formula will give you the straight-line distance between the two coordinates.


