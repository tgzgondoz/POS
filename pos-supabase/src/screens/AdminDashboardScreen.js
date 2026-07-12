import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AuthService from '../services/AuthService';
import { getDatabaseInstance, ref, onValue } from '../config/firebase';

const AdminDashboardScreen = ({ user, onLogout }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    admins: 0,
    cashiers: 0,
    activeUsers: 0
  });
  
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'cashier'
  });

  useEffect(() => {
    loadUsers();
    loadSystemStats();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const usersList = await AuthService.getUsers();
    setUsers(usersList);
    calculateStats(usersList);
    setLoading(false);
  };

  const calculateStats = (usersList) => {
    const totalUsers = usersList.length;
    const admins = usersList.filter(u => u.role === 'admin').length;
    const cashiers = usersList.filter(u => u.role === 'cashier').length;
    const activeUsers = usersList.filter(u => u.isActive).length;
    setStats({ totalUsers, admins, cashiers, activeUsers });
  };

  const loadSystemStats = () => {
    const db = getDatabaseInstance();
    
    const productsRef = ref(db, 'products');
    onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      const products = data ? Object.keys(data).length : 0;
    });
    
    const salesRef = ref(db, 'sales');
    onValue(salesRef, (snapshot) => {
      const data = snapshot.val();
      const sales = data ? Object.keys(data).length : 0;
    });
  };

  const handleAddUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.fullName) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    try {
      await AuthService.registerUser(newUser.email, newUser.password, newUser.fullName, newUser.role);
      Alert.alert('Success', 'User added successfully');
      setModalVisible(false);
      setNewUser({ email: '', password: '', fullName: '', role: 'cashier' });
      loadUsers();
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      await AuthService.toggleUserStatus(userId, !currentStatus);
      Alert.alert('Success', `User ${!currentStatus ? 'activated' : 'deactivated'}`);
      loadUsers();
    } catch (error) {
      Alert.alert('Error', 'Failed to update user status');
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    Alert.alert(
      'Change Role',
      `Change user role to ${newRole}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await AuthService.updateUserRole(userId, newRole);
              Alert.alert('Success', 'Role updated successfully');
              loadUsers();
            } catch (error) {
              Alert.alert('Error', 'Failed to update role');
            }
          }
        }
      ]
    );
  };

  const handleDeleteUser = async (userId, userName) => {
    if (userId === user.id) {
      Alert.alert('Error', 'You cannot delete your own account');
      return;
    }
    
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${userName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await AuthService.deleteUser(userId);
              Alert.alert('Success', 'User deleted successfully');
              loadUsers();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete user');
            }
          }
        }
      ]
    );
  };

  const renderUserItem = ({ item }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <View style={styles.userAvatar}>
          <Icon name="person" size={24} color="#fff" />
        </View>
        <View style={styles.userDetails}>
          <Text style={styles.userName}>{item.fullName}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          <View style={styles.userMeta}>
            <View style={[styles.roleBadge, item.role === 'admin' ? styles.adminBadge : styles.cashierBadge]}>
              <Text style={[styles.roleText, item.role === 'admin' ? styles.adminRoleText : styles.cashierRoleText]}>
                {item.role?.toUpperCase()}
              </Text>
            </View>
            <View style={[styles.statusBadge, item.isActive ? styles.activeBadge : styles.inactiveBadge]}>
              <Text style={[styles.statusText, item.isActive ? styles.activeStatusText : styles.inactiveStatusText]}>
                {item.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
        </View>
      </View>
      
      <View style={styles.userActions}>
        {item.role !== 'admin' && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.promoteBtn]}
            onPress={() => handleChangeRole(item.id, 'admin')}
          >
            <Icon name="arrow-up" size={16} color="#fff" />
            <Text style={styles.actionBtnText}>Promote</Text>
          </TouchableOpacity>
        )}
        {item.role !== 'cashier' && item.id !== user.id && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.demoteBtn]}
            onPress={() => handleChangeRole(item.id, 'cashier')}
          >
            <Icon name="arrow-down" size={16} color="#fff" />
            <Text style={styles.actionBtnText}>Demote</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionBtn, item.isActive ? styles.deactivateBtn : styles.activateBtn]}
          onPress={() => handleToggleStatus(item.id, item.isActive)}
        >
          <Icon name={item.isActive ? "close" : "checkmark"} size={16} color="#fff" />
          <Text style={styles.actionBtnText}>{item.isActive ? 'Deactivate' : 'Activate'}</Text>
        </TouchableOpacity>
        {item.id !== user.id && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={() => handleDeleteUser(item.id, item.fullName)}
          >
            <Icon name="trash-bin" size={16} color="#fff" />
            <Text style={styles.actionBtnText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#b90d0b" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalUsers}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, styles.adminStat]}>{stats.admins}</Text>
            <Text style={styles.statLabel}>Admins</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, styles.cashierStat]}>{stats.cashiers}</Text>
            <Text style={styles.statLabel}>Cashiers</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, styles.activeStat]}>{stats.activeUsers}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>User Management</Text>
          <TouchableOpacity style={styles.addUserBtn} onPress={() => setModalVisible(true)}>
            <Icon name="add" size={24} color="#b90d0b" />
            <Text style={styles.addUserText}>Add User</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={users}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="people" size={64} color="#020204" />
              <Text style={styles.emptyText}>No users found</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />

        <Modal
          visible={modalVisible}
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add New User</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Icon name="close" size={24} color="#020204" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  value={newUser.fullName}
                  onChangeText={(text) => setNewUser({ ...newUser, fullName: text })}
                  placeholder="Enter full name"
                  placeholderTextColor="#020204"
                />

                <Text style={styles.label}>Email *</Text>
                <TextInput
                  style={styles.input}
                  value={newUser.email}
                  onChangeText={(text) => setNewUser({ ...newUser, email: text })}
                  placeholder="Enter email"
                  placeholderTextColor="#020204"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />

                <Text style={styles.label}>Password *</Text>
                <TextInput
                  style={styles.input}
                  value={newUser.password}
                  onChangeText={(text) => setNewUser({ ...newUser, password: text })}
                  placeholder="Enter password"
                  placeholderTextColor="#020204"
                  secureTextEntry
                />

                <Text style={styles.label}>Role *</Text>
                <View style={styles.roleSelector}>
                  <TouchableOpacity
                    style={[styles.roleOption, newUser.role === 'admin' && styles.roleOptionActive]}
                    onPress={() => setNewUser({ ...newUser, role: 'admin' })}
                  >
                    <Text style={[styles.roleOptionText, newUser.role === 'admin' && styles.roleOptionTextActive]}>
                      Admin
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.roleOption, newUser.role === 'cashier' && styles.roleOptionActive]}
                    onPress={() => setNewUser({ ...newUser, role: 'cashier' })}
                  >
                    <Text style={[styles.roleOptionText, newUser.role === 'cashier' && styles.roleOptionTextActive]}>
                      Cashier
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.submitBtn} onPress={handleAddUser}>
                  <Text style={styles.submitBtnText}>Add User</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </SafeAreaView>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#0e0b05',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#b90d0b',
    marginBottom: 4,
  },
  adminStat: {
    color: '#ff4444',
  },
  cashierStat: {
    color: '#4caf50',
  },
  activeStat: {
    color: '#b90d0b',
  },
  statLabel: {
    fontSize: 12,
    color: '#020204',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0e0b05',
  },
  addUserBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#b90d0b20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  addUserText: {
    color: '#b90d0b',
    marginLeft: 4,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#0e0b05',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#b90d0b',
  },
  userInfo: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#b90d0b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0e0b05',
  },
  userEmail: {
    fontSize: 13,
    color: '#020204',
    marginTop: 2,
  },
  userMeta: {
    flexDirection: 'row',
    marginTop: 6,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  adminBadge: {
    backgroundColor: '#ff444420',
  },
  cashierBadge: {
    backgroundColor: '#4caf5020',
  },
  roleText: {
    fontSize: 10,
    fontWeight: '600',
  },
  adminRoleText: {
    color: '#ff4444',
  },
  cashierRoleText: {
    color: '#4caf50',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeBadge: {
    backgroundColor: '#4caf5020',
  },
  inactiveBadge: {
    backgroundColor: '#02020420',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  activeStatusText: {
    color: '#4caf50',
  },
  inactiveStatusText: {
    color: '#020204',
  },
  userActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  promoteBtn: {
    backgroundColor: '#b90d0b',
  },
  demoteBtn: {
    backgroundColor: '#ff8800',
  },
  deactivateBtn: {
    backgroundColor: '#ff4444',
  },
  activateBtn: {
    backgroundColor: '#4caf50',
  },
  deleteBtn: {
    backgroundColor: '#ff4444',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 11,
    marginLeft: 4,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0e0b05',
  },
  modalForm: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
    color: '#0e0b05',
  },
  input: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    color: '#0e0b05',
  },
  roleSelector: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  roleOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    marginHorizontal: 4,
    borderRadius: 8,
  },
  roleOptionActive: {
    backgroundColor: '#b90d0b',
  },
  roleOptionText: {
    color: '#020204',
  },
  roleOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: '#b90d0b',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 40,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  emptyContainer: {
    paddingTop: 100,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#020204',
    marginTop: 12,
  },
});

export default AdminDashboardScreen;