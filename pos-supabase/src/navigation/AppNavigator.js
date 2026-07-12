import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TouchableOpacity, View, Text, Image } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';

// Import screens
import POSScreen from '../screens/POSScreen';
import ProductManagementScreen from '../screens/ProductManagementScreen';
import SalesHistoryScreen from '../screens/SalesHistoryScreen';
import InventoryScreen from '../screens/InventoryScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import CategoryManagementScreen from '../screens/CategoryManagementScreen';
import RestrictedScreen from '../screens/RestrictedScreen';

const Tab = createBottomTabNavigator();

const AppNavigator = ({ onLogout }) => {
  const { user, isAdmin, isCashier } = useAuth();
  
  if (!user) {
    return null;
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'POS') {
            iconName = focused ? 'cart' : 'cart-outline';
          } else if (route.name === 'Products') {
            iconName = focused ? 'cube' : 'cube-outline';
          } else if (route.name === 'Sales') {
            iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          } else if (route.name === 'Inventory') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Admin') {
            iconName = focused ? 'shield' : 'shield-outline';
          } else if (route.name === 'Categories') {
            iconName = focused ? 'folder' : 'folder-outline';
          }
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#b90d0b',
        tabBarInactiveTintColor: '#020204',
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        headerStyle: {
          
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
        },
        headerTintColor: '#0e0b05',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },
        headerTitleAlign: 'center',
        headerLeft: () => (
          <View style={{ marginLeft: 16, flexDirection: 'row', alignItems: 'center' }}>
            <Image 
              source={require('../../assets/logo.png')} 
              style={{ width: 32, height: 32, borderRadius: 16 }}
              resizeMode="contain"
            />
            <Text style={{ marginLeft: 8, fontSize: 14, fontWeight: '600', color: '#020204' }}>
              POS
            </Text>
          </View>
        ),
        headerRight: () => (
          <TouchableOpacity 
            onPress={onLogout} 
            style={{ marginRight: 16 }}
          >
            <Icon name="log-out" size={22} color="#0e0b05" />
          </TouchableOpacity>
        ),
      })}
    >
      {/* POS - Both roles can access */}
      <Tab.Screen 
        name="POS" 
        component={POSScreen}
        options={{ 
          title: 'Point of Sale',
          headerShown: true,
          tabBarLabel: 'POS',
        }}
      />
      
      {/* Products - Only Admin, Cashier sees restricted message */}
      <Tab.Screen 
        name="Products" 
        component={isAdmin() ? ProductManagementScreen : RestrictedScreen}
        options={{ 
          title: 'Product Management',
          headerShown: true,
          tabBarLabel: 'Products',
        }}
        initialParams={{ screenName: 'Product Management' }}
      />
      
      {/* Categories - Only Admin */}
      <Tab.Screen 
        name="Categories" 
        component={isAdmin() ? CategoryManagementScreen : RestrictedScreen}
        options={{ 
          title: 'Category Management',
          headerShown: true,
          tabBarLabel: 'Categories',
        }}
        initialParams={{ screenName: 'Category Management' }}
      />
      
      {/* Sales - Both roles can access */}
      <Tab.Screen 
        name="Sales" 
        component={SalesHistoryScreen}
        options={{ 
          title: 'Sales History',
          headerShown: true,
          tabBarLabel: 'Sales',
        }}
      />
      
      {/* Inventory - Only Admin, Cashier sees restricted message */}
      <Tab.Screen 
        name="Inventory" 
        component={isAdmin() ? InventoryScreen : RestrictedScreen}
        options={{ 
          title: 'Inventory Dashboard',
          headerShown: true,
          tabBarLabel: 'Inventory',
        }}
        initialParams={{ screenName: 'Inventory Dashboard' }}
      />
      
    </Tab.Navigator>
  );
};

export default AppNavigator;