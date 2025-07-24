import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth-context";
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
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminEventForm from "@/pages/admin-event-form";
import AdminEvents from "@/pages/admin-events";
import AdminEventEdit from "@/pages/admin-event-edit";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Events} />
      <Route path="/events/:id" component={EventDetails} />
      <Route path="/events/:id/identify" component={CustomerIdentification} />
      <Route path="/events/:id/register" component={CustomerRegistration} />
      <Route path="/events/:id/address" component={AddressConfirmation} />
      <Route path="/events/:id/address/new" component={NewAddress} />

      <Route path="/events/:id/kits" component={KitInformation} />
      <Route path="/events/:id/payment" component={Payment} />
      <Route path="/events/:id/confirmation" component={OrderConfirmation} />
      <Route path="/my-orders" component={MyOrders} />
      <Route path="/orders/:orderNumber" component={OrderDetails} />
      <Route path="/profile" component={Profile} />
      <Route path="/profile/address/new" component={NewAddress} />
      <Route path="/profile/address/:id/edit" component={NewAddress} />
      <Route path="/login" component={Login} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/events" component={AdminEvents} />
      <Route path="/admin/events/new" component={AdminEventForm} />
      <Route path="/admin/events/:id/edit" component={AdminEventEdit} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
