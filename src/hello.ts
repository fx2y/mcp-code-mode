import { query } from "@anthropic-ai/claude-agent-sdk";

const it = query({
  prompt: "Say hello briefly.",
  options: {
    allowedTools: [], // Security: start locked down
    settingSources: ['user'], // Use global user settings
  },
});

for await (const m of it) {
  if (m.type === "stream_event" && m.event.type === "content_block_delta" && m.event.delta?.type === "text_delta") {
    process.stdout.write(m.event.delta.text);
  }
  if (m.type === "result") {
    process.stdout.write("\n");
  }
}
