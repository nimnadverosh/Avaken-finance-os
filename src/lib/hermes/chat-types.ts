export type HermesMessageRole = "user" | "agent" | "system";
export type HermesMessageKind = "chat" | "notification";
export type HermesNotificationSeverity = "info" | "success" | "warning" | "error";

export interface HermesChatMessage {
  id: string;
  role: HermesMessageRole;
  kind: HermesMessageKind;
  content: string;
  title?: string;
  severity?: HermesNotificationSeverity;
  source?: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface HermesChatStatus {
  configured: boolean;
  reachable?: boolean;
  mode: "live" | "demo";
}

export interface HermesMessagesResponse {
  success: true;
  messages: HermesChatMessage[];
  status: HermesChatStatus;
  unreadCount: number;
}

export interface HermesChatSendResponse {
  success: true;
  userMessage: HermesChatMessage;
  agentMessage: HermesChatMessage;
}

export interface HermesNotifyPayload {
  title: string;
  body: string;
  severity?: HermesNotificationSeverity;
  source?: string;
  job?: string;
  metadata?: Record<string, unknown>;
}

export interface HermesNotifyResponse {
  success: true;
  message: HermesChatMessage;
}
