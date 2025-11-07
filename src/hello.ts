import { query } from "@anthropic-ai/claude-agent-sdk";

async function main() {
  // query returns an async iterator, which streams all messages and events
  // from the conversation.
  const it = query({
    model: "claude-3-5-sonnet-latest",
    messages: [{ role: "user", content: "Say hello briefly." }],
    allowedTools: [], // No tools are allowed in this example.
  });

  for await (const m of it) {
    // We're streaming the response, so we'll get deltas for the message.
    if (m.type === "message_delta" && m.delta.type === "text_delta") {
      process.stdout.write(m.delta.text);
    } else if (m.type === "message_stop") {
      // The message is complete, so we'll print a newline.
      process.stdout.write("\n");
    }
  }
}

main().catch(console.error);
