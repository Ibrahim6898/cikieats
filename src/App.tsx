import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Auth } from './pages/Auth';
import { Home } from './pages/customer/Home';
import { Restaurant } from './pages/customer/Restaurant';
import { Cart } from './pages/customer/Cart';
import { Checkout } from './pages/customer/Checkout';
import { Orders } from './pages/customer/Orders';
import { OrderDetail } from './pages/customer/OrderDetail';
import { VendorDashboard } from './pages/vendor/VendorDashboard';
import { MenuManagement } from './pages/vendor/MenuManagement';
import { VendorOrders } from './pages/vendor/VendorOrders';
import { RiderDashboard } from './pages/rider/RiderDashboard';
import { RiderOrders } from './pages/rider/RiderOrders';
import { RiderEarnings } from './pages/rider/RiderEarnings';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminVendors } from './pages/admin/AdminVendors';
import { AdminRiders } from './pages/admin/AdminRiders';
import { AdminOrders } from './pages/admin/AdminOrders';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminReviews } from './pages/admin/AdminReviews';
import { Navbar } from './components/Navbar';


function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/auth" element={<Auth />} />

        <Route
          path="/"
          element={
            <ProtectedRoute requiredRole="customer">
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/restaurant/:id"
          element={
            <ProtectedRoute requiredRole="customer">
              <Restaurant />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cart"
          element={
            <ProtectedRoute requiredRole="customer">
              <Cart />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkout"
          element={
            <ProtectedRoute requiredRole="customer">
              <Checkout />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute requiredRole="customer">
              <Orders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/:id"
          element={
            <ProtectedRoute requiredRole="customer">
              <OrderDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/vendor"
          element={
            <ProtectedRoute requiredRole="vendor">
              <VendorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendor/menu"
          element={
            <ProtectedRoute requiredRole="vendor">
              <MenuManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendor/orders"
          element={
            <ProtectedRoute requiredRole="vendor">
              <VendorOrders />
            </ProtectedRoute>
          }
        />

        <Route
          path="/rider"
          element={
            <ProtectedRoute requiredRole="rider">
              <RiderDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rider/orders"
          element={
            <ProtectedRoute requiredRole="rider">
              <RiderOrders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rider/earnings"
          element={
            <ProtectedRoute requiredRole="rider">
              <RiderEarnings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/vendors"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminVendors />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/riders"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminRiders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminOrders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reviews"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminReviews />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <AppRoutes />
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
