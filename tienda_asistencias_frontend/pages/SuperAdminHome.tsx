import React, { useEffect, useState } from "react";
import {  View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, ScrollView, Alert, Modal, RefreshControl} from "react-native";
import { useAuth } from "../context/useAuth";
import api from "../api";

interface Tienda {
  id: number;
  nombre: string;
  direccion: string;
  telefono: string;
}

interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  id_tienda?: number;
}

type TabType = 'tiendas' | 'admins' | 'dashboard';

export default function SuperAdminHome() {
  const { user, logout } = useAuth();
  
  // Estados para tiendas
  const [tiendas, setTiendas] = useState<Tienda[]>([]);
  const [nombreTienda, setNombreTienda] = useState("");
  const [direccionTienda, setDireccionTienda] = useState("");
  const [telefonoTienda, setTelefonoTienda] = useState("");
  
  // Estados para admins
  const [admins, setAdmins] = useState<Usuario[]>([]);
  const [nombreAdmin, setNombreAdmin] = useState("");
  const [emailAdmin, setEmailAdmin] = useState("");
  const [passwordAdmin, setPasswordAdmin] = useState("");
  const [tiendaSelectedAdmin, setTiendaSelectedAdmin] = useState<number | null>(null);
  
  // Estados de UI
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [refreshing, setRefreshing] = useState(false);
  const [modalTiendaVisible, setModalTiendaVisible] = useState(false);
  const [modalAdminVisible, setModalAdminVisible] = useState(false);
  const [editingTienda, setEditingTienda] = useState<Tienda | null>(null);
  const [loading, setLoading] = useState(false);

  // Estados para dashboard
  const [stats, setStats] = useState({
    totalTiendas: 0,
    totalAdmins: 0,
    totalEmpleados: 0
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    await Promise.all([
      fetchTiendas(),
      fetchAdmins(),
      fetchStats()
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  };

  // ===============================
  // FUNCIONES PARA TIENDAS
  // ===============================

  const fetchTiendas = async () => {
    try {
      console.log("Fetching tiendas...");
      const res = await api.get("/tiendas");
      console.log("Tiendas response:", res.data);
      
      // Validar que la respuesta sea un array
      const data = Array.isArray(res.data) ? res.data : [];
      
      // Mapear id_tienda a id si es necesario para consistencia en el frontend
      const mappedData = data.map(tienda => ({
        ...tienda,
        id: tienda.id_tienda || tienda.id
      }));
      
      console.log("Tiendas mapped:", mappedData);
      setTiendas(mappedData);
    } catch (error) {
      console.error("Error fetching tiendas:", error);
      Alert.alert("Error", "No se pudieron cargar las tiendas");
      setTiendas([]); // Establecer array vacío en caso de error
    }
  };

  const crearTienda = async () => {
    if (!nombreTienda.trim() || !direccionTienda.trim()) {
      Alert.alert("Error", "Nombre y dirección son obligatorios");
      return;
    }

    setLoading(true);
    try {
      await api.post("/tiendas", { 
        nombre: nombreTienda.trim(), 
        direccion: direccionTienda.trim(), 
        telefono: telefonoTienda.trim() 
      });
      
      setNombreTienda("");
      setDireccionTienda("");
      setTelefonoTienda("");
      setModalTiendaVisible(false);
      
      await fetchTiendas();
      await fetchStats();
      Alert.alert("Éxito", "Tienda creada correctamente");
    } catch (error) {
      console.error("Error creating tienda:", error);
      Alert.alert("Error", "No se pudo crear la tienda");
    } finally {
      setLoading(false);
    }
  };

  const editarTienda = async () => {
    if (!editingTienda || !nombreTienda.trim() || !direccionTienda.trim()) {
      Alert.alert("Error", "Nombre y dirección son obligatorios");
      return;
    }

    setLoading(true);
    try {
      console.log("Editando tienda ID:", editingTienda.id);
      
      await api.put(`/tiendas/${editingTienda.id}`, {
        nombre: nombreTienda.trim(),
        direccion: direccionTienda.trim(), 
        telefono: telefonoTienda.trim()
      });
      
      resetTiendaForm();
      await fetchTiendas();
      await fetchStats();
      Alert.alert("Éxito", "Tienda actualizada correctamente");
    } catch (error) {
      console.error("Error updating tienda:", error);
      let errorMessage = "No se pudo actualizar la tienda";
      
      if (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as any).response === "object" &&
        (error as any).response !== null &&
        "data" in (error as any).response &&
        typeof (error as any).response.data === "object" &&
        (error as any).response.data !== null &&
        "message" in (error as any).response.data
      ) {
        errorMessage = (error as any).response.data.message;
      }
      
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const eliminarTienda = (tienda: Tienda) => {
    Alert.alert(
      "Confirmar eliminación",
      `¿Estás seguro de eliminar la tienda "${tienda.nombre}"? Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Eliminar", 
          style: "destructive",
          onPress: async () => {
            try {
              console.log("Eliminando tienda ID:", tienda.id);
              
              await api.delete(`/tiendas/${tienda.id}`);
              await fetchTiendas();
              await fetchStats();
              Alert.alert("Éxito", "Tienda eliminada correctamente");
            } catch (error) {
              console.error("Error deleting tienda:", error);
              
              let errorMessage = "No se pudo eliminar la tienda";
              
              if (
                typeof error === "object" &&
                error !== null &&
                "response" in error &&
                typeof (error as any).response === "object" &&
                (error as any).response !== null
              ) {
                const response = (error as any).response;
                if (response.status === 400) {
                  errorMessage = response.data?.message || "La tienda tiene datos relacionados y no puede eliminarse";
                } else if (response.data?.message) {
                  errorMessage = response.data.message;
                }
              }
              
              Alert.alert("Error", errorMessage);
            }
          }
        }
      ]
    );
  };

  const openEditTienda = (tienda: Tienda) => {
    setEditingTienda(tienda);
    setNombreTienda(tienda.nombre);
    setDireccionTienda(tienda.direccion);
    setTelefonoTienda(tienda.telefono);
    setModalTiendaVisible(true);
  };

  const resetTiendaForm = () => {
    setNombreTienda("");
    setDireccionTienda("");
    setTelefonoTienda("");
    setEditingTienda(null);
    setModalTiendaVisible(false);
  };

  // ===============================
  // FUNCIONES PARA ADMINS
  // ===============================

  const fetchAdmins = async () => {
    try {
      const res = await api.get("/usuarios");

      // Validar que la respuesta sea un array y filtrar admins
      
      const data = Array.isArray(res.data) ? res.data : [];
      const adminUsers = data.filter((u: Usuario) => u.rol === "admin");
      setAdmins(adminUsers);
    } catch (error) {
      console.error("Error fetching admins:", error);
      Alert.alert("Error", "No se pudieron cargar los administradores");
      setAdmins([]); // Establecer array vacío en caso de error
    }
  };

  const crearAdmin = async () => {
    if (!nombreAdmin.trim() || !emailAdmin.trim() || !passwordAdmin.trim() || !tiendaSelectedAdmin) {
      Alert.alert("Error", "Todos los campos son obligatorios");
      return;
    }

    setLoading(true);
    try {
      await api.post("/usuarios/admin", {
        nombre: nombreAdmin.trim(),
        email: emailAdmin.trim(),
        password: passwordAdmin.trim(),
        id_tienda: tiendaSelectedAdmin
      });
      
      resetAdminForm();
      await fetchAdmins();
      await fetchStats();
      Alert.alert("Éxito", "Administrador creado correctamente");
    } catch (error) {
      console.error("Error creating admin:", error);
      Alert.alert("Error", "No se pudo crear el administrador");
    } finally {
      setLoading(false);
    }
  };

  const eliminarAdmin = (admin: Usuario) => {
    Alert.alert(
      "Confirmar eliminación",
      `¿Estás seguro de eliminar al administrador "${admin.nombre}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive", 
          onPress: async () => {
            try {
              await api.delete(`/usuarios/${admin.id}`);
              await fetchAdmins();
              await fetchStats();
              Alert.alert("Éxito", "Administrador eliminado correctamente");
            } catch (error) {
              console.error("Error deleting admin:", error);
              Alert.alert("Error", "No se pudo eliminar el administrador");
            }
          }
        }
      ]
    );
  };

  const resetAdminForm = () => {
    setNombreAdmin("");
    setEmailAdmin("");
    setPasswordAdmin("");
    setTiendaSelectedAdmin(null);
    setModalAdminVisible(false);
  };

  // ===============================
  // FUNCIONES PARA DASHBOARD
  // ===============================

  const fetchStats = async () => {
    try {
      const [tiendasRes, usuariosRes] = await Promise.all([
        api.get("/tiendas"),
        api.get("/usuarios")
      ]);
      
      const usuarios = usuariosRes.data;
      
      setStats({
        totalTiendas: tiendasRes.data.length,
        totalAdmins: usuarios.filter((u: Usuario) => u.rol === "admin").length,
        totalEmpleados: usuarios.filter((u: Usuario) => u.rol === "empleado").length
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  // ===============================
  // COMPONENTES DE RENDER
  // ===============================

  const renderTienda = ({ item }: { item: Tienda }) => {
    if (!item) return null; // Protección adicional
    
    return (
      <View style={styles.itemContainer}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle}>{item.nombre || "Sin nombre"}</Text>
          <Text style={styles.itemSubtitle}>{item.direccion || "Sin dirección"}</Text>
          <Text style={styles.itemDetail}>📞 {item.telefono || "Sin teléfono"}</Text>
        </View>
        <View style={styles.itemActions}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.editButton]} 
            onPress={() => openEditTienda(item)}
          >
            <Text style={styles.actionButtonText}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]} 
            onPress={() => eliminarTienda(item)}
          >
            <Text style={styles.actionButtonText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderAdmin = ({ item }: { item: Usuario }) => {
    if (!item) return null; // Protección adicional
    
    const tienda = tiendas.find(t => t.id === item.id_tienda);
    return (
      <View style={styles.itemContainer}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle}>{item.nombre || "Sin nombre"}</Text>
          <Text style={styles.itemSubtitle}>{item.email || "Sin email"}</Text>
          <Text style={styles.itemDetail}>🏪 {tienda?.nombre || "Sin tienda"}</Text>
        </View>
        <View style={styles.itemActions}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]} 
            onPress={() => eliminarAdmin(item)}
          >
            <Text style={styles.actionButtonText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderTiendaSelector = () => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>Tienda:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {tiendas.map((tienda) => (
          <TouchableOpacity
            key={tienda.id}
            style={[
              styles.tiendaSelector,
              tiendaSelectedAdmin === tienda.id && styles.tiendaSelectorSelected
            ]}
            onPress={() => setTiendaSelectedAdmin(tienda.id)}
          >
            <Text style={[
              styles.tiendaSelectorText,
              tiendaSelectedAdmin === tienda.id && styles.tiendaSelectorTextSelected
            ]}>
              {tienda.nombre}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderDashboard = () => (
    <ScrollView 
      style={styles.dashboardContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.welcomeText}>¡Bienvenido, {user?.nombre}! 👋</Text>
      
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalTiendas}</Text>
          <Text style={styles.statLabel}>Tiendas</Text>
          <Text style={styles.statIcon}>🏪</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalAdmins}</Text>
          <Text style={styles.statLabel}>Gerentes</Text>
          <Text style={styles.statIcon}>👨‍💼</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalEmpleados}</Text>
          <Text style={styles.statLabel}>Empleados</Text>
          <Text style={styles.statIcon}>👤</Text>
        </View>
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.quickActionButton} 
          onPress={() => {
            setActiveTab('tiendas');
            setModalTiendaVisible(true);
          }}
        >
          <Text style={styles.quickActionText}>➕ Nueva Tienda</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.quickActionButton} 
          onPress={() => {
            setActiveTab('admins');
            setModalAdminVisible(true);
          }}
        >
          <Text style={styles.quickActionText}>👨‍💼 Nuevo Admin</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Super Administrador</Text>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'dashboard' && styles.activeTab]}
          onPress={() => setActiveTab('dashboard')}
        >
          <Text style={[styles.tabText, activeTab === 'dashboard' && styles.activeTabText]}>
            📊 Dashboard
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'tiendas' && styles.activeTab]}
          onPress={() => setActiveTab('tiendas')}
        >
          <Text style={[styles.tabText, activeTab === 'tiendas' && styles.activeTabText]}>
            🏪 Tiendas
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'admins' && styles.activeTab]}
          onPress={() => setActiveTab('admins')}
        >
          <Text style={[styles.tabText, activeTab === 'admins' && styles.activeTabText]}>
            👨‍💼 Admins
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'dashboard' && renderDashboard()}
        
        {activeTab === 'tiendas' && (
          <View style={styles.tabContent}>
            <View style={styles.tabHeader}>
              <Text style={styles.tabTitle}>Gestión de Tiendas</Text>
              <TouchableOpacity 
                style={styles.addButton} 
                onPress={() => setModalTiendaVisible(true)}
              >
                <Text style={styles.addButtonText}>+ Agregar</Text>
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={tiendas}
              keyExtractor={(item, index) => item?.id?.toString() || index.toString()}
              renderItem={renderTienda}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}
        
        {activeTab === 'admins' && (
          <View style={styles.tabContent}>
            <View style={styles.tabHeader}>
              <Text style={styles.tabTitle}>Administradores</Text>
              <TouchableOpacity 
                style={styles.addButton} 
                onPress={() => setModalAdminVisible(true)}
              >
                <Text style={styles.addButtonText}>+ Agregar</Text>
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={admins}
              keyExtractor={(item, index) => item?.id?.toString() || index.toString()}
              renderItem={renderAdmin}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}
      </View>

      {/* Modal para Tienda */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalTiendaVisible}
        onRequestClose={resetTiendaForm}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingTienda ? 'Editar Tienda' : 'Nueva Tienda'}
            </Text>
            
            <TextInput
              style={styles.input}
              placeholder="Nombre de la tienda"
              value={nombreTienda}
              onChangeText={setNombreTienda}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Dirección"
              value={direccionTienda}
              onChangeText={setDireccionTienda}
              multiline
            />
            
            <TextInput
              style={styles.input}
              placeholder="Teléfono (opcional)"
              value={telefonoTienda}
              onChangeText={setTelefonoTienda}
              keyboardType="phone-pad"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={resetTiendaForm}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]} 
                onPress={editingTienda ? editarTienda : crearTienda}
                disabled={loading}
              >
                <Text style={styles.saveButtonText}>
                  {loading ? 'Guardando...' : (editingTienda ? 'Actualizar' : 'Crear')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para Admin */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalAdminVisible}
        onRequestClose={resetAdminForm}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nuevo Administrador</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Nombre completo"
              value={nombreAdmin}
              onChangeText={setNombreAdmin}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={emailAdmin}
              onChangeText={setEmailAdmin}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              value={passwordAdmin}
              onChangeText={setPasswordAdmin}
              secureTextEntry
            />
            
            {renderTiendaSelector()}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={resetAdminForm}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]} 
                onPress={crearAdmin}
                disabled={loading}
              >
                <Text style={styles.saveButtonText}>
                  {loading ? 'Creando...' : 'Crear'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2196F3',
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  logoutText: {
    color: 'white',
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#2196F3',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#2196F3',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  dashboardContainer: {
    flex: 1,
    padding: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  statIcon: {
    fontSize: 24,
    marginTop: 10,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 10,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  quickActionText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  tabContent: {
    flex: 1,
    padding: 20,
  },
  tabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  tabTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  itemContainer: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  itemSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  itemDetail: {
    fontSize: 12,
    color: '#999',
  },
  itemActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    borderRadius: 20,
    marginLeft: 5,
    minWidth: 35,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#FF9800',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 25,
    borderRadius: 15,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    marginBottom: 15,
    borderRadius: 10,
    fontSize: 16,
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  tiendaSelector: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
  },
  tiendaSelectorSelected: {
    backgroundColor: '#2196F3',
  },
  tiendaSelectorText: {
    color: '#666',
    fontWeight: '600',
  },
  tiendaSelectorTextSelected: {
    color: 'white',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  saveButton: {
    backgroundColor: '#2196F3',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});