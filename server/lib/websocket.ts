import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { log } from '../vite';
import { User } from '@shared/schema';

// Define types for WebSocket messages
export interface WSMessage {
  type: string;
  payload: any;
  specSheetId?: number;
  userId?: number;
  userName?: string;
}

// Define cursor position
export interface CursorPosition {
  x: number;
  y: number;
  userId: number;
  userName: string;
  color: string;
  fieldId?: string;
  specId?: number;
}

// Define edit operation
export interface EditOperation {
  userId: number;
  userName: string;
  specId: number;
  fieldId: string;
  value: any;
  timestamp: number;
}

interface ExtendedWebSocket extends WebSocket {
  userId?: number;
  userName?: string;
  isAlive: boolean;
  activeSpecSheets: Set<number>;
}

export class CollaborationServer {
  private wss: WebSocketServer;
  private specSheetClients: Map<number, Set<ExtendedWebSocket>> = new Map();
  private userColors: Map<number, string> = new Map();
  private cursorPositions: Map<number, Map<number, CursorPosition>> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/ws/collaboration' 
    });
    log('WebSocket server initialized', 'websocket');
    
    this.setupWebSocketServer();
    this.setupPingInterval();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: ExtendedWebSocket) => {
      ws.isAlive = true;
      ws.activeSpecSheets = new Set();
      
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('message', (message: string) => {
        try {
          const parsedMessage: WSMessage = JSON.parse(message);
          this.handleMessage(ws, parsedMessage);
        } catch (error) {
          log(`Error parsing message: ${error}`, 'websocket');
        }
      });

      ws.on('close', () => {
        this.handleClientDisconnect(ws);
      });
    });
  }

  private setupPingInterval() {
    this.pingInterval = setInterval(() => {
      // Convert to array first to avoid TypeScript iteration issues
      Array.from(this.wss.clients).forEach((client) => {
        const ws = client as ExtendedWebSocket;
        if (ws.isAlive === false) {
          ws.terminate();
          return;
        }
        
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // Check every 30 seconds

    this.wss.on('close', () => {
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
        this.pingInterval = null;
      }
    });
  }

  private handleMessage(ws: ExtendedWebSocket, message: WSMessage) {
    switch (message.type) {
      case 'join':
        this.handleJoin(ws, message);
        break;
      case 'leave':
        this.handleLeave(ws, message);
        break;
      case 'cursor':
        this.handleCursorUpdate(ws, message);
        break;
      case 'edit':
        this.handleEdit(ws, message);
        break;
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
      default:
        log(`Unknown message type: ${message.type}`, 'websocket');
    }
  }

  private handleJoin(ws: ExtendedWebSocket, message: WSMessage) {
    if (!message.specSheetId || !message.userId || !message.userName) {
      return;
    }

    ws.userId = message.userId;
    ws.userName = message.userName;
    ws.activeSpecSheets.add(message.specSheetId);

    // Assign a random color to the user if they don't have one
    if (!this.userColors.has(message.userId)) {
      const color = this.getRandomColor();
      this.userColors.set(message.userId, color);
    }

    // Add client to spec sheet room
    if (!this.specSheetClients.has(message.specSheetId)) {
      this.specSheetClients.set(message.specSheetId, new Set());
    }
    this.specSheetClients.get(message.specSheetId)?.add(ws);

    // Send active users to the new client
    this.broadcastActiveUsers(message.specSheetId);
    
    // Send current cursor positions
    this.sendCurrentCursorPositions(ws, message.specSheetId);

    log(`Client ${message.userName} (ID: ${message.userId}) joined spec sheet ${message.specSheetId}`, 'websocket');
  }

  private handleLeave(ws: ExtendedWebSocket, message: WSMessage) {
    if (!message.specSheetId || !ws.userId) {
      return;
    }

    this.removeClientFromSpecSheet(ws, message.specSheetId);
    ws.activeSpecSheets.delete(message.specSheetId);

    // Remove cursor position
    if (this.cursorPositions.has(message.specSheetId)) {
      this.cursorPositions.get(message.specSheetId)?.delete(ws.userId);
    }

    // Broadcast updated active users
    this.broadcastActiveUsers(message.specSheetId);

    log(`Client ${ws.userName} (ID: ${ws.userId}) left spec sheet ${message.specSheetId}`, 'websocket');
  }

  private handleClientDisconnect(ws: ExtendedWebSocket) {
    if (!ws.userId) return;

    // Remove client from all spec sheets
    ws.activeSpecSheets.forEach(specSheetId => {
      this.removeClientFromSpecSheet(ws, specSheetId);
      
      // Remove cursor position
      if (this.cursorPositions.has(specSheetId)) {
        this.cursorPositions.get(specSheetId)?.delete(ws.userId!);
      }

      // Broadcast updated active users
      this.broadcastActiveUsers(specSheetId);
    });

    log(`Client ${ws.userName} (ID: ${ws.userId}) disconnected`, 'websocket');
  }

  private removeClientFromSpecSheet(ws: ExtendedWebSocket, specSheetId: number) {
    const clients = this.specSheetClients.get(specSheetId);
    if (clients) {
      clients.delete(ws);
      if (clients.size === 0) {
        this.specSheetClients.delete(specSheetId);
        this.cursorPositions.delete(specSheetId);
      }
    }
  }

  private handleCursorUpdate(ws: ExtendedWebSocket, message: WSMessage) {
    if (!message.specSheetId || !ws.userId || !message.payload) {
      return;
    }

    const { x, y, fieldId, specId } = message.payload;
    const cursorPosition: CursorPosition = {
      x,
      y,
      userId: ws.userId,
      userName: ws.userName || 'Unknown',
      color: this.userColors.get(ws.userId) || this.getRandomColor(),
      fieldId,
      specId
    };

    // Store cursor position
    if (!this.cursorPositions.has(message.specSheetId)) {
      this.cursorPositions.set(message.specSheetId, new Map());
    }
    this.cursorPositions.get(message.specSheetId)?.set(ws.userId, cursorPosition);

    // Broadcast cursor position to other clients
    this.broadcastToSpecSheet(message.specSheetId, {
      type: 'cursor',
      payload: cursorPosition
    }, ws);
  }

  private handleEdit(ws: ExtendedWebSocket, message: WSMessage) {
    if (!message.specSheetId || !ws.userId || !message.payload) {
      return;
    }

    const editOperation: EditOperation = {
      userId: ws.userId,
      userName: ws.userName || 'Unknown',
      specId: message.payload.specId,
      fieldId: message.payload.fieldId,
      value: message.payload.value,
      timestamp: Date.now()
    };

    // Broadcast edit to all clients in the spec sheet
    this.broadcastToSpecSheet(message.specSheetId, {
      type: 'edit',
      payload: editOperation
    });
  }

  private broadcastActiveUsers(specSheetId: number) {
    const clients = this.specSheetClients.get(specSheetId);
    if (!clients) return;

    const activeUsers = Array.from(clients).map(client => ({
      userId: client.userId,
      userName: client.userName,
      color: this.userColors.get(client.userId!) || this.getRandomColor()
    }));

    this.broadcastToSpecSheet(specSheetId, {
      type: 'activeUsers',
      payload: activeUsers
    });
  }

  private sendCurrentCursorPositions(ws: ExtendedWebSocket, specSheetId: number) {
    const positions = this.cursorPositions.get(specSheetId);
    if (!positions) return;

    const cursorPositions = Array.from(positions.values());
    ws.send(JSON.stringify({
      type: 'cursorPositions',
      payload: cursorPositions
    }));
  }

  private broadcastToSpecSheet(specSheetId: number, message: any, excludeClient?: ExtendedWebSocket) {
    const clients = this.specSheetClients.get(specSheetId);
    if (!clients) return;

    const messageString = JSON.stringify(message);
    // Use Array.from to avoid TypeScript iteration issues with Set
    Array.from(clients).forEach(client => {
      if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
        client.send(messageString);
      }
    });
  }

  private getRandomColor(): string {
    const colors = [
      '#FF5733', '#33FF57', '#3357FF', '#FF33F5', '#F5FF33',
      '#33FFF5', '#FF5733', '#33FF57', '#3357FF', '#FF33F5'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  public close() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    this.wss.close();
  }
}

export default CollaborationServer;