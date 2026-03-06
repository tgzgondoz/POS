import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import POS from './components/POS';
import Products from './components/Products';
import Inventory from './components/Inventory';
import Orders from './components/Orders';
import Users from './components/Users';
import Categories from './components/Categories';
import Reports from './components/Reports';
import './App.css';

function App() {
  const [auth, setAuth] = useState({
    isAuthenticated: false,
    user: null
  });

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const user = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (user && token) {
      setAuth({
        isAuthenticated: true,
        user: JSON.parse(user)
      });
    }
  };

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route 
            path="/login" 
            element={
              auth.isAuthenticated ? 
              <Navigate to="/dashboard" /> : 
              <Login setAuth={setAuth} />
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              auth.isAuthenticated ? 
              <Dashboard auth={auth} setAuth={setAuth} /> : 
              <Navigate to="/login" />
            } 
          />
          <Route 
            path="/pos" 
            element={
              auth.isAuthenticated ? 
              <POS auth={auth} /> : 
              <Navigate to="/login" />
            } 
          />
          <Route 
            path="/products" 
            element={
              auth.isAuthenticated ? 
              <Products auth={auth} /> : 
              <Navigate to="/login" />
            } 
          />
          <Route 
            path="/inventory" 
            element={
              auth.isAuthenticated ? 
              <Inventory auth={auth} /> : 
              <Navigate to="/login" />
            } 
          />
          <Route 
            path="/orders" 
            element={
              auth.isAuthenticated ? 
              <Orders auth={auth} /> : 
              <Navigate to="/login" />
            } 
          />
          <Route 
            path="/users" 
            element={
              auth.isAuthenticated ? 
              <Users auth={auth} /> : 
              <Navigate to="/login" />
            } 
          />
          <Route 
            path="/categories" 
            element={
              auth.isAuthenticated ? 
              <Categories auth={auth} /> : 
              <Navigate to="/login" />
            } 
          />
          <Route 
            path="/reports" 
            element={
              auth.isAuthenticated && auth.user?.role === 'admin' ? 
              <Reports auth={auth} /> : 
              <Navigate to="/dashboard" />
            } 
          />
          <Route 
            path="/" 
            element={<Navigate to="/login" />} 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;