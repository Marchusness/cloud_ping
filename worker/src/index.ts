import { fetchHandler } from "./handlers/fetch";
import { scheduledHandler } from "./handlers/schedules";
import { sendLogs } from "edge-watch";

export default {
  scheduled: scheduledHandler,
  fetch: fetchHandler,
  tail: async (events, env) => {
    for (const event of events) {
      const logs = event.logs.map((log) => ({
        message: JSON.stringify({
          level: log.level,
          message: log.message,
        }),
        timestamp: log.timestamp,
      }));

      const exceptions = event.exceptions.map((exception) => ({
        message: JSON.stringify({
          level: "exception",
          message: exception.message,
        }),
        timestamp: exception.timestamp,
      }));

      sendLogs({
        apiKey: env.EDGE_WATCH_API_KEY,
        logs: [
          ...logs,
          ...exceptions,
        ],
      });
    }
  },
} satisfies ExportedHandler<Env>;
