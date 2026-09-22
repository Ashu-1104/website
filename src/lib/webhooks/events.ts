import type { JobUpdateEvent } from './types';

type EventCallback = (event: JobUpdateEvent) => void;

/**
 * Simple in-memory event emitter for job updates
 * In production, consider using Redis pub/sub for multi-instance support
 */
class JobEventEmitter {
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private globalListeners: Set<EventCallback> = new Set();

  /**
   * Subscribe to updates for a specific job
   */
  subscribeToJob(jobId: string, callback: EventCallback): () => void {
    if (!this.listeners.has(jobId)) {
      this.listeners.set(jobId, new Set());
    }
    this.listeners.get(jobId)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(jobId)?.delete(callback);
      if (this.listeners.get(jobId)?.size === 0) {
        this.listeners.delete(jobId);
      }
    };
  }

  /**
   * Subscribe to all job updates (useful for user-specific streams)
   */
  subscribeToAll(callback: EventCallback): () => void {
    this.globalListeners.add(callback);
    return () => {
      this.globalListeners.delete(callback);
    };
  }

  /**
   * Emit a job update event.
   * Auto-cleans job-specific listeners once the job reaches a terminal state.
   */
  emit(event: JobUpdateEvent): void {
    // Notify job-specific listeners
    const jobListeners = this.listeners.get(event.jobId);
    if (jobListeners) {
      for (const callback of jobListeners) {
        try {
          callback(event);
        } catch (error) {
          console.error('Error in job event listener:', error);
        }
      }

      // Auto-cleanup: remove listeners for completed/failed jobs to prevent memory leaks
      if (event.status === 'COMPLETED' || event.status === 'FAILED') {
        this.listeners.delete(event.jobId);
      }
    }

    // Notify global listeners
    for (const callback of this.globalListeners) {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in global event listener:', error);
      }
    }
  }

  /**
   * Get the number of active listeners (for debugging)
   */
  getListenerCount(): { jobs: number; global: number } {
    return {
      jobs: this.listeners.size,
      global: this.globalListeners.size,
    };
  }
}

// Singleton instance
export const jobEvents = new JobEventEmitter();
