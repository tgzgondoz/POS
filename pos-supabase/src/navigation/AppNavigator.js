import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TouchableOpacity, View, Text, Image, StyleSheet } from 'react-native';
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
          height: 65,
          paddingBottom: 8,
          paddingTop: 8,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          elevation: 8,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
        headerStyle: {
          backgroundColor: '#FFFFFF',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: '#E5E7EB',
        },
        headerTintColor: '#0e0b05',
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
        },
        headerTitleAlign: 'center',
        headerLeft: () => (
          <View style={styles.headerLeft}>
            <View style={styles.logoContainer}>
              <Image 
                source={require('../../assets/logo.png')} 
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.logoText}>POS</Text>
          </View>
        ),
        headerRight: () => (
          <TouchableOpacity 
            onPress={onLogout} 
            style={styles.logoutButton}
            activeOpacity={0.7}
          >
            <Icon name="log-out-outline" size={22} color="#6B7280" />
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

const styles = StyleSheet.create({
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  logoContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#b90d0b15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  logoText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '700',
    color: '#b90d0b',
  },
  logoutButton: {
    marginRight: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
});

export default AppNavigator;