import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import ProductManagementScreen from '../screens/ProductManagementScreen';
import AddEditProductScreen from '../screens/AddEditProductScreen';

const Stack = createStackNavigator();

const ProductStack = () => {
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
        name="ProductList" 
        component={ProductManagementScreen}
        options={{ 
          title: 'Products',
          headerLeft: () => null,
        }}
      />
      <Stack.Screen 
        name="AddEditProduct" 
        component={AddEditProductScreen}
        options={{ 
          title: 'Product Form',
        }}
      />
    </Stack.Navigator>
  );
};

export default ProductStack;