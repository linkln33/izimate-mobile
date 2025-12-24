/**
 * Google Places API Integration
 * Fetches reviews from Google Places API
 * 
 * API Key: Can be provided as parameter or use EXPO_PUBLIC_GOOGLE_PLACES_API_KEY from environment
 */

interface GooglePlaceReview {
  author_name: string;
  author_url?: string;
  profile_photo_url?: string;
  rating: number;
  relative_time_description: string;
  text: string;
  time: number;
}

interface GooglePlaceDetails {
  place_id: string;
  name: string;
  rating?: number;
  user_ratings_total?: number;
  reviews?: GooglePlaceReview[];
  formatted_address?: string;
  website?: string;
}

/**
 * Fetch reviews from Google Places API
 * Requires Google Places API key
 */
export async function fetchGoogleReviews(
  placeId: string,
  apiKey?: string
): Promise<GooglePlaceReview[]> {
  try {
    // Use environment variable if apiKey not provided
    const key = apiKey || process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
    if (!key) {
      throw new Error('Google Places API key not provided. Set EXPO_PUBLIC_GOOGLE_PLACES_API_KEY in .env or pass as parameter.');
    }
    
    // Use Places API Details endpoint
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,user_ratings_total,reviews,formatted_address,website&key=${key}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Google Places API error: ${data.status} - ${data.error_message || ''}`);
    }
    
    if (!data.result || !data.result.reviews) {
      return [];
    }
    
    return data.result.reviews.map((review: any) => ({
      author_name: review.author_name,
      author_url: review.author_url,
      profile_photo_url: review.profile_photo_url,
      rating: review.rating,
      relative_time_description: review.relative_time_description,
      text: review.text,
      time: review.time,
    }));
  } catch (error) {
    console.error('Failed to fetch Google reviews:', error);
    throw error;
  }
}

/**
 * Search for a place by name and address
 * Returns place_id which can be used to fetch reviews
 */
export async function searchGooglePlace(
  query: string,
  apiKey?: string
): Promise<{ place_id: string; name: string; formatted_address?: string } | null> {
  try {
    // Use environment variable if apiKey not provided
    const key = apiKey || process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
    if (!key) {
      throw new Error('Google Places API key not provided. Set EXPO_PUBLIC_GOOGLE_PLACES_API_KEY in .env or pass as parameter.');
    }
    
    const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=place_id,name,formatted_address&key=${key}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'OK' || !data.candidates || data.candidates.length === 0) {
      return null;
    }
    
    const place = data.candidates[0];
    return {
      place_id: place.place_id,
      name: place.name,
      formatted_address: place.formatted_address,
    };
  } catch (error) {
    console.error('Failed to search Google place:', error);
    throw error;
  }
}

/**
 * Get full place details including reviews
 */
export async function getGooglePlaceDetails(
  placeId: string,
  apiKey?: string
): Promise<GooglePlaceDetails | null> {
  try {
    // Use environment variable if apiKey not provided
    const key = apiKey || process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
    if (!key) {
      throw new Error('Google Places API key not provided. Set EXPO_PUBLIC_GOOGLE_PLACES_API_KEY in .env or pass as parameter.');
    }
    
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=place_id,name,rating,user_ratings_total,reviews,formatted_address,website&key=${key}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'OK') {
      return null;
    }
    
    return {
      place_id: data.result.place_id,
      name: data.result.name,
      rating: data.result.rating,
      user_ratings_total: data.result.user_ratings_total,
      reviews: data.result.reviews?.map((review: any) => ({
        author_name: review.author_name,
        author_url: review.author_url,
        profile_photo_url: review.profile_photo_url,
        rating: review.rating,
        relative_time_description: review.relative_time_description,
        text: review.text,
        time: review.time,
      })),
      formatted_address: data.result.formatted_address,
      website: data.result.website,
    };
  } catch (error) {
    console.error('Failed to get Google place details:', error);
    throw error;
  }
}

/**
 * Convert Google review time to Date
 */
export function parseGoogleReviewTime(time: number): Date {
  // Google returns time in seconds since epoch
  return new Date(time * 1000);
}
