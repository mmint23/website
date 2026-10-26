// ------------------------------------------------------------------
// Minimaler WebSocket-Server (RFC 6455) nur mit Node-Bordmitteln: Textnachrichten (JSON), Ping/Pong, Schließen.
// Reicht für die Abgaben im Klassenzimmer; Binärdaten und Erweiterungen (Kompression) werden nicht unterstützt.
// ------------------------------------------------------------------
import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const PING_ALLE = 20_000;   // ms; antwortet ein Gerät nicht bis zum nächsten Ping, wird die Verbindung getrennt

export class Verbindung extends EventEmitter {
  constructor(socket, req, maxGroesse) {
    super();
    this.socket = socket;
    this.req = req;
    this.maxGroesse = maxGroesse;
    this.puffer = Buffer.alloc(0);
    this.teile = [];          // Fragmente einer Nachricht
    this.lebt = true;
    this.offen = true;
    socket.setNoDelay(true);
    socket.on('data', daten => this.empfangen(daten));
    socket.on('close', () => this.beendet());
    socket.on('error', () => socket.destroy());
    this.ping = setInterval(() => {
      if (!this.lebt) return socket.destroy();
      this.lebt = false;
      this.rahmen(0x9, Buffer.alloc(0));
    }, PING_ALLE);
  }

  // Objekt als JSON-Textnachricht senden
  senden(daten) {
    if (this.offen) this.rahmen(0x1, Buffer.from(JSON.stringify(daten)));
  }

  schliessen(code = 1000) {
    if (!this.offen) return;
    const nutzlast = Buffer.alloc(2);
    nutzlast.writeUInt16BE(code);
    this.rahmen(0x8, nutzlast);
    this.offen = false;
    this.socket.end();
  }

  rahmen(opcode, nutzlast) {
    const n = nutzlast.length;
    const kopf = n < 126 ? Buffer.alloc(2) : n < 65536 ? Buffer.alloc(4) : Buffer.alloc(10);
    kopf[0] = 0x80 | opcode;   // FIN + Opcode; Server-Nachrichten sind unmaskiert
    if (n < 126) kopf[1] = n;
    else if (n < 65536) {
      kopf[1] = 126;
      kopf.writeUInt16BE(n, 2);
    } else {
      kopf[1] = 127;
      kopf.writeBigUInt64BE(BigInt(n), 2);
    }
    if (!this.socket.destroyed) this.socket.write(Buffer.concat([kopf, nutzlast]));
  }

  empfangen(daten) {
    this.puffer = Buffer.concat([this.puffer, daten]);
    for (;;) {
      if (this.puffer.length < 2) return;
      const fin = (this.puffer[0] & 0x80) !== 0;
      const opcode = this.puffer[0] & 0x0f;
      const maskiert = (this.puffer[1] & 0x80) !== 0;
      let laenge = this.puffer[1] & 0x7f;
      let pos = 2;
      if (laenge === 126) {
        if (this.puffer.length < 4) return;
        laenge = this.puffer.readUInt16BE(2);
        pos = 4;
      } else if (laenge === 127) {
        if (this.puffer.length < 10) return;
        const gross = this.puffer.readBigUInt64BE(2);
        laenge = gross > BigInt(this.maxGroesse) ? Infinity : Number(gross);
        pos = 10;
      }
      // Clients müssen maskieren; zu große Nachrichten werden abgewiesen (1009: Nachricht zu groß)
      if (!maskiert) return this.schliessen(1002);
      const gesamt = this.teile.reduce((summe, t) => summe + t.length, 0) + laenge;
      if (gesamt > this.maxGroesse) return this.schliessen(1009);
      if (this.puffer.length < pos + 4 + laenge) return;
      const maske = this.puffer.subarray(pos, pos + 4);
      const nutzlast = Buffer.from(this.puffer.subarray(pos + 4, pos + 4 + laenge));
      for (let i = 0; i < nutzlast.length; i++) nutzlast[i] ^= maske[i & 3];
      this.puffer = this.puffer.subarray(pos + 4 + laenge);

      if (opcode === 0x8) return this.schliessen();
      if (opcode === 0x9) { this.rahmen(0xA, nutzlast); continue; }
      if (opcode === 0xA) { this.lebt = true; continue; }
      if (opcode === 0x1 || opcode === 0x0) {
        this.lebt = true;
        this.teile.push(nutzlast);
        if (!fin) continue;
        const text = Buffer.concat(this.teile).toString('utf8');
        this.teile = [];
        let nachricht;
        try {
          nachricht = JSON.parse(text);
        } catch {
          continue;   // kein JSON: ignorieren
        }
        if (nachricht && typeof nachricht === 'object') this.emit('nachricht', nachricht);
        continue;
      }
      return this.schliessen(1003);   // Binärdaten werden nicht unterstützt
    }
  }

  beendet() {
    if (this.ping === null) return;
    clearInterval(this.ping);
    this.ping = null;
    this.offen = false;
    this.emit('ende');
  }
}

// Handshake für eine Upgrade-Anfrage; gibt die Verbindung zurück oder null (dann ist der Socket schon zu)
export function annehmen(req, socket, maxGroesse) {
  const schluessel = req.headers['sec-websocket-key'];
  // Nur Seiten vom selben Server dürfen sich verbinden (Origin passt zu Host)
  const herkunft = req.headers.origin;
  let gleicheHerkunft = false;
  try {
    gleicheHerkunft = !herkunft || new URL(herkunft).host === req.headers.host;
  } catch { /* ungültige Herkunft */ }
  if (!schluessel || req.headers.upgrade?.toLowerCase() !== 'websocket' || !gleicheHerkunft) {
    socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
    return null;
  }
  const antwort = crypto.createHash('sha1').update(schluessel + GUID).digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n'
    + `Sec-WebSocket-Accept: ${antwort}\r\n\r\n`);
  return new Verbindung(socket, req, maxGroesse);
}
