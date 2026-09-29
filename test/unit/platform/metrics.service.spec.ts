import { MetricsService } from '../../../src/platform/metrics/metrics.service';

describe('MetricsService', () => {
  it('renders the required Prometheus series', () => {
    const metrics = new MetricsService();

    metrics.incrementVideos('COMPLETED');
    metrics.incrementChunks('COMPLETED');
    metrics.incrementRetry('video.uploaded');
    metrics.setQueueDepth('video.uploaded', 3);
    metrics.setActiveWorkers(2);
    metrics.observeVideoProcessingDuration(1.2);
    metrics.observeHttpRequestDuration(0.3);

    const text = metrics.render();

    expect(text).toContain('videos_total{status="COMPLETED"} 1');
    expect(text).toContain('chunks_total{status="COMPLETED"} 1');
    expect(text).toContain('retry_total{queue="video.uploaded"} 1');
    expect(text).toContain('queue_depth{queue="video.uploaded"} 3');
    expect(text).toContain('active_workers 2');
    expect(text).toContain('video_processing_duration_seconds_count 1');
    expect(text).toContain('http_request_duration_seconds_count 1');
  });
});
