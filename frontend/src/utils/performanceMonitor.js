const PERFORMANCE_THRESHOLDS = {
  LOAD_TIME: 2000,      // 2초
  PARSE_TIME: 1000,     // 1초
  RENDER_TIME: 500      // 500ms
};

class PerformanceMonitor {
  constructor() {
    this.timers = new Map();
    this.measurements = {
      load: [],
      parse: [],
      render: [],
      vectorstore_init: []
    };
  }

  startTimer(type) {
    if (!this.measurements[type]) {
      this.measurements[type] = [];
    }
    const timerId = `${type}_${Date.now()}`;
    this.timers.set(timerId, {
      type,
      startTime: performance.now()
    });
    return timerId;
  }

  endTimer(timerId) {
    const timer = this.timers.get(timerId);
    if (!timer) {
      console.warn(`Timer ${timerId} not found`);
      return;
    }

    const endTime = performance.now();
    const duration = endTime - timer.startTime;

    if (!this.measurements[timer.type]) {
      this.measurements[timer.type] = [];
    }
    
    this.measurements[timer.type].push(duration);
    this.timers.delete(timerId);
    
    // 성능 임계값 초과 시 경고
    if (duration > PERFORMANCE_THRESHOLDS[timer.type.toUpperCase()]) {
      console.warn(`성능 경고: ${timer.type} 작업이 ${duration}ms 소요됨`);
    }

    return duration;
  }

  getAverageDuration(type) {
    const measurements = this.measurements[type];
    if (!measurements || measurements.length === 0) return 0;
    
    const sum = measurements.reduce((acc, val) => acc + val, 0);
    return sum / measurements.length;
  }

  getAllMetrics() {
    const metrics = {};
    for (const [type, measurements] of Object.entries(this.measurements)) {
      metrics[type] = {
        average: this.getAverageDuration(type),
        count: measurements.length
      };
    }
    return metrics;
  }

  clearMetrics() {
    Object.keys(this.measurements).forEach(key => {
      this.measurements[key] = [];
    });
    this.timers.clear();
  }
}

export const performanceMonitor = new PerformanceMonitor(); 