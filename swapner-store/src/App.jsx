import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import StoreLayout from './components/StoreLayout'
import Home from './pages/Home'
import Shop from './pages/Shop'
import ProductPage from './pages/ProductPage'
import Checkout from './pages/Checkout'
import OrderDone from './pages/OrderDone'
import AdminLayout from './pages/admin/AdminLayout'
import Login from './pages/Login'
import Account from './pages/Account'
import Dashboard from './pages/admin/Dashboard'
import Pos from './pages/admin/Pos'
import { SalesList, SaleAdjust } from './pages/admin/Sales'
import Purchases from './pages/admin/Purchases'
import { Returns, Damage } from './pages/admin/ReturnsDamage'
import Stock from './pages/admin/Stock'
import Products from './pages/admin/Products'
import Orders from './pages/admin/Orders'
import { DeliveryZones, PaymentMethods } from './pages/admin/SimplePages'
import { Accounts, Reports } from './pages/admin/AccountsReports'
import { Categories, Brands, Units, ExpenseCategories, Expenses, Customers, Suppliers, Banners, Promotions } from './pages/admin/SimplePages'
import { Settings, Users, Backup, About } from './pages/admin/SettingsPages'

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

export default function App() {
  return (
    <>
      <ScrollTop />
      <Routes>
        <Route element={<StoreLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/product/:id" element={<ProductPage />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order/:no" element={<OrderDone />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Login />} />
          <Route path="/account" element={<Account />} />
        </Route>
        <Route path="/admin/login" element={<Navigate to="/login" replace />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="pos" element={<Pos />} />
          <Route path="sales" element={<SalesList />} />
          <Route path="adjust" element={<SaleAdjust />} />
          <Route path="purchase" element={<Purchases />} />
          <Route path="returns" element={<Returns />} />
          <Route path="damage" element={<Damage />} />
          <Route path="stock" element={<Stock />} />
          <Route path="orders" element={<Orders />} />
          <Route path="banners" element={<Banners />} />
          <Route path="delivery" element={<DeliveryZones />} />
          <Route path="payments" element={<PaymentMethods />} />
          <Route path="products" element={<Products />} />
          <Route path="categories" element={<Categories />} />
          <Route path="brands" element={<Brands />} />
          <Route path="units" element={<Units />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="expense-categories" element={<ExpenseCategories />} />
          <Route path="suppliers" element={<Suppliers />} />
          <Route path="customers" element={<Customers />} />
          <Route path="accounts" element={<Accounts />} />
          <Route path="promotions" element={<Promotions />} />
          <Route path="reports" element={<Reports />} />
          <Route path="users" element={<Users />} />
          <Route path="backup" element={<Backup />} />
          <Route path="settings" element={<Settings />} />
          <Route path="about" element={<About />} />
        </Route>
        <Route path="*" element={<StoreLayout />}>
          <Route path="*" element={<div className="wrap empty-sf" style={{ margin: '60px auto' }}>পেজটি পাওয়া যায়নি।</div>} />
        </Route>
      </Routes>
    </>
  )
}
