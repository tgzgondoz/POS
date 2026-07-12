import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import InventoryScreen from '../screens/InventoryScreen';
import ProductDetailsScreen from '../screens/ProductDetailsScreen';

const Stack = createStackNavigator();

const InventoryStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#b90d0b',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: '#e0e0e0',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },
        headerTitleAlign: 'center',
        headerBackTitleVisible: false,
        headerBackImage: () => (
          <Icon name="chevron-back" size={24} color="#fff" style={{ marginLeft: 8 }} />
        ),
      }}
    >
      <Stack.Screen 
        name="InventoryList" 
        component={InventoryScreen}
        options={{ 
          title: 'Inventory Dashboard',
          headerLeft: () => null,
        }}
      />
      <Stack.Screen 
        name="ProductDetails" 
        component={ProductDetailsScreen}
        options={{ 
          title: 'Product Details',
        }}
      />
    </Stack.Navigator>
  );
};

export default InventoryStack;