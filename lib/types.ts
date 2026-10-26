export type QueueStatus = "waiting" | "loading" | "done" | "cancelled";

export interface QueueRow {
  id: string;
  public_slug: string;
  customer_name: string;
  license_plate: string;
  driver_name: string;
  arrived_at: string;
  started_loading_at: string | null;
  finished_loading_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  status: QueueStatus;
  priority: number;
  started_by: string | null;
  finished_by: string | null;
  cancelled_by: string | null;
  token_id: string | null;
}

export interface QrTokenRow {
  id: string;
  token: string;
  issued_by: string | null;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  used_by_queue_id: string | null;
}

export interface OperatorRow {
  id: string;
  username: string;
  display_name: string;
  is_active: boolean;
  created_at: string;
}
