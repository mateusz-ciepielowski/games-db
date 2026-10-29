// Local SMTP sink: no real messages leave the machine.
import assert from "node:assert/strict";
import net from "node:net";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
const { sendPasswordReset } = createRequire(import.meta.url)(
  "../lib/mail.ts",
) as typeof import("../lib/mail");

let message = "";
const server = net.createServer((socket) => {
  socket.setEncoding("utf8");
  socket.write("220 localhost SMTP test\r\n");
  let buffer = "";
  let data = false;
  socket.on("data", (chunk) => {
    buffer += chunk;
    while (buffer.includes("\r\n")) {
      const end = buffer.indexOf("\r\n");
      const line = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      if (data) {
        if (line === ".") {
          data = false;
          socket.write("250 queued locally\r\n");
        } else message += line + "\r\n";
      } else if (/^(EHLO|HELO)/i.test(line)) socket.write("250 localhost\r\n");
      else if (/^DATA/i.test(line)) {
        data = true;
        socket.write("354 End with dot\r\n");
      } else if (/^QUIT/i.test(line)) {
        socket.end("221 Bye\r\n");
      } else socket.write("250 OK\r\n");
    }
  });
});
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address() as net.AddressInfo;
Object.assign(process.env, {
  SMTP_HOST: "127.0.0.1",
  SMTP_PORT: String(address.port),
  SMTP_SECURE: "false",
  SMTP_FROM: "GamesDB <noreply@example.invalid>",
  AUTH_URL: "http://localhost:3000",
});
delete process.env.SMTP_USER;
delete process.env.SMTP_PASSWORD;
try {
  const token = randomUUID();
  await sendPasswordReset("qa@example.invalid", token);
  const decoded = message.replaceAll("=\r\n", "").replaceAll("=3D", "=");
  assert.ok(decoded.includes(`/reset-password?token=${token}`));
  assert.ok(decoded.includes("To: qa@example.invalid"));
  console.log(
    "PASS SMTP reset message contains the single-use link and intended recipient",
  );
} finally {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}
