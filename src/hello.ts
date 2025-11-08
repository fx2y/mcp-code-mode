import { query } from "@anthropic-ai/claude-agent-sdk";

const it = query({
  prompt: "Say hello briefly.",
  options: {
    allowedTools: [], // Security: start locked down
    settingSources: ['user'], // Use global user settings
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
