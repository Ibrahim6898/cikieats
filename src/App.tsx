import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
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
import { AdminSettings } from './pages/admin/AdminSettings';
import { Navbar } from './components/Navbar';


function AppRoutes() {
  const { user, loading: authLoading } = useAuth();
  const { isMaintenanceMode, loading: settingsLoading } = useSettings();

  if (authLoading || settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (isMaintenanceMode() && user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-red-50 rounded-[2.5rem] flex items-center justify-center mb-8 animate-pulse">
           <div className="w-12 h-12 bg-red-500 rounded-2xl flex items-center justify-center shadow-lg shadow-red-200">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
           </div>
        </div>
        <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-4 lowercase italic uppercase">Platform <span className="text-red-600">Maintenance</span></h1>
        <p className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em] max-w-md leading-relaxed">
          We are currently performing scheduled upgrades to ensure the highest quality experience. We'll be back online shortly.
        </p>
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
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminSettings />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <SettingsProvider>
        <AuthProvider>
          <CartProvider>
            <AppRoutes />
          </CartProvider>
        </AuthProvider>
      </SettingsProvider>
    </Router>
  );
}

export default App;
