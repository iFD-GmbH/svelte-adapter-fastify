# SvelteKit adapter for Fastify

This is an [adapter](https://kit.svelte.dev/docs/adapters) for [SvelteKit](https://kit.svelte.dev/) that builds your app as a standalone Node.js server using [Fastify](https://www.fastify.io/).

## Usage

Install with your package manager of choice:

```bash
pnpm add -D adapter-fastify
```

Then add the adapter to your `svelte.config.js`:

```javascript
// filepath: svelte.config.js
import adapter from 'adapter-fastify';

/** @type {import('@sveltejs/kit').Config} */
const config = {
    kit: {
        adapter: adapter()
    }
};

export default config;
```

## Options

The adapter supports the following options:

```javascript
// filepath: svelte.config.js
// ...
const config = {
    kit: {
        adapter: adapter({
            // The directory to build the server to.
            // It is relative to the project root.
            out: 'build',

            // If true, assets will be precompressed with brotli and gzip.
            precompress: true,

            // The prefix for environment variables that should be exposed to the client.
            envPrefix: ''
        })
    }
};
// ...
```

## Runtime Configuration (Environment Variables)

The behavior of the deployed server can be controlled with the following environment variables:

-   **`HOST`**: The host to listen on. Defaults to `0.0.0.0`.
-   **`PORT`**: The port to listen on. Defaults to `3000`.
-   **`SOCKET_PATH`**: If set, the server will listen on a UNIX socket at this path instead of a TCP port.
-   **`USE_HTTP2`**: Set to `'true'` to enable HTTP/2. Defaults to `'false'`.
-   **`HTTPS_KEY_PATH`**: Path to the SSL private key file. Required if `USE_HTTP2` is `true`.
-   **`HTTPS_CERT_PATH`**: Path to the SSL certificate file. Required if `USE_HTTP2` is `true`.
-   **`LOGGER`**: Set to `'true'` to enable Fastify's built-in logger. Defaults to `'false'`.
-   **`SHUTDOWN_TIMEOUT`**: The time in seconds to wait for connections to close before forcefully shutting down. Defaults to `30`.
-   **`IDLE_TIMEOUT`**: For systemd socket activation, the time in seconds to wait for a new request before shutting down. Defaults to `0` (disabled).
-   **`LISTEN_PID`**, **`LISTEN_FDS`**: For systemd socket activation. See the [systemd documentation](https://www.freedesktop.org/software/systemd/man/latest/sd_listen_fds.html) for more details.


## Building and running the server

You can build your app by running the `build` script, which is usually present in your `package.json`:

```bash
pnpm build
```

This will create a server in the `build` directory (or the directory specified in the `out` option). You can then run the server with:

```bash
node build/index.js
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.