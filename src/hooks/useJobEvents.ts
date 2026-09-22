'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Job status enum (matches Prisma JobStatus)
 */
export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

/**
 * Job update event from SSE
 */
export type JobUpdateEvent = {
  type: 'job_update';
  jobId: string;
  trackId: number;
  status: JobStatus;
  progress?: number;
  eta?: number;
  resultUrl?: string;
  errorMessage?: string;
  completedAt?: string;
};

/**
 * Connection state for the SSE stream
 */
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * Options for useJobEvents hook
 */
export type UseJobEventsOptions = {
  /** Specific job ID to subscribe to (optional) */
  jobId?: string;
  /** Specific track ID to subscribe to (optional) */
  trackId?: number;
  /** Callback when a job update is received */
  onJobUpdate?: (event: JobUpdateEvent) => void;
  /** Callback when connection state changes */
  onConnectionChange?: (state: ConnectionState) => void;
  /** Whether to automatically reconnect on disconnect (default: true) */
  autoReconnect?: boolean;
  /** Reconnect delay in ms (default: 3000) */
  reconnectDelay?: number;
  /** Whether the hook is enabled (default: true) */
  enabled?: boolean;
};

/**
 * Hook for subscribing to real-time job status updates via SSE
 *
 * @example
 * // Subscribe to all job updates
 * const { connectionState } = useJobEvents({
 *   onJobUpdate: (event) => {
 *     console.log('Job updated:', event);
 *   },
 * });
 *
 * @example
 * // Subscribe to a specific job
 * const { connectionState, lastEvent } = useJobEvents({
 *   jobId: 'some-uuid',
 *   onJobUpdate: (event) => {
 *     if (event.status === 'COMPLETED') {
 *       console.log('Job completed! Result:', event.resultUrl);
 *     }
 *   },
 * });
 *
 * @example
 * // Subscribe by track ID
 * const { connectionState } = useJobEvents({
 *   trackId: 12345,
 *   onJobUpdate: handleJobUpdate,
 * });
 */
export function useJobEvents(options: UseJobEventsOptions = {}) {
  const {
    jobId,
    trackId,
    onJobUpdate,
    onConnectionChange,
    autoReconnect = true,
    reconnectDelay = 3000,
    enabled = true,
  } = options;

  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [lastEvent, setLastEvent] = useState<JobUpdateEvent | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Update connection state and notify callback
  const updateConnectionState = useCallback(
    (state: ConnectionState) => {
      if (!mountedRef.current) return;
      setConnectionState(state);
      onConnectionChange?.(state);
    },
    [onConnectionChange]
  );

  // Handle incoming job update events
  const handleJobUpdate = useCallback(
    (event: MessageEvent) => {
      if (!mountedRef.current) return;

      try {
        const data = JSON.parse(event.data) as JobUpdateEvent;
        setLastEvent(data);
        onJobUpdate?.(data);
      } catch (error) {
        console.error('Failed to parse job update event:', error);
      }
    },
    [onJobUpdate]
  );

  // Connect to the SSE endpoint
  const connect = useCallback(() => {
    if (!mountedRef.current || !enabled) return;

    // Clear any existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // Build the SSE URL with optional filters
    const params = new URLSearchParams();
    if (jobId) params.set('jobId', jobId);
    if (trackId !== undefined) params.set('trackId', trackId.toString());

    const url = `/api/jobs/events${params.toString() ? `?${params.toString()}` : ''}`;

    updateConnectionState('connecting');

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      if (!mountedRef.current) return;
      updateConnectionState('connected');
    };

    eventSource.onerror = () => {
      if (!mountedRef.current) return;
      updateConnectionState('error');

      // Close the errored connection
      eventSource.close();
      eventSourceRef.current = null;

      // Attempt to reconnect if enabled
      if (autoReconnect) {
        updateConnectionState('disconnected');
        reconnectTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current && enabled) {
            connect();
          }
        }, reconnectDelay);
      }
    };

    // Listen for the connected event
    eventSource.addEventListener('connected', () => {
      if (!mountedRef.current) return;
      updateConnectionState('connected');
    });

    // Listen for job update events
    eventSource.addEventListener('job_update', handleJobUpdate);
  }, [enabled, jobId, trackId, autoReconnect, reconnectDelay, updateConnectionState, handleJobUpdate]);

  // Disconnect from the SSE endpoint
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (mountedRef.current) {
      updateConnectionState('disconnected');
    }
  }, [updateConnectionState]);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    mountedRef.current = true;

    if (enabled) {
      connect();
    }

    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  // Reconnect when jobId or trackId changes
  useEffect(() => {
    if (enabled && connectionState !== 'disconnected') {
      connect();
    }
  }, [enabled, connectionState, connect, jobId, trackId]);

  return {
    /** Current connection state */
    connectionState,
    /** Last received job update event */
    lastEvent,
    /** Manually connect to the SSE stream */
    connect,
    /** Manually disconnect from the SSE stream */
    disconnect,
    /** Whether currently connected */
    isConnected: connectionState === 'connected',
  };
}

/**
 * Hook for tracking a single job's status with automatic updates
 *
 * @example
 * const { job, isLoading, error } = useJobStatus(jobId);
 *
 * if (isLoading) return <Spinner />;
 * if (error) return <Error message={error} />;
 * if (job?.status === 'COMPLETED') return <Audio src={job.resultUrl} />;
 */
export function useJobStatus(jobId: string | null | undefined) {
  const [job, setJob] = useState<{
    id: string;
    trackId: number;
    status: JobStatus;
    resultUrl?: string;
    errorMessage?: string;
    progress?: number;
    eta?: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial job status
  useEffect(() => {
    if (!jobId) {
      setJob(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    fetch(`/api/jobs/${jobId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.job) {
          setJob({
            id: data.job.id,
            trackId: data.job.trackId,
            status: data.job.status,
            resultUrl: data.job.resultUrl,
            errorMessage: data.job.errorMessage,
            progress: data.job.progress,
            eta: data.job.eta,
          });
        } else {
          setError(data.message || 'Failed to fetch job');
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch job');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [jobId]);

  // Subscribe to real-time updates
  const { connectionState } = useJobEvents({
    jobId: jobId || undefined,
    enabled: !!jobId && job?.status !== 'COMPLETED' && job?.status !== 'FAILED',
    onJobUpdate: (event) => {
      setJob((prev) =>
        prev
          ? {
              ...prev,
              status: event.status,
              resultUrl: event.resultUrl ?? prev.resultUrl,
              errorMessage: event.errorMessage ?? prev.errorMessage,
              progress: event.progress ?? prev.progress,
              eta: event.eta ?? prev.eta,
            }
          : null
      );
    },
  });

  return {
    job,
    isLoading,
    error,
    connectionState,
    isComplete: job?.status === 'COMPLETED',
    isFailed: job?.status === 'FAILED',
    isProcessing: job?.status === 'PROCESSING' || job?.status === 'PENDING',
  };
}
