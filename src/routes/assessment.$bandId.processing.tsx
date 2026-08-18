import { createFileRoute, Navigate } from "@tanstack/react-router";

/**
 * Retired route.
 *
 * This screen used to animate a fake ten-step "AI pipeline" on timers and then
 * navigate to a hardcoded demo result. It analysed nothing. The real pipeline
 * lives at /screening/$activityId/analysis, which samples actual video frames.
 *
 * Kept as a redirect so any bookmarked or in-flight link lands somewhere real.
 * Delete this file — along with the record and upload siblings — once you can
 * run a build to regenerate routeTree.gen.ts.
 */
export const Route = createFileRoute("/assessment/$bandId/processing")({
  component: () => <Navigate to="/screening" replace />,
});
