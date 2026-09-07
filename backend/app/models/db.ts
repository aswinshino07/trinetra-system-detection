import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { SensorReading, NetworkPacket, GatewayAlert, SystemEvent, SatelliteHotspot } from './types.js';

const DB_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'trinetra.sqlite');

export class DatabaseService {
  private db: DatabaseSync;

  constructor() {
    this.db = new DatabaseSync(DB_PATH);
    this.initSchema();
  }

  private initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS nodes (
        id TEXT PRIMARY KEY,
        name TEXT,
        zone TEXT,
        lat REAL,
        lng REAL,
        battery REAL,
        status TEXT,
        sampling_interval INTEGER,
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS sensor_readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        node_id TEXT,
        timestamp TEXT,
        temperature REAL,
        humidity REAL,
        smoke REAL,
        co REAL,
        acoustic REAL,
        fire_signature REAL
      );

      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        timestamp TEXT,
        type TEXT,
        source TEXT,
        description TEXT,
        severity TEXT
      );

      CREATE TABLE IF NOT EXISTS packets (
        id TEXT PRIMARY KEY,
        timestamp TEXT,
        source TEXT,
        destination TEXT,
        type TEXT,
        priority TEXT,
        hop_count INTEGER,
        path TEXT,
        status TEXT,
        latency_ms INTEGER
      );

      CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY,
        timestamp TEXT,
        title TEXT,
        zone TEXT,
        source_node TEXT,
        fire_signature REAL,
        satellite_evidence INTEGER,
        ground_evidence INTEGER,
        neighbour_verification TEXT,
        network_path TEXT,
        severity TEXT,
        status TEXT
      );

      CREATE TABLE IF NOT EXISTS satellite_observations (
        id TEXT PRIMARY KEY,
        zone TEXT,
        lat REAL,
        lng REAL,
        confidence REAL,
        source TEXT,
        detection_time TEXT,
        risk_level TEXT
      );
    `);
  }

  public recordReading(r: SensorReading) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO sensor_readings (node_id, timestamp, temperature, humidity, smoke, co, acoustic, fire_signature)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        r.node_id,
        r.timestamp,
        r.temperature,
        r.humidity,
        r.smoke,
        r.co,
        r.acoustic,
        r.fire_signature || 0.0
      );
    } catch (err) {
      console.error('Error writing sensor reading to SQLite:', err);
    }
  }

  public getRecentReadings(nodeId: string, limit = 50): SensorReading[] {
    try {
      const stmt = this.db.prepare(`
        SELECT node_id, timestamp, temperature, humidity, smoke, co, acoustic, fire_signature
        FROM sensor_readings
        WHERE node_id = ?
        ORDER BY id DESC
        LIMIT ?
      `);
      const rows = stmt.all(nodeId, limit) as any[];
      return rows.reverse();
    } catch (err) {
      console.error('Error fetching sensor readings:', err);
      return [];
    }
  }

  public recordEvent(e: SystemEvent) {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO events (id, timestamp, type, source, description, severity)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      stmt.run(e.id, e.timestamp, e.type, e.source, e.description, e.severity);
    } catch (err) {
      console.error('Error logging event to SQLite:', err);
    }
  }

  public getRecentEvents(limit = 100): SystemEvent[] {
    try {
      const stmt = this.db.prepare(`
        SELECT id, timestamp, type, source, description, severity
        FROM events
        ORDER BY timestamp DESC
        LIMIT ?
      `);
      return (stmt.all(limit) as unknown) as SystemEvent[];
    } catch (err) {
      console.error('Error getting events:', err);
      return [];
    }
  }

  public recordPacket(p: NetworkPacket) {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO packets (id, timestamp, source, destination, type, priority, hop_count, path, status, latency_ms)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        p.id,
        p.timestamp,
        p.source,
        p.destination,
        p.type,
        p.priority,
        p.hop_count,
        JSON.stringify(p.path),
        p.status,
        p.latency_ms
      );
    } catch (err) {
      console.error('Error recording packet in SQLite:', err);
    }
  }

  public getRecentPackets(limit = 50): any[] {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM packets ORDER BY timestamp DESC LIMIT ?
      `);
      return stmt.all(limit);
    } catch (err) {
      return [];
    }
  }

  public recordAlert(a: GatewayAlert) {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO alerts (id, timestamp, title, zone, source_node, fire_signature, satellite_evidence, ground_evidence, neighbour_verification, network_path, severity, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        a.id,
        a.timestamp,
        a.title,
        a.zone,
        a.source_node,
        a.fire_signature,
        a.satellite_evidence ? 1 : 0,
        a.ground_evidence ? 1 : 0,
        a.neighbour_verification,
        a.network_path,
        a.severity,
        a.status
      );
    } catch (err) {
      console.error('Error logging alert to SQLite:', err);
    }
  }

  public getRecentAlerts(limit = 20): GatewayAlert[] {
    try {
      const stmt = this.db.prepare(`
        SELECT id, timestamp, title, zone, source_node, fire_signature,
               satellite_evidence, ground_evidence, neighbour_verification,
               network_path, severity, status
        FROM alerts
        ORDER BY timestamp DESC
        LIMIT ?
      `);
      const rows = stmt.all(limit) as any[];
      return rows.map((r) => ({
        ...r,
        satellite_evidence: Boolean(r.satellite_evidence),
        ground_evidence: Boolean(r.ground_evidence),
        evidence_summary: []
      }));
    } catch (err) {
      return [];
    }
  }

  public recordSatelliteObservation(s: SatelliteHotspot) {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO satellite_observations (id, zone, lat, lng, confidence, source, detection_time, risk_level)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(s.id, s.zone, s.lat, s.lng, s.confidence, s.source, s.detection_time, s.risk_level);
    } catch (err) {
      console.error('Error recording satellite observation:', err);
    }
  }

  public clearAll() {
    try {
      this.db.exec(`
        DELETE FROM sensor_readings;
        DELETE FROM events;
        DELETE FROM packets;
        DELETE FROM alerts;
        DELETE FROM satellite_observations;
      `);
    } catch (err) {
      console.error('Error clearing SQLite tables:', err);
    }
  }
}

export const dbService = new DatabaseService();
