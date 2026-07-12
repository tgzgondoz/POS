import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import LoginScreen from './src/screens/LoginScreen';
import { initializeFirebase } from './src/config/firebase';
import AuthService from './src/services/AuthService';

// Initialize default admin and cashier users with strong passwords for Eddie Tuckshop 2026
const initializeDefaultUsers = async () => {
  try {
    const users = await AuthService.getUsers();
    if (users.length === 0) {
      console.log('Creating default users for Eddie Tuckshop...');
      // Create default admin with strong password for 2026
      await AuthService.registerUser('admin@eddietuckshop.com', 'Eddie@Admin2026#Secure', 'Eddie Admin', 'admin');
      // Create default cashier with strong password for 2026
      await AuthService.registerUser('staff@eddietuckshop.com', 'Eddie@Staff2026#Strong', 'Eddie Staff', 'cashier');
      console.log('Default Eddie Tuckshop users created successfully for 2026');
    } else {
      // Check if default users exist, if not create them
      const adminExists = users.some(user => user.email === 'admin@eddietuckshop.com');
      const staffExists = users.some(user => user.email === 'staff@eddietuckshop.com');
      
      if (!adminExists) {
        console.log('Creating missing admin user...');
        await AuthService.registerUser('admin@eddietuckshop.com', 'Eddie@Admin2026#Secure', 'Eddie Admin', 'admin');
      }
      
      if (!staffExists) {
        console.log('Creating missing staff user...');
        await AuthService.registerUser('staff@eddietuckshop.com', 'Eddie@Staff2026#Strong', 'Eddie Staff', 'cashier');
      }
    }
  } catch (error) {
    console.error('Error initializing default users:', error);
  }
};

const MainApp = () => {
  const { user, login, logout, loading } = useAuth();
  const [firebaseReady, setFirebaseReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await initializeFirebase();
        await initializeDefaultUsers();
        setFirebaseReady(true);
      } catch (error) {
        console.error('Firebase initialization error:', error);
        Alert.alert('Error', 'Failed to initialize app: ' + error.message);
      }
    };
    init();
  }, []);

  const handleLogin = (userData) => {
    login(userData);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AuthService.logout();
            await logout();
          }
        }
      ]
    );
  };

  if (!firebaseReady || loading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#b90d0b" />
          <Text style={styles.loadingText}>Loading Eddie Tuckshop 2026...</Text>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (!user) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <LoginScreen onLogin={handleLogin} />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <NavigationContainer>
      <SafeAreaProvider>
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
          <AppNavigator onLogout={handleLogout} />
        </SafeAreaView>
      </SafeAreaProvider>
    </NavigationContainer>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#020204',
    fontWeight: '500',
  },
});

export default App;