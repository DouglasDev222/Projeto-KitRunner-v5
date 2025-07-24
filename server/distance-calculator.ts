// Simple distance-based delivery cost calculator
// In a real implementation, this would use a postal code API service

export interface DeliveryCalculation {
  distance: number; // in kilometers
  deliveryCost: number; // in BRL
}

// Mock postal code coordinates for demonstration
// In production, use a real postal code API like ViaCEP + Google Maps Distance Matrix
const mockPostalCodes: Record<string, { lat: number; lng: number; city: string }> = {
  '58000000': { lat: -7.1195, lng: -34.8450, city: 'João Pessoa' }, // João Pessoa center
  '58030000': { lat: -7.1500, lng: -34.8600, city: 'João Pessoa' }, // Manaíra
  '58040000': { lat: -7.1000, lng: -34.8300, city: 'João Pessoa' }, // Centro
  '58050000': { lat: -7.1300, lng: -34.8700, city: 'João Pessoa' }, // Cabo Branco
  '58100000': { lat: -6.9500, lng: -35.2000, city: 'Campina Grande' }, // Campina Grande
  '58400000': { lat: -7.2300, lng: -35.8800, city: 'Campina Grande' },
};

// Haversine formula to calculate distance between two points
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export function calculateDeliveryCost(fromZipCode: string, toZipCode: string): DeliveryCalculation {
  // Clean zip codes (remove any formatting)
  const cleanFromZip = fromZipCode.replace(/\D/g, '');
  const cleanToZip = toZipCode.replace(/\D/g, '');
  
  // Get coordinates for both zip codes
  const fromCoords = mockPostalCodes[cleanFromZip];
  const toCoords = mockPostalCodes[cleanToZip];
  
  // If we don't have coordinates for either zip code, use defaults
  if (!fromCoords || !toCoords) {
    return {
      distance: 12.5, // Default distance
      deliveryCost: 18.50 // Default cost
    };
  }
  
  // Calculate distance
  const distance = calculateDistance(
    fromCoords.lat, fromCoords.lng,
    toCoords.lat, toCoords.lng
  );
  
  // Calculate delivery cost based on distance
  // Base cost: R$ 8.00
  // Additional cost: R$ 1.50 per km after first 5km
  let deliveryCost = 8.00; // Base delivery cost
  
  if (distance > 5) {
    deliveryCost += (distance - 5) * 1.50;
  }
  
  // Minimum delivery cost
  deliveryCost = Math.max(deliveryCost, 12.00);
  
  // Maximum delivery cost within reasonable range
  deliveryCost = Math.min(deliveryCost, 45.00);
  
  return {
    distance: Math.round(distance * 10) / 10, // Round to 1 decimal place
    deliveryCost: Math.round(deliveryCost * 100) / 100 // Round to 2 decimal places
  };
}

// Add more postal codes as needed
export function addPostalCode(zipCode: string, lat: number, lng: number, city: string) {
  const cleanZip = zipCode.replace(/\D/g, '');
  mockPostalCodes[cleanZip] = { lat, lng, city };
}