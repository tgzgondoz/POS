import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AuthService from '../services/AuthService';

const LoginScreen = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter email');
      return;
    }
    if (!password.trim()) {
      Alert.alert('Error', 'Please enter password');
      return;
    }

    setLoading(true);
    try {
      const result = await AuthService.loginUser(email, password);
      if (result.success && result.user) {
        const userData = {
          id: result.user.id,
          email: result.user.email,
          fullName: result.user.fullName,
          role: result.user.role,
          isActive: result.user.isActive
        };
        onLogin(userData);
      } else {
        Alert.alert('Login Failed', 'Invalid credentials');
      }
    } catch (error) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const demoAdmin = () => {
    setEmail('admin@nitrogo.com');
    setPassword('Nitro@Admin2026#Secure');
  };

  const demoStaff = () => {
    setEmail('staff@nitrogo.com');
    setPassword('Nitro@Staff2026#Strong');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.logoContainer}>
          {!imageError ? (
            <Image 
              source={require('../../assets/logo.png')} 
              style={styles.logo}
              resizeMode="cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <View style={[styles.logo, styles.fallbackLogo]}>
              <Icon name="storefront" size={60} color="#b90d0b" />
            </View>
          )}
          <Text style={styles.title}>NITRO GO</Text>
          <Text style={styles.subtitle}>Point of Sale System</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Icon name="mail" size={20} color="#020204" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputContainer}>
            <Icon name="lock-closed" size={20} color="#020204" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <Icon name={showPassword ? "eye" : "eye-off"} size={20} color="#020204" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </TouchableOpacity>

          <View style={styles.demoContainer}>
            <Text style={styles.demoTitle}>Demo Credentials</Text>
            
            <TouchableOpacity style={styles.demoButton} onPress={demoAdmin}>
              <View style={styles.demoRow}>
                <Icon name="person" size={14} color="#020204" />
                <Text style={styles.demoText}>Admin: admin@nitrogo.com</Text>
              </View>
              <Text style={styles.demoPassword}>Pass: Nitro@Admin2026#Secure</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.demoButton} onPress={demoStaff}>
              <View style={styles.demoRow}>
                <Icon name="person-outline" size={14} color="#020204" />
                <Text style={styles.demoText}>Staff: staff@nitrogo.com</Text>
              </View>
              <Text style={styles.demoPassword}>Pass: Nitro@Staff2026#Strong</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  fallbackLogo: {
    backgroundColor: '#f0f0f0',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0e0b05',
    marginTop: 0,
  },
  subtitle: {
    fontSize: 16,
    color: '#020204',
    marginTop: 8,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 3,
    shadowColor: '#0e0b05',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#020204',
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0e0b05',
  },
  eyeIcon: {
    padding: 8,
  },
  loginButton: {
    backgroundColor: '#b90d0b',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  demoContainer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  demoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#020204',
    marginBottom: 12,
  },
  demoButton: {
    paddingVertical: 8,
    marginBottom: 8,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  demoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  demoText: {
    fontSize: 12,
    color: '#0e0b05',
    fontWeight: '500',
  },
  demoPassword: {
    fontSize: 11,
    color: '#020204',
    marginLeft: 20,
  },
});

export default LoginScreen;