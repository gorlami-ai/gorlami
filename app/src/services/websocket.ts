import { invoke } from '@tauri-apps/api/core';
import { authService } from './auth';

interface WebSocketConfig {
  url: string;
  auto_reconnect: boolean;
  reconnect_interval: number;
  auth_token?: string | null;
}

export const websocketService = {
  async connectWithAuth() {
    try {
      // Get current config
      const config = await invoke<WebSocketConfig>('get_websocket_config');
      
      // Get auth token if auth is enabled
      let authToken = null;
      if (authService.isAuthEnabled()) {
        authToken = await authService.getAccessToken();
        if (!authToken) {
          throw new Error('No authentication token available');
        }
      }
      
      // Update config with auth token
      const configWithAuth: WebSocketConfig = {
        ...config,
        auth_token: authToken,
      };
      
      // Update the config with auth token
      await invoke('update_websocket_config', { config: configWithAuth });
      
      // Connect to WebSocket
      await invoke('connect_websocket');
    } catch (error) {
      console.error('Failed to connect WebSocket with auth:', error);
      throw error;
    }
  },
  
  async disconnect() {
    await invoke('disconnect_websocket');
  },
  
  async getStatus() {
    return await invoke('get_websocket_status');
  },
  
  async updateConfig(config: Partial<WebSocketConfig>) {
    const currentConfig = await invoke<WebSocketConfig>('get_websocket_config');
    const updatedConfig = { ...currentConfig, ...config };
    await invoke('update_websocket_config', { config: updatedConfig });
  },
};