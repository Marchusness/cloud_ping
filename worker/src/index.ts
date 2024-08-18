import { fetchHandler } from "./handlers/fetch";
import { scheduledHandler } from "./handlers/schedules";

export default {
  scheduled: scheduledHandler,
  fetch: fetchHandler,
};
