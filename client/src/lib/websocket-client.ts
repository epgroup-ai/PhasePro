import { toast } from "@/hooks/use-toast";

// Types for WebSocket messages (matching server types)
export interface WSMessage {
  type: string;
  payload?: any;
  specSheetId?: number;
  userId?: number;
  userName?: string;
}

// Type for cursor position
export interface CursorPosition {
  x: number;
  y: number;
  userId: number;
  userName: string;
  color: string;
  fieldId?: string;
  specId?: number;
}

// Type for edit operation
export interface EditOperation {
  userId: number;
  userName: string;
  specId: number;
  fieldId: string;
  value: any;
  timestamp: number;
}

// Type for active user
export interface ActiveUser {
  userId: number;
  userName: string;
  color: string;
}

// WebSocket client for spec sheet collaboration
class WebSocketClient {
  private socket: WebSocket | null = null;
  private messageQueue: WSMessage[] = [];
  private reconnectInterval: number = 3000;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private userId: number | null = null;
  private userName: string | null = null;
  private activeSpecSheetId: number | null = null;
  private listeners: Record<string, Array<(data: any) => void>> = {};

  constructor() {
    // Bind methods
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.send = this.send.bind(this);
    this.addListener = this.addListener.bind(this);
    this.removeListener = this.removeListener.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.joinSpecSheet = this.joinSpecSheet.bind(this);
    this.leaveSpecSheet = this.leaveSpecSheet.bind(this);
    this.updateCursorPosition = this.updateCursorPosition.bind(this);
    this.sendEdit = this.sendEdit.bind(this);
  }

  public connect(): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) return;
    
    // Create WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/collaboration`;
    
    this.socket = new WebSocket(wsUrl);
    
    this.socket.onopen = () => {
      console.log('WebSocket connected');
      
      // Process any messages that were queued while disconnected
      this.messageQueue.forEach(msg => this.send(msg));
      this.messageQueue = [];
      
      // Start ping interval
      this.startPingInterval();
      
      // Notify listeners
      this.notifyListeners('connection', { connected: true });
      
      // Rejoin active spec sheet if there was one
      if (this.activeSpecSheetId !== null && this.userId !== null && this.userName !== null) {
        this.joinSpecSheet(this.activeSpecSheetId, this.userId, this.userName);
      }
    };
    
    this.socket.onclose = (e) => {
      console.log('WebSocket connection closed', e.code, e.reason);
      
      // Clear ping interval
      this.clearPingInterval();
      
      // Notify listeners
      this.notifyListeners('connection', { connected: false });
      
      // Schedule reconnect
      this.scheduleReconnect();
    };
    
    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      
      // Toast a user-friendly error
      toast({
        title: "Connection Error",
        description: "Lost connection to collaboration server. Trying to reconnect...",
        variant: "destructive",
      });
    };
    
    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
  }

  public disconnect(): void {
    // Clear intervals and timers
    this.clearPingInterval();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    // Close socket if it exists
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    // Reset state
    this.activeSpecSheetId = null;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    this.reconnectTimer = setTimeout(() => {
      console.log('Attempting to reconnect WebSocket...');
      this.connect();
    }, this.reconnectInterval);
  }

  private startPingInterval(): void {
    this.clearPingInterval();
    
    this.pingInterval = setInterval(() => {
      this.send({ type: 'ping', payload: {} });
    }, 30000); // Send ping every 30 seconds
  }

  private clearPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private handleMessage(message: WSMessage): void {
    switch (message.type) {
      case 'cursor':
        this.notifyListeners('cursor', message.payload);
        break;
      case 'edit':
        this.notifyListeners('edit', message.payload);
        break;
      case 'activeUsers':
        this.notifyListeners('activeUsers', message.payload);
        break;
      case 'cursorPositions':
        this.notifyListeners('cursorPositions', message.payload);
        break;
      case 'pong':
        // Handle pong response (keep connection alive)
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  private notifyListeners(type: string, data: any): void {
    const callbacks = this.listeners[type] || [];
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in ${type} listener:`, error);
      }
    });
  }

  public send(message: WSMessage): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      // Queue message for when connection is established
      this.messageQueue.push(message);
      
      // Try to connect if not already connected or connecting
      if (!this.socket || this.socket.readyState === WebSocket.CLOSED) {
        this.connect();
      }
      return;
    }
    
    this.socket.send(JSON.stringify(message));
  }

  public addListener(type: string, callback: (data: any) => void): () => void {
    if (!this.listeners[type]) {
      this.listeners[type] = [];
    }
    
    this.listeners[type].push(callback);
    
    // Return a function to remove this listener
    return () => {
      this.removeListener(type, callback);
    };
  }

  public removeListener(type: string, callback: (data: any) => void): void {
    if (!this.listeners[type]) return;
    
    this.listeners[type] = this.listeners[type].filter(cb => cb !== callback);
    
    if (this.listeners[type].length === 0) {
      delete this.listeners[type];
    }
  }

  // Collaboration-specific methods
  public joinSpecSheet(specSheetId: number, userId: number, userName: string): void {
    this.userId = userId;
    this.userName = userName;
    this.activeSpecSheetId = specSheetId;
    
    this.send({
      type: 'join',
      specSheetId,
      userId,
      userName,
      payload: {}
    });
  }

  public leaveSpecSheet(specSheetId: number): void {
    if (this.activeSpecSheetId === specSheetId) {
      this.activeSpecSheetId = null;
    }
    
    this.send({
      type: 'leave',
      specSheetId,
      payload: {}
    });
  }

  public updateCursorPosition(position: Omit<CursorPosition, 'userId' | 'userName' | 'color'>): void {
    if (!this.activeSpecSheetId) return;
    
    this.send({
      type: 'cursor',
      specSheetId: this.activeSpecSheetId,
      payload: position
    });
  }

  public sendEdit(specId: number, fieldId: string, value: any): void {
    if (!this.activeSpecSheetId) return;
    
    this.send({
      type: 'edit',
      specSheetId: this.activeSpecSheetId,
      payload: {
        specId,
        fieldId,
        value
      }
    });
  }
}

// Create singleton instance
export const wsClient = new WebSocketClient();

export default wsClient;