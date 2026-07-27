/**
 * Event log pembelajaran Simulasi Strategi Gobak Sodor.
 * Mencatat kejadian penting satu sesi (bukan setiap frame) sebagai bukti
 * untuk Hasil Simulasi Strategi, Analisis Strategi, dan Data untuk LKPD.
 */
export class EventLog {
  constructor() {
    this.events = [];
    this.startedAt = 0;
  }

  start() {
    this.events = [];
    this.startedAt = performance.now();
  }

  elapsed() {
    return (performance.now() - this.startedAt) / 1000;
  }

  log(type, data = {}) {
    this.events.push({
      type,
      timestamp: Date.now(),
      elapsedTime: Number(this.elapsed().toFixed(2)),
      ...data
    });
  }

  getEvents() {
    return this.events;
  }

  getEventsByType(type) {
    return this.events.filter((event) => event.type === type);
  }

  countByType(type) {
    return this.getEventsByType(type).length;
  }
}
