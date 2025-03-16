import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import wsClient from "@/lib/websocket-client";

export function WebSocketTest() {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [users, setUsers] = useState<{userId: number; userName: string; color: string}[]>([]);
  
  // Add a message to the list
  const addMessage = (msg: string) => {
    setMessages(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  useEffect(() => {
    // Connect to the WebSocket server
    wsClient.connect();
    
    // Listen for connection status changes
    const removeConnectionListener = wsClient.addListener('connection', (data: {connected: boolean}) => {
      setConnected(data.connected);
      addMessage(data.connected ? 'Connected to WebSocket server' : 'Disconnected from WebSocket server');
    });
    
    // Listen for active users
    const removeActiveUsersListener = wsClient.addListener('activeUsers', (data) => {
      setUsers(data);
      addMessage(`Active users updated: ${data.length} users`);
    });
    
    // Listen for cursor updates
    const removeCursorListener = wsClient.addListener('cursor', (data) => {
      addMessage(`Cursor update from ${data.userName} at x:${data.x}, y:${data.y}`);
    });
    
    // Listen for edits
    const removeEditListener = wsClient.addListener('edit', (data) => {
      addMessage(`Edit by ${data.userName} on field ${data.fieldId}: ${data.value}`);
    });
    
    // Cleanup when component unmounts
    return () => {
      removeConnectionListener();
      removeActiveUsersListener();
      removeCursorListener();
      removeEditListener();
      wsClient.disconnect();
    };
  }, []);
  
  // Join a test spec sheet
  const handleJoinTest = () => {
    wsClient.joinSpecSheet(1, 1, 'Test User');
    addMessage('Joined spec sheet with ID 1');
  };
  
  // Leave the test spec sheet
  const handleLeaveTest = () => {
    wsClient.leaveSpecSheet(1);
    addMessage('Left spec sheet with ID 1');
  };
  
  // Send a test cursor update
  const handleSendCursor = () => {
    wsClient.updateCursorPosition({
      x: Math.floor(Math.random() * 100),
      y: Math.floor(Math.random() * 100),
      fieldId: 'test-field',
      specId: 1
    });
    addMessage('Sent cursor position update');
  };
  
  // Send a test edit
  const handleSendEdit = () => {
    wsClient.sendEdit(1, 'test-field', `Edited value ${new Date().toISOString()}`);
    addMessage('Sent edit operation');
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          WebSocket Connection Test
          <Badge variant={connected ? "default" : "destructive"} className={connected ? "bg-green-500" : ""}>
            {connected ? "Connected" : "Disconnected"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex space-x-2">
            <Button onClick={handleJoinTest}>Join Test Spec</Button>
            <Button onClick={handleLeaveTest} variant="outline">Leave Spec</Button>
            <Button onClick={handleSendCursor} variant="secondary">Send Cursor</Button>
            <Button onClick={handleSendEdit} variant="secondary">Send Edit</Button>
          </div>
          
          {users.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Active Users:</h3>
              <div className="flex flex-wrap gap-2">
                {users.map(user => (
                  <Badge key={user.userId} style={{backgroundColor: user.color}}>
                    {user.userName}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          <Alert>
            <AlertTitle>Message Log</AlertTitle>
            <AlertDescription>
              <div className="mt-2 text-sm max-h-60 overflow-y-auto border rounded p-2">
                {messages.length === 0 ? (
                  <p className="text-muted-foreground">No messages yet</p>
                ) : (
                  <ul className="space-y-1">
                    {messages.map((msg, i) => (
                      <li key={i} className="font-mono text-xs">{msg}</li>
                    ))}
                  </ul>
                )}
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
}