/**
 * Maps carrier names to their tracking URL patterns.
 * Append the tracking number to get a direct link.
 * Used on the Order Detail page to show a "Track shipment" button.
 */
export const CARRIERS = {
  // International
  DHL: "https://www.dhl.com/us-en/home/tracking.html?tracking-id=",
  FedEx: "https://www.fedex.com/fedextrack/?trknbr=",
  UPS: "https://www.ups.com/track?tracknum=",
  "DHL Express": "https://www.dhl.com/us-en/home/tracking.html?tracking-id=",

  // Pakistan
  TCS: "https://www.tcs.com.pk/tracking.php?id=",
  Leopards: "https://leopardscourier.com/leopards-tracking/?tracking_number=",
  Trax: "https://app.traxlogistics.net/tracking/?id=",
  BlueEX: "https://www.blueex.com.pk/page/tracking?",
  "Pakistan Post": "https://www.pakpost.gov.pk/parcel/trackparcel.php?trackno=",
  CallCourier: "https://callcourier.com.pk/tracking/?tracking_id=",
  PostEx: "https://postex.pk/track?id=",

  // Fallback
  Other: null,
};

/**
 * Returns the tracking URL for a given carrier + tracking number.
 * Returns null if the carrier is unknown or has no URL pattern.
 */
export function getTrackingUrl(carrier, trackingNumber) {
  const base = CARRIERS[carrier];
  if (!base || !trackingNumber) return null;
  return `${base}${encodeURIComponent(trackingNumber)}`;
}

export const CARRIER_NAMES = Object.keys(CARRIERS);
