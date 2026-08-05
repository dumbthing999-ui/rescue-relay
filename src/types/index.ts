// Rescue Relay — Shared Types
// Core domain types for the food-rescue coordination app.

export type UserRole = "org_staff" | "org_admin" | "driver" | "admin";
export type OrgType = "recipient" | "donor" | "both";
export type MembershipRole = "admin" | "staff" | "driver";

export type DonationStatus =
  | "available"
  | "claimed"
  | "in_transit"
  | "delivered"
  | "expired"
  | "cancelled";

export type Perishability =
  | "dry_goods"
  | "produce"
  | "refrigerated"
  | "frozen"
  | "prepared";

export type ClaimStatus = "active" | "completed" | "cancelled" | "expired";
export type TripStatus = "planned" | "in_progress" | "completed" | "cancelled";
export type CheckinType = "pickup" | "delivery";
export type NotifType =
  | "donation_posted"
  | "donation_claimed"
  | "pickup_reminder"
  | "claim_expiring"
  | "delivery_complete";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  org_type: OrgType;
  address: string | null;
  neighborhood: string | null;
  contact_name: string | null;
  contact_email: string | null;
  phone: string | null;
  lat: number | null;
  lng: number | null;
  verified: boolean;
  pilot_partner: boolean;
  created_at: string;
  updated_at: string;
}

export interface Donor {
  id: string;
  name: string;
  donor_type: string | null;
  organization_id: string | null;
  address: string | null;
  neighborhood: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  lat: number | null;
  lng: number | null;
  active: boolean;
}

export interface Donation {
  id: string;
  posted_by: string;
  org_id: string;
  donor_id: string;
  status: DonationStatus;
  pickup_window_start: string;
  pickup_window_end: string;
  claim_deadline: string;
  perishability: Perishability;
  cold_chain_required: boolean;
  cold_chain_verified: boolean | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  geofence_radius_m: number;
  total_pounds: number;
  estimated_meals: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DonationItem {
  id: string;
  donation_id: string;
  item_name: string;
  quantity: number;
  unit: string;
  estimated_pounds: number | null;
  estimated_meals: number | null;
  cold_chain: boolean | null;
  notes: string | null;
  ai_generated: boolean;
  sort_order: number;
}

export interface Claim {
  id: string;
  donation_id: string;
  claimed_by: string;
  org_id: string;
  status: ClaimStatus;
  trip_id: string | null;
  route_order: number | null;
  claimed_at: string;
  completed_at: string | null;
}

export interface Trip {
  id: string;
  driver_id: string;
  org_id: string;
  status: TripStatus;
  planned_at: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export interface CheckIn {
  id: string;
  claim_id: string;
  trip_id: string | null;
  driver_id: string;
  checkin_type: CheckinType;
  lat: number | null;
  lng: number | null;
  within_geofence: boolean;
  verified_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  avatar_url: string | null;
  home_lat: number | null;
  home_lng: number | null;
  notify_radius_m: number;
  created_at: string;
  updated_at: string;
}

// AI classification result (from the vision model or heuristic fallback)
export type ClassifyStatus = "ai" | "heuristic" | "error";

export interface ClassifyResult {
  status: ClassifyStatus;
  items: {
    name: string;
    quantity: string;
    weight_estimate_kg: number | null;
    weight_estimate_lbs: number | null;
    perishability: Perishability | "unknown";
    best_by: string | null;
    expiry_visible: boolean;
    cold_chain: boolean | null;
    quantity_confidence: 0 | 1 | 2;
    note: string;
  }[];
  summary: string;
  urgency: 0 | 1 | 2 | 3;
  explanation: string;
  unclear: boolean;
}

// API error envelope
export interface ApiError {
  ok: false;
  error: string;
  code?: string;
}
export interface ApiOk<T> {
  ok: true;
  data: T;
}
export type ApiResult<T> = ApiOk<T> | ApiError;
