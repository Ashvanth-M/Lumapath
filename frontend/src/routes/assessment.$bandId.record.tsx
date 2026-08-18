import { createFileRoute, Navigate } from "@tanstack/react-router";

/**
 * Retired route.
 *
 * This screen opened the camera and ran a timer, but never created a
 * MediaRecorder — nothing was ever captured. Its own UI admitted "recording is
 * simulated". Real capture belongs in the /screening flow once MediaRecorder is
 * implemented (roadmap task 2.1).
 *
 * Kept as a redirect so any bookmarked or in-flight link lands somewhere real.
 * Delete this file once you can run a build to regenerate routeTree.gen.ts.
 */
export const Route = createFileRoute("/assessment/$bandId/record")({
  component: () => <Navigate to="/screening" replace />,
});
