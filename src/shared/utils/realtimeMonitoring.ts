/**
 * Utilitaires pour monitorer les performances du realtime
 */
import { useState, useEffect } from 'react';

interface RealtimeMetrics {
  subscriptionCount: number;
  messagesReceived: number;
  errors: number;
  reconnections: number;
  lastError?: Error;
  channels: Map<string, ChannelMetrics>;
}

interface ChannelMetrics {
  name: string;
  createdAt: Date;
  messagesReceived: number;
  lastMessageAt?: Date;
  errors: number;
  status: 'connected' | 'disconnected' | 'error';
}

class RealtimeMonitor {
  private static instance: RealtimeMonitor;
  private metrics: RealtimeMetrics = {
    subscriptionCount: 0,
    messagesReceived: 0,
    errors: 0,
    reconnections: 0,
    channels: new Map(),
  };

  private constructor() {}

  static getInstance(): RealtimeMonitor {
    if (!RealtimeMonitor.instance) {
      RealtimeMonitor.instance = new RealtimeMonitor();
    }
    return RealtimeMonitor.instance;
  }

  // Enregistrer une nouvelle subscription
  registerSubscription(channelName: string) {
    this.metrics.subscriptionCount++;
    this.metrics.channels.set(channelName, {
      name: channelName,
      createdAt: new Date(),
      messagesReceived: 0,
      errors: 0,
      status: 'disconnected',
    });
    this.log(`Subscription registered: ${channelName}`);
  }

  // Désinscrire une subscription
  unregisterSubscription(channelName: string) {
    this.metrics.subscriptionCount--;
    const channel = this.metrics.channels.get(channelName);
    if (channel) {
      this.log(`Subscription unregistered: ${channelName} (lifetime: ${this.getLifetime(channel.createdAt)})`);
      this.metrics.channels.delete(channelName);
    }
  }

  // Mettre à jour le statut d'un channel
  updateChannelStatus(channelName: string, status: 'connected' | 'disconnected' | 'error') {
    const channel = this.metrics.channels.get(channelName);
    if (channel) {
      channel.status = status;
      if (status === 'error') {
        channel.errors++;
        this.metrics.errors++;
      }
    }
  }

  // Enregistrer un message reçu
  recordMessage(channelName: string) {
    this.metrics.messagesReceived++;
    const channel = this.metrics.channels.get(channelName);
    if (channel) {
      channel.messagesReceived++;
      channel.lastMessageAt = new Date();
    }
  }

  // Enregistrer une erreur
  recordError(channelName: string, error: Error) {
    this.metrics.errors++;
    this.metrics.lastError = error;
    const channel = this.metrics.channels.get(channelName);
    if (channel) {
      channel.errors++;
    }
    this.log(`Error on ${channelName}: ${error.message}`, 'error');
  }

  // Enregistrer une reconnexion
  recordReconnection(channelName: string) {
    this.metrics.reconnections++;
    this.log(`Reconnection on ${channelName}`);
  }

  // Obtenir les métriques actuelles
  getMetrics(): RealtimeMetrics {
    return {
      ...this.metrics,
      channels: new Map(this.metrics.channels),
    };
  }

  // Obtenir un rapport formaté
  getReport(): string {
    const report = [
      '=== Realtime Monitoring Report ===',
      `Active Subscriptions: ${this.metrics.subscriptionCount}`,
      `Total Messages: ${this.metrics.messagesReceived}`,
      `Total Errors: ${this.metrics.errors}`,
      `Reconnections: ${this.metrics.reconnections}`,
      '',
      'Channels:',
    ];

    this.metrics.channels.forEach((channel) => {
      report.push(
        `  - ${channel.name}:`,
        `    Status: ${channel.status}`,
        `    Messages: ${channel.messagesReceived}`,
        `    Errors: ${channel.errors}`,
        `    Lifetime: ${this.getLifetime(channel.createdAt)}`,
        channel.lastMessageAt ? `    Last Message: ${this.getTimeSince(channel.lastMessageAt)} ago` : ''
      );
    });

    if (this.metrics.lastError) {
      report.push('', `Last Error: ${this.metrics.lastError.message}`);
    }

    return report.filter(Boolean).join('\n');
  }

  // Réinitialiser les métriques
  reset() {
    this.metrics = {
      subscriptionCount: 0,
      messagesReceived: 0,
      errors: 0,
      reconnections: 0,
      channels: new Map(),
    };
  }

  // Helpers
  private getLifetime(createdAt: Date): string {
    const ms = Date.now() - createdAt.getTime();
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  private getTimeSince(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h`;
  }

  private log(message: string, level: 'info' | 'error' = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = level === 'error' ? '❌' : '📊';
    console.log(`${prefix} [RealtimeMonitor] ${timestamp} - ${message}`);
  }
}

// Export singleton
export const realtimeMonitor = RealtimeMonitor.getInstance();

// Hook pour utiliser le monitor dans les composants
export function useRealtimeMonitor() {
  const [metrics, setMetrics] = useState(realtimeMonitor.getMetrics());

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(realtimeMonitor.getMetrics());
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, []);

  return {
    metrics,
    report: realtimeMonitor.getReport(),
    reset: () => realtimeMonitor.reset(),
  };
}

// Wrapper pour ajouter le monitoring à un channel
export function withMonitoring(channelName: string) {
  return {
    onSubscribe: () => realtimeMonitor.registerSubscription(channelName),
    onUnsubscribe: () => realtimeMonitor.unregisterSubscription(channelName),
    onConnect: () => realtimeMonitor.updateChannelStatus(channelName, 'connected'),
    onDisconnect: () => realtimeMonitor.updateChannelStatus(channelName, 'disconnected'),
    onMessage: () => realtimeMonitor.recordMessage(channelName),
    onError: (error: Error) => realtimeMonitor.recordError(channelName, error),
    onReconnect: () => realtimeMonitor.recordReconnection(channelName),
  };
}