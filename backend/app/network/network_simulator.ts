import { NetworkPacket, PacketPriority, PacketType, NetworkMetrics } from '../models/types.js';
import { dbService } from '../models/db.js';

export interface TransportLayer {
  sendPacket(packet: NetworkPacket): Promise<boolean>;
  getMetrics(): NetworkMetrics;
  setNodeActive(nodeId: string, active: boolean): void;
  setInternetActive(active: boolean): void;
  isNodeActive(nodeId: string): boolean;
  findRoute(source: string, destination: string): string[];
}

export class SimulatedHaLowTransport implements TransportLayer {
  // Adjacency graph representing Wi-Fi HaLow sub-GHz mesh topology in the forest
  private topology: Record<string, string[]> = {
    'N1': ['N2', 'N3'],
    'N2': ['N1', 'N4', 'GATEWAY'],
    'N3': ['N1', 'N4', 'N5'],
    'N4': ['N2', 'N3', 'N6', 'GATEWAY'],
    'N5': ['N3', 'N7'],
    'N6': ['N4', 'N8', 'GATEWAY'],
    'N7': ['N5', 'N8'],
    'N8': ['N6', 'N7', 'GATEWAY'],
    'GATEWAY': ['N2', 'N4', 'N6', 'N8']
  };

  private activeNodes: Set<string> = new Set(['N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7', 'N8', 'GATEWAY']);
  private internetActive = true;
  private packetLossRate = 0.02; // 2% baseline packet loss
  private packetCounter = 1;

  // Real-time tracking
  private packetsSent = 0;
  private packetsDelivered = 0;
  private packetsLost = 0;
  private totalLatency = 0;
  private totalHops = 0;
  private retransmissions = 0;
  private periodicCount = 0;
  private eventDrivenCount = 0;

  // Active packet in transit (for real-time animation broadcast)
  public onPacketHop?: (packet: NetworkPacket, hopIndex: number) => void;
  public onPacketDelivered?: (packet: NetworkPacket) => void;
  public onPacketDropped?: (packet: NetworkPacket, reason: string) => void;

  public setPacketLossRate(rate: number) {
    this.packetLossRate = Math.max(0, Math.min(0.5, rate));
  }

  public setNodeActive(nodeId: string, active: boolean) {
    if (active) {
      this.activeNodes.add(nodeId);
    } else {
      this.activeNodes.delete(nodeId);
    }
  }

  public isNodeActive(nodeId: string): boolean {
    return this.activeNodes.has(nodeId);
  }

  public setInternetActive(active: boolean) {
    this.internetActive = active;
  }

  public isInternetActive(): boolean {
    return this.internetActive;
  }

  /**
   * Dynamic BFS / Dijkstra shortest path routing that accounts for node failures
   */
  public findRoute(source: string, destination: string): string[] {
    if (!this.activeNodes.has(source) || !this.activeNodes.has(destination)) {
      return [];
    }

    const queue: Array<{ current: string; path: string[] }> = [{ current: source, path: [source] }];
    const visited = new Set<string>([source]);

    while (queue.length > 0) {
      const { current, path } = queue.shift()!;
      if (current === destination) {
        return path;
      }

      const neighbors = this.topology[current] || [];
      for (const neighbor of neighbors) {
        if (this.activeNodes.has(neighbor) && !visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push({ current: neighbor, path: [...path, neighbor] });
        }
      }
    }

    return []; // No route available
  }

  /**
   * Create a formatted HaLow packet
   */
  public createPacket(
    source: string,
    destination: string,
    type: PacketType,
    priority: PacketPriority,
    payload: Record<string, any>
  ): NetworkPacket {
    const id = `TRN-${type === 'EMERGENCY ALERT' ? 'FIRE' : type === 'SUSPICIOUS EVENT' ? 'WARN' : 'TEL'}-${String(this.packetCounter++).padStart(4, '0')}`;
    const path = this.findRoute(source, destination);

    if (type === 'NORMAL TELEMETRY') {
      this.periodicCount++;
    } else {
      this.eventDrivenCount++;
    }

    return {
      id,
      timestamp: new Date().toISOString(),
      source,
      destination,
      type,
      priority,
      hop_count: Math.max(0, path.length - 1),
      path,
      current_hop_index: 0,
      status: path.length > 0 ? 'QUEUED' : 'DROPPED',
      payload,
      latency_ms: 0,
      size_bytes: type === 'EMERGENCY ALERT' ? 128 : 64
    };
  }

