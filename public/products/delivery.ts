export type DeliveryMode = "delivery" | "pickup";

const STORE_LAT = -7.8278;
const STORE_LNG = 110.3998;

export function distanceKm(lat: number, lng: number) {
  const earth = 6371;
  const dLat = ((lat - STORE_LAT) * Math.PI) / 180;
  const dLng = ((lng - STORE_LNG) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((STORE_LAT * Math.PI) / 180) *
      Math.cos((lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return earth * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function deliveryFee(km: number) {
  if (km < 2) return null;
  if (km <= 5) return 3000;
  if (km <= 8) return 5000;
  if (km <= 12) return 10000;
  if (km <= 15) return 15000;
  return null;
}

export function deliveryLabel(km: number | null) {
  if (km === null) return "Lokasi belum dihitung";
  if (km < 2) return "Di bawah 2 km — pickup / konfirmasi manual";
  if (km > 15) return "Di atas 15 km — konfirmasi manual";
  return `Sekitar ${km.toFixed(1)} km dari MŌVA`;
}
