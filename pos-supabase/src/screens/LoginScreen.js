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
  Image,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AuthService from '../services/AuthService';

const LoginScreen = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const validateEmail = (text) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (text && !emailRegex.test(text)) {
      setEmailError('Please enter a valid email');
    } else {
      setEmailError('');
    }
    setEmail(text);
  };

  const handleLogin = async () => {
    setEmailError('');
    setPasswordError('');

    if (!email.trim()) {
      setEmailError('Email is required');
      return;
    }
    if (!password.trim()) {
      setPasswordError('Password is required');
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
    setEmailError('');
    setPasswordError('');
  };

  const demoStaff = () => {
    setEmail('staff@nitrogo.com');
    setPassword('Nitro@Staff2026#Strong');
    setEmailError('');
    setPasswordError('');
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.logoContainer}>
            {/* Circular border container */}
            <View style={styles.logoCircleWrapper}>
              <View style={styles.logoCircle}>
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
              </View>
            </View>
            <Text style={styles.title}>NITRO GO</Text>
            <Text style={styles.subtitle}>Point of Sale System</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputWrapper}>
              <View style={[styles.inputContainer, emailError && styles.inputError]}>
                <Icon name="mail" size={20} color="#020204" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#999"
                  value={email}
                  onChangeText={validateEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
              {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
            </View>

            <View style={styles.inputWrapper}>
              <View style={[styles.inputContainer, passwordError && styles.inputError]}>
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
              {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
            </View>

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.loadingText}>Logging in...</Text>
                </View>
              ) : (
                <Text style={styles.loginButtonText}>Login</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
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
  logoCircleWrapper: {
    marginBottom: 16,
    shadowColor: '#b90d0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  logoCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    borderColor: '#b90d0b',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  fallbackLogo: {
    backgroundColor: '#f0f0f0',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    height: 100,
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
  inputWrapper: {
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#020204',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#b90d0b',
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
  errorText: {
    color: '#b90d0b',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  loginButton: {
    backgroundColor: '#b90d0b',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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
    textAlign: 'center',
  },
  demoButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  adminButton: {
    backgroundColor: '#fff5f5',
    borderColor: '#b90d0b',
  },
  staffButton: {
    backgroundColor: '#f0f7ff',
    borderColor: '#2c6b9e',
  },
  demoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  demoText: {
    fontSize: 14,
    color: '#0e0b05',
    fontWeight: '600',
    marginLeft: 6,
  },
  demoPassword: {
    fontSize: 12,
    color: '#666',
    marginLeft: 22,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});

export default LoginScreen;