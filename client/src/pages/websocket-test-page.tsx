import { WebSocketTest } from "@/components/websocket-test";

export default function WebSocketTestPage() {
  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold mb-6 text-center">WebSocket Collaboration Test</h1>
      <WebSocketTest />
    </div>
  );
}