export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { jobEvents } from '@/lib/webhooks/events';
import type { JobUpdateEvent } from '@/lib/webhooks/types';

/**
 * Server-Sent Events endpoint for real-time job status updates
 *
 * Usage:
 * - Connect to GET /api/jobs/events for all job updates
 * - Connect to GET /api/jobs/events?jobId=xxx for specific job updates
 * - Connect to GET /api/jobs/events?trackId=xxx for specific track updates
 *
 * Events are sent in the format:
 * event: job_update
 * data: {"jobId": "...", "status": "COMPLETED", ...}
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const jobId = searchParams.get('jobId');
  const trackId = searchParams.get('trackId');

  // Create a transform stream for SSE
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      const connectEvent = `event: connected\ndata: ${JSON.stringify({ message: 'Connected to job events' })}\n\n`;
      controller.enqueue(encoder.encode(connectEvent));

      // Set up heartbeat to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          const heartbeat = `:heartbeat ${Date.now()}\n\n`;
          controller.enqueue(encoder.encode(heartbeat));
        } catch {
          // Connection closed
          clearInterval(heartbeatInterval);
        }
      }, 30000); // Send heartbeat every 30 seconds

      // Event handler for job updates
      const handleJobUpdate = (event: JobUpdateEvent) => {
        // Filter by jobId or trackId if specified
        if (jobId && event.jobId !== jobId) return;
        if (trackId && event.trackId.toString() !== trackId) return;

        try {
          const sseEvent = `event: job_update\ndata: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(sseEvent));
        } catch {
          // Connection closed, cleanup will happen on abort
        }
      };

      // Subscribe to job events
      let unsubscribe: () => void;
      if (jobId) {
        unsubscribe = jobEvents.subscribeToJob(jobId, handleJobUpdate);
      } else {
        unsubscribe = jobEvents.subscribeToAll(handleJobUpdate);
      }

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
        unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable buffering in nginx
    },
  });
}
