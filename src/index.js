import { env } from "ENV";
import fastify from "fastify";
import { handler } from "HANDLER";
import { readFileSync } from "node:fs";
import process from "node:process";

export const path = env("SOCKET_PATH", false);
export const host = env("HOST", "0.0.0.0");
export const port = env("PORT", !path && "3000");

const use_http2 = env("USE_HTTP2", "false").toLowerCase() === "true";
const https_key_path = env("HTTPS_KEY_PATH", "certs/key.pem");
const https_cert_path = env("HTTPS_CERT_PATH", "certs/cert.pem");
const logger_status = env("LOGGER", "false").toLowerCase() === "true";

const shutdown_timeout = parseInt(env("SHUTDOWN_TIMEOUT", "10"));
const idle_timeout = parseInt(env("IDLE_TIMEOUT", "0"));
const listen_pid = parseInt(env("LISTEN_PID", "0"));
const listen_fds = parseInt(env("LISTEN_FDS", "0"));
// https://www.freedesktop.org/software/systemd/man/latest/sd_listen_fds.html


const SD_LISTEN_FDS_START = 3;

if (listen_pid !== 0 && listen_pid !== process.pid) {
  throw new Error(
    `received LISTEN_PID ${listen_pid} but current process id is ${process.pid}`
  );
}
if (listen_fds > 1) {
  throw new Error(
    `only one socket is allowed for socket activation, but LISTEN_FDS was set to ${listen_fds}`
  );
}

const socket_activation = listen_pid === process.pid && listen_fds === 1;

let requests = 0;
/** @type {NodeJS.Timeout | void} */
let shutdown_timeout_id;
/** @type {NodeJS.Timeout | void} */
let idle_timeout_id;

const fastify_opts = {
  logger: logger_status,
};

let protocol = "http";

if (use_http2) {
  if (!https_key_path || !https_cert_path) {
    throw new Error(
      "USE_HTTP2 is true, but HTTPS_KEY_PATH or HTTPS_CERT_PATH are not set."
    );
  }
  fastify_opts.http2 = true;
  fastify_opts.https = {
    key: readFileSync(https_key_path),
    cert: readFileSync(https_cert_path),
  };
  protocol = "https";
}

const server = fastify(fastify_opts);

server.addContentTypeParser('application/x-www-form-urlencoded', (request, payload, done) => {
  done();
});

server.all("/*", (req, reply) => {
  handler(req.raw, reply.raw);
  logger.info(`Handled request: ${JSON.stringify(req.headers)}`);
});

const listen_opts = socket_activation
  ? { fd: SD_LISTEN_FDS_START }
  : { path, host, port };

server.listen(listen_opts, (err) => {
  if (err) {
    server.log.error(err);
    process.exit(1);
  }

  if (socket_activation) {
    console.log(`Listening on file descriptor ${SD_LISTEN_FDS_START}`);
  } else {
    console.log(`Listening on ${path || `${protocol}://${host}:${port}`}`);
  }
});

let shutting_down = false;
/** @param {'SIGINT' | 'SIGTERM' | 'IDLE'} reason */
function graceful_shutdown(reason) {
  if (shutting_down) return;
  shutting_down = true;

  if (idle_timeout_id) {
    clearTimeout(idle_timeout_id);
  }
  for (const connection of connections) {
    connection.destroy();
  }
  server.close(() => {
    if (shutdown_timeout_id) {
      clearTimeout(shutdown_timeout_id);
    }
    // @ts-expect-error custom events cannot be typed
    process.emit("sveltekit:shutdown", reason);
  });

  shutdown_timeout_id = setTimeout(() => {
    process.exit(0);
  }, shutdown_timeout * 1000);
}

server.addHook("onRequest", (req, reply, done) => {
  if (logger_status) {
    server.log.info(
      { incoming_headers: req.headers },
      "Incoming request headers"
    );
  }
  requests++;

  if (socket_activation && idle_timeout_id) {
    clearTimeout(idle_timeout_id);
    idle_timeout_id = undefined;
  }

  req.raw.on("close", () => {
    requests--;

    if (requests === 0 && socket_activation && idle_timeout) {
      idle_timeout_id = setTimeout(
        () => graceful_shutdown("IDLE"),
        idle_timeout * 1000
      );
    }
  });

  done();
});

server.addHook("onSend", (req, reply, payload, done) => {
  if (logger_status) {
    server.log.info(
      { outgoing_headers: reply.getHeaders() },
      "Outgoing response headers"
    );
  }
  done();
});

server.addContentTypeParser(
  "application/x-www-form-urlencoded",
  (req, body, done) => {
    done();
  }
);

process.on("SIGTERM", () => graceful_shutdown("SIGTERM"));
process.on("SIGINT", () => graceful_shutdown("SIGINT"));

export { server };

