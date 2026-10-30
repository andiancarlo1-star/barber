import { absoluteUrl } from "./utils";
import { formatDateLong, formatMoney, formatTime } from "./dates";

export { formatDateLong, formatMoney, formatTime };

export function absoluteUrlSafe(path: string): string {
  return absoluteUrl(path);
}
