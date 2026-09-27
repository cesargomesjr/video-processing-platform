interface Histogram {
  sum: number;
  count: number;
  buckets: Map<number, number>;
}

const HISTOGRAM_BUCKETS = [0.1, 0.5, 1, 2, 5, 10, 30];

export class MetricsService {
  private readonly counters = new Map<string, number>();
  private readonly gauges = new Map<string, number>();
  private readonly histograms = new Map<string, Histogram>();

  public incrementVideos(status: string): void {
    this.incrementCounter(`videos_total{status="${status}"}`);
  }

  public incrementChunks(status: string): void {
    this.incrementCounter(`chunks_total{status="${status}"}`);
  }

  public incrementRetry(queue: string): void {
    this.incrementCounter(`retry_total{queue="${queue}"}`);
  }

  public setQueueDepth(queue: string, depth: number): void {
    this.gauges.set(`queue_depth{queue="${queue}"}`, depth);
  }

  public setActiveWorkers(count: number): void {
    this.gauges.set('active_workers', count);
  }

  public observeVideoProcessingDuration(seconds: number): void {
    this.observeHistogram('video_processing_duration_seconds', seconds);
  }

  public observeHttpRequestDuration(seconds: number): void {
    this.observeHistogram('http_request_duration_seconds', seconds);
  }

  public render(): string {
    const lines: string[] = [];

    lines.push('# HELP videos_total Videos by final status.');
    lines.push('# TYPE videos_total counter');
    lines.push('# HELP chunks_total Chunks by final status.');
    lines.push('# TYPE chunks_total counter');
    lines.push('# HELP retry_total Retry attempts by queue.');
    lines.push('# TYPE retry_total counter');

    for (const [name, value] of [...this.counters.entries()].sort()) {
      lines.push(`${name} ${value}`);
    }

    lines.push('# HELP queue_depth Messages waiting in a queue.');
    lines.push('# TYPE queue_depth gauge');
    lines.push('# HELP active_workers Active workers.');
    lines.push('# TYPE active_workers gauge');

    for (const [name, value] of [...this.gauges.entries()].sort()) {
      lines.push(`${name} ${value}`);
    }

    this.renderHistogram(lines, 'video_processing_duration_seconds');
    this.renderHistogram(lines, 'http_request_duration_seconds');

    return `${lines.join('\n')}\n`;
  }

  private incrementCounter(name: string): void {
    this.counters.set(name, (this.counters.get(name) ?? 0) + 1);
  }

  private observeHistogram(name: string, value: number): void {
    const histogram = this.histograms.get(name) ?? {
      sum: 0,
      count: 0,
      buckets: new Map<number, number>(),
    };

    histogram.sum += value;
    histogram.count += 1;

    for (const bucket of HISTOGRAM_BUCKETS) {
      if (value <= bucket) {
        histogram.buckets.set(bucket, (histogram.buckets.get(bucket) ?? 0) + 1);
      }
    }

    this.histograms.set(name, histogram);
  }

  private renderHistogram(lines: string[], name: string): void {
    const histogram = this.histograms.get(name);

    lines.push(`# HELP ${name} ${name.replaceAll('_', ' ')}.`);
    lines.push(`# TYPE ${name} histogram`);

    for (const bucket of HISTOGRAM_BUCKETS) {
      lines.push(`${name}_bucket{le="${bucket}"} ${histogram?.buckets.get(bucket) ?? 0}`);
    }

    lines.push(`${name}_bucket{le="+Inf"} ${histogram?.count ?? 0}`);
    lines.push(`${name}_sum ${histogram?.sum ?? 0}`);
    lines.push(`${name}_count ${histogram?.count ?? 0}`);
  }
}
