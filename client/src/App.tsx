import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth-context";
import { AdminAuthProvider } from "@/contexts/admin-auth-context";
import { ScrollToTop } from "@/components/scroll-to-top";
import { AdminRouteGuard } from "@/components/admin-auth/admin-route-guard";
import Events from "@/pages/events";
import EventDetails from "@/pages/event-details";
import CustomerIdentification from "@/pages/customer-identification";
import CustomerRegistration from "@/pages/customer-registration";
import AddressConfirmation from "@/pages/address-confirmation";
import NewAddress from "@/pages/new-address";
import KitInformation from "@/pages/kit-information";
import Payment from "@/pages/payment";
import OrderConfirmation from "@/pages/order-confirmation";
import MyOrders from "@/pages/my-orders";
import OrderDetails from "@/pages/order-details";
import Profile from "@/pages/profile";
import ProfileEdit from "@/pages/profile-edit";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminEventForm from "@/pages/admin-event-form";
import AdminEvents from "@/pages/admin-events";
import AdminEventEdit from "@/pages/admin-event-edit";
import AdminOrders from "@/pages/admin-orders";
import AdminCustomers from "@/pages/admin-customers";
import AdminReports from "@/pages/admin-reports";
import { AdminLogin } from "@/components/admin-auth/admin-login";
import AdminUsers from "@/pages/admin-users";
import { AdminEmailLogs } from "@/pages/admin-email-logs";
import { AdminEmailTest } from "@/pages/admin-email-test";
import AdminCepZones from "@/pages/admin-cep-zones";
import AdminCoupons from "@/pages/admin/coupons";
import AdminPolicies from "@/pages/admin/policies";
import Landing from "@/pages/landing";

function Router() {
  return (
    <ScrollToTop>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/eventos" component={Events} />
      <Route path="/events/:id" component={EventDetails} />
      <Route path="/events/:id/register" component={CustomerRegistration} />
      <Route path="/events/:id/address" component={AddressConfirmation} />
      <Route path="/events/:id/address/new" component={NewAddress} />

      <Route path="/events/:id/kits" component={KitInformation} />
      <Route path="/events/:id/payment" component={Payment} />
      <Route path="/order/:orderNumber/confirmation" component={OrderConfirmation} />
      <Route path="/events/:id/confirmation" component={OrderConfirmation} />
      <Route path="/my-orders" component={MyOrders} />
      <Route path="/orders/:orderNumber" component={OrderDetails} />
      <Route path="/profile" component={Profile} />
      <Route path="/profile/edit" component={ProfileEdit} />
      <Route path="/profile/address/new" component={NewAddress} />
      <Route path="/profile/address/:id/edit" component={NewAddress} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={CustomerRegistration} />
      <Route path="/admin/login" >
        {() => <AdminLogin />}
      </Route>
      <Route path="/admin" >
        {() => (
          <AdminRouteGuard>
            <AdminDashboard />
          </AdminRouteGuard>
        )}
      </Route>
      <Route path="/admin/events" >
        {() => (
          <AdminRouteGuard>
            <AdminEvents />
          </AdminRouteGuard>
        )}
      </Route>
      <Route path="/admin/events/new" >
        {() => (
          <AdminRouteGuard>
            <AdminEventForm />
          </AdminRouteGuard>
        )}
      </Route>
      <Route path="/admin/events/:id/edit" >
        {() => (
          <AdminRouteGuard>
            <AdminEventEdit />
          </AdminRouteGuard>
        )}
      </Route>
      <Route path="/admin/orders" >
        {() => (
          <AdminRouteGuard>
            <AdminOrders />
          </AdminRouteGuard>
        )}
      </Route>
      <Route path="/admin/customers" >
        {() => (
          <AdminRouteGuard>
            <AdminCustomers />
          </AdminRouteGuard>
        )}
      </Route>
      <Route path="/admin/reports" >
        {() => (
          <AdminRouteGuard>
            <AdminReports />
          </AdminRouteGuard>
        )}
      </Route>
      <Route path="/admin/users" >
        {() => (
          <AdminRouteGuard requiredRole="super_admin">
            <AdminUsers />
          </AdminRouteGuard>
        )}
      </Route>
      <Route path="/admin/email-logs" >
        {() => (
          <AdminRouteGuard>
            <AdminEmailLogs />
          </AdminRouteGuard>
        )}
      </Route>
      <Route path="/admin/email-test" >
        {() => (
          <AdminRouteGuard>
            <AdminEmailTest />
          </AdminRouteGuard>
        )}
      </Route>
      <Route path="/admin/cep-zones" >
        {() => (
          <AdminRouteGuard>
            <AdminCepZones />
          </AdminRouteGuard>
        )}
      </Route>
      <Route path="/admin/coupons" >
        {() => (
          <AdminRouteGuard>
            <AdminCoupons />
          </AdminRouteGuard>
        )}
      </Route>
      <Route path="/admin/policies" >
        {() => (
          <AdminRouteGuard>
            <AdminPolicies />
          </AdminRouteGuard>
        )}
      </Route>
      <Route component={NotFound} />
    </Switch>
    </ScrollToTop>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AdminAuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AdminAuthProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
