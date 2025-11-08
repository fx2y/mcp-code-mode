import { sandboxQuery } from "./sandboxed-query.js";

const it = sandboxQuery({
  prompt:
    "Use the sandboxed_code.run tool to print 'hello from the sandbox' via printf and report the captured stdout.",
  options: {
    settingSources: ["user"],
    sandboxPolicy: {
      metadata: { run_id: "hello-demo" },
      proc: {
        timeoutMs: 10_000,
      },
    },
  },
});

for await (const m of it) {
  // Correct API for this SDK version
  if (m.type === "assistant" && m.message?.content?.[0]?.text) {
    process.stdout.write(m.message.content[0].text);
  }
  if (m.type === "result") {
    process.stdout.write("\n");
  }
}
