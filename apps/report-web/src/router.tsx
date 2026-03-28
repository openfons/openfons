import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter
} from '@tanstack/react-router';
import { ReportPage } from './pages/report-page';

const rootRoute = createRootRoute({
  component: () => <Outlet />
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <p className="page-shell">Open a report at /reports/$reportId</p>
});

const reportRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reports/$reportId',
  component: () => {
    const { reportId } = reportRoute.useParams();
    return <ReportPage reportId={reportId} />;
  }
});

const routeTree = rootRoute.addChildren([indexRoute, reportRoute]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
