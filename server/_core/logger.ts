import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Structured logger using pino.
 * - Production: JSON logs (parseable by log aggregators)
 * - Development: human-readable pretty-printed logs
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),
  transport: isDev
    ? { target: "pino-pretty", options: { colorize: true } }
    : undefined,
  base: isDev ? undefined : { pid: process.pid },
});

/**
 * Create a child logger with a module context tag.
 * Usage: const log = createLogger("payments");
 *        log.info({ paymentId: 123 }, "Payment approved");
 */
export function createLogger(module: string) {
  return logger.child({ module });
}
