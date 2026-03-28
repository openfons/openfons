import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter
} from '@tanstack/react-router';
import { OpportunityPage } from './pages/opportunity-page';

const rootRoute = createRootRoute({
  component: () => <Outlet />
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: OpportunityPage
});

const routeTree = rootRoute.addChildren([indexRoute]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