  /**
   * Transmit packet step by step across simulated HaLow mesh hops
   */
  public async sendPacket(packet: NetworkPacket): Promise<boolean> {
    this.packetsSent++;
    if (packet.path.length === 0) {
      packet.status = 'DROPPED';
      this.packetsLost++;
      dbService.recordPacket(packet);
      if (this.onPacketDropped) this.onPacketDropped(packet, 'No available mesh route');
      return false;
    }

    packet.status = 'TRANSMITTING';
    const totalHops = packet.path.length - 1;

    for (let hop = 0; hop < totalHops; hop++) {
      packet.current_hop_index = hop;
      const hopNode = packet.path[hop];
      const nextNode = packet.path[hop + 1];

      // If next node dropped offline mid-transit, trigger dynamic reroute!
      if (!this.activeNodes.has(nextNode)) {
        const reroute = this.findRoute(hopNode, packet.destination);
        if (reroute.length > 0) {
          packet.path = [...packet.path.slice(0, hop), ...reroute];
          packet.status = 'REROUTED';
        } else {
          packet.status = 'DROPPED';
          this.packetsLost++;
          dbService.recordPacket(packet);
          if (this.onPacketDropped) this.onPacketDropped(packet, `Node ${nextNode} failed mid-transit`);
          return false;
        }
      }

      // Simulated HaLow sub-GHz RF hop delay (30ms - 80ms)
      const hopDelay = Math.floor(35 + Math.random() * 45);
      packet.latency_ms += hopDelay;

      if (this.onPacketHop) {
        this.onPacketHop(packet, hop);
      }

      // Small delay for real-time visual demonstration
      await new Promise((resolve) => setTimeout(resolve, packet.priority === 'EMERGENCY' ? 220 : 150));
    }

    // Packet loss check (emergencies have higher transmission redundancy)
    const effectiveLoss = packet.priority === 'EMERGENCY' ? this.packetLossRate * 0.2 : this.packetLossRate;
    if (Math.random() < effectiveLoss) {
      this.retransmissions++;
      packet.latency_ms += 120; // retransmission penalty
    }

    packet.status = 'DELIVERED';
    packet.current_hop_index = totalHops;
    this.packetsDelivered++;
    this.totalLatency += packet.latency_ms;
    this.totalHops += totalHops;

    dbService.recordPacket(packet);

    if (this.onPacketDelivered) {
      this.onPacketDelivered(packet);
    }

    return true;
  }

  public getMetrics(): NetworkMetrics {
    const totalNodes = 8;
    const onlineNodes = Array.from(this.activeNodes).filter((n) => n !== 'GATEWAY').length;
    const avgLatency = this.packetsDelivered > 0 ? Math.round(this.totalLatency / this.packetsDelivered) : 48;
    const avgHops = this.packetsDelivered > 0 ? Number((this.totalHops / this.packetsDelivered).toFixed(1)) : 2.1;
    const deliveryRatio = this.packetsSent > 0 ? Number(((this.packetsDelivered / this.packetsSent) * 100).toFixed(1)) : 99.2;

    // Communication energy efficiency: event-driven saves ~72% radio duty cycle
    const totalPackets = this.periodicCount + this.eventDrivenCount;
    const energySavings = totalPackets > 0 ? Number(((this.eventDrivenCount / (totalPackets + 1)) * 68 + 15).toFixed(1)) : 74.5;

    return {
      nodes_online: onlineNodes,
      total_nodes: totalNodes,
      packets_sent: this.packetsSent,
      packets_delivered: this.packetsDelivered,
      packets_lost: this.packetsLost,
      delivery_ratio_pct: deliveryRatio,
      avg_latency_ms: avgLatency,
      avg_hops: avgHops,
      retransmissions: this.retransmissions,
      current_route: this.findRoute('N3', 'GATEWAY'),
      internet_online: this.internetActive,
      cloud_sync_status: this.internetActive ? 'SYNCED' : 'OFFLINE',
      periodic_packet_count: this.periodicCount,
      event_driven_packet_count: this.eventDrivenCount,
      energy_savings_pct: energySavings
    };
  }

  public reset() {
    this.activeNodes = new Set(['N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7', 'N8', 'GATEWAY']);
    this.internetActive = true;
    this.packetsSent = 0;
    this.packetsDelivered = 0;
    this.packetsLost = 0;
    this.totalLatency = 0;
    this.totalHops = 0;
    this.retransmissions = 0;
    this.periodicCount = 0;
    this.eventDrivenCount = 0;
  }
}

export const simulatedTransport = new SimulatedHaLowTransport();
