import { createFileRoute, Navigate } from "@tanstack/react-router";

/**
 * Retired route.
 *
 * This screen showed scripted compression and upload progress bars — including
 * a staged "connection dropped at 62%" failure — without making any network
 * request. Real upload and analysis happen at /screening/$activityId/upload.
 *
 * Kept as a redirect so any bookmarked or in-flight link lands somewhere real.
 * Delete this file once you can run a build to regenerate routeTree.gen.ts.
 */
export const Route = createFileRoute("/assessment/$bandId/upload")({
  component: () => <Navigate to="/screening" replace />,
});
