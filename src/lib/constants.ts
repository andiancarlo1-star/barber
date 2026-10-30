export const APP_NAME = "Navaja Barber Studio";
export const APP_SHORT_NAME = "Navaja";
export const DEFAULT_TIMEZONE = "America/Guatemala";
export const CURRENCY = "GTQ";

export const WEEKDAYS_ES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;

export const WEEKDAYS_SHORT_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] as const;

export const MONTHS_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

export const ACTIVE_APPOINTMENT_STATUSES = ["PENDING_PAYMENT", "CONFIRMED"] as const;

export const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Pendiente de pago",
  CONFIRMED: "Confirmada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  NO_SHOW: "No asistió",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  PROCESSING: "Procesando",
  PAID: "Pagado",
  FAILED: "Fallido",
  REFUNDED: "Reembolsado",
  CANCELLED: "Cancelado",
};

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  BARBER: "Barbero",
  CUSTOMER: "Cliente",
};

export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  BOOKING_CONFIRMED: "Reserva confirmada",
  PAYMENT_CONFIRMED: "Pago confirmado",
  PAYMENT_FAILED: "Pago fallido",
  REMINDER: "Recordatorio",
  CANCELLED: "Cancelación",
  RESCHEDULED: "Reprogramación",
};
