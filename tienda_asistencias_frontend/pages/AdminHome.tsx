import React, { useEffect, useState } from "react";
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  TextInput, 
  StyleSheet, 
  ScrollView, 
  Alert,
  Modal,
  RefreshControl
} from "react-native";
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useAuth } from "../context/useAuth";
import api from "../api";

interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  id_tienda?: number;
}

interface Asistencia {
  id: number;
  nombre: string;
  fecha: string;
  hora_entrada?: string;
  hora_salida?: string;
}

interface Tienda {
  id: number;
  nombre: string;
  direccion: string;
  telefono?: string;
}

type TabType = 'dashboard' | 'empleados' | 'asistencias' | 'scanner';

export default function AdminHome() {
  const { user, logout } = useAuth();
  
  // Estados para empleados
  const [empleados, setEmpleados] = useState<Usuario[]>([]);
  const [nombreEmpleado, setNombreEmpleado] = useState("");
  const [emailEmpleado, setEmailEmpleado] = useState("");
  const [passwordEmpleado, setPasswordEmpleado] = useState("");
  
  // Estados para asistencias
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  
  // Estados para tienda
  const [tienda, setTienda] = useState<Tienda | null>(null);
  
  // Estados de UI
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [refreshing, setRefreshing] = useState(false);
  const [modalEmpleadoVisible, setModalEmpleadoVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Estados para scanner QR
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  // Estados para estadísticas
  const [stats, setStats] = useState({
    totalEmpleados: 0,
    asistenciasHoy: 0,
    empleadosPresentes: 0
  });

  // Actualizar fecha/hora cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    await Promise.all([
      fetchEmpleados(),
      fetchAsistencias(),
      fetchTienda(),
      fetchStats()
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  };

  // ===============================
  // FUNCIONES PARA EMPLEADOS
  // ===============================

  const fetchEmpleados = async () => {
    try {
      const res = await api.get("/usuarios");
      const data = Array.isArray(res.data) ? res.data : [];
      const empleadosData = data.filter((u: Usuario) => u.rol === "empleado");
      setEmpleados(empleadosData);
    } catch (error) {
      console.error("Error fetching empleados:", error);
      Alert.alert("Error", "No se pudieron cargar los empleados");
      setEmpleados([]);
    }
  };

  const crearEmpleado = async () => {
    if (!nombreEmpleado.trim() || !emailEmpleado.trim() || !passwordEmpleado.trim()) {
      Alert.alert("Error", "Todos los campos son obligatorios");
      return;
    }

    setLoading(true);
    try {
      await api.post("/usuarios/empleado", {
        nombre: nombreEmpleado.trim(),
        email: emailEmpleado.trim(),
        password: passwordEmpleado.trim()
      });
      
      resetEmpleadoForm();
      await fetchEmpleados();
      await fetchStats();
      Alert.alert("Éxito", "Empleado creado correctamente");
    } catch (error) {
      console.error("Error creating empleado:", error);
      Alert.alert("Error", "No se pudo crear el empleado");
    } finally {
      setLoading(false);
    }
  };

  const eliminarEmpleado = (empleado: Usuario) => {
    Alert.alert(
      "Confirmar eliminación",
      `¿Estás seguro de eliminar al empleado "${empleado.nombre}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/usuarios/${empleado.id}`);
              await fetchEmpleados();
              await fetchStats();
              Alert.alert("Éxito", "Empleado eliminado correctamente");
            } catch (error) {
              console.error("Error deleting empleado:", error);
              Alert.alert("Error", "No se pudo eliminar el empleado");
            }
          }
        }
      ]
    );
  };

  const resetEmpleadoForm = () => {
    setNombreEmpleado("");
    setEmailEmpleado("");
    setPasswordEmpleado("");
    setModalEmpleadoVisible(false);
  };

  // ===============================
  // FUNCIONES PARA ASISTENCIAS
  // ===============================

  const fetchAsistencias = async () => {
    try {
      if (user?.id_tienda) {
        const res = await api.get(`/asistencias/tienda/${user.id_tienda}`);
        const data = Array.isArray(res.data) ? res.data : [];
        setAsistencias(data);
      }
    } catch (error) {
      console.error("Error fetching asistencias:", error);
      setAsistencias([]);
    }
  };

  const registrarAsistenciaPorQR = async (empleadoId: string, tipo: 'entrada' | 'salida') => {
    try {
      await api.post("/asistencias/qr", {
        id_empleado: parseInt(empleadoId),
        tipo: tipo
      });
      
      Alert.alert("Éxito", `${tipo.charAt(0).toUpperCase() + tipo.slice(1)} registrada correctamente`);
      await fetchAsistencias();
      await fetchStats();
    } catch (error) {
      console.error("Error registering asistencia:", error);
      Alert.alert("Error", "No se pudo registrar la asistencia");
    }
  };

  // ===============================
  // FUNCIONES PARA TIENDA
  // ===============================

  const fetchTienda = async () => {
    try {
      if (user?.id_tienda) {
        const res = await api.get(`/tiendas/${user.id_tienda}`);
        setTienda(res.data);
      }
    } catch (error) {
      console.error("Error fetching tienda:", error);
      setTienda(null);
    }
  };

  const fetchStats = async () => {
    try {
      const [empleadosRes, asistenciasRes] = await Promise.all([
        api.get("/usuarios"),
        user?.id_tienda ? api.get(`/asistencias/tienda/${user.id_tienda}`) : Promise.resolve({ data: [] })
      ]);
      
      const empleadosData = Array.isArray(empleadosRes.data) ? empleadosRes.data : [];
      const asistenciasData = Array.isArray(asistenciasRes.data) ? asistenciasRes.data : [];
      
      const hoy = new Date().toISOString().split('T')[0];
      const asistenciasHoy = asistenciasData.filter((a: Asistencia) => a.fecha === hoy);
      const empleadosPresentes = asistenciasHoy.filter((a: Asistencia) => a.hora_entrada && !a.hora_salida).length;
      
      setStats({
        totalEmpleados: empleadosData.filter((u: Usuario) => u.rol === "empleado").length,
        asistenciasHoy: asistenciasHoy.length,
        empleadosPresentes: empleadosPresentes
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  // ===============================
  // FUNCIONES DE FORMATEO
  // ===============================

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDateFromString = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES');
    } catch {
      return dateString;
    }
  };

  // ===============================
  // FUNCIONES DEL SCANNER QR
  // ===============================

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    setScanned(true);
    
    // Verificar que el ID escaneado corresponde a un empleado válido
    const empleado = empleados.find(emp => emp.id.toString() === data);
    
    if (!empleado) {
      Alert.alert("Error", "ID de empleado no válido");
      return;
    }

    Alert.alert(
      "Registrar Asistencia",
      `Empleado: ${empleado.nombre}\n¿Qué deseas registrar?`,
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Entrada", 
          onPress: () => registrarAsistenciaPorQR(data, 'entrada')
        },
        { 
          text: "Salida", 
          onPress: () => registrarAsistenciaPorQR(data, 'salida')
        }
      ]
    );
  };

  // ===============================
  // COMPONENTES DE RENDER
  // ===============================

  const renderEmpleado = ({ item }: { item: Usuario }) => {
    if (!item) return null;
    
    return (
      <View style={styles.itemContainer}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle}>{item.nombre || "Sin nombre"}</Text>
          <Text style={styles.itemSubtitle}>{item.email || "Sin email"}</Text>
          <Text style={styles.itemDetail}>ID: {item.id}</Text>
        </View>
        <View style={styles.itemActions}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]} 
            onPress={() => eliminarEmpleado(item)}
          >
            <Text style={styles.actionButtonText}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderAsistencia = ({ item }: { item: Asistencia }) => {
    if (!item) return null;
    
    return (
      <View style={styles.asistenciaItem}>
        <View style={styles.asistenciaInfo}>
          <Text style={styles.asistenciaNombre}>{item.nombre}</Text>
          <Text style={styles.asistenciaFecha}>{formatDateFromString(item.fecha)}</Text>
        </View>
        <View style={styles.asistenciaTimes}>
          <View style={styles.timeContainer}>
            <Text style={styles.timeLabel}>Entrada</Text>
            <Text style={styles.timeValue}>
              {item.hora_entrada || "--:--"}
            </Text>
          </View>
          <View style={styles.timeContainer}>
            <Text style={styles.timeLabel}>Salida</Text>
            <Text style={styles.timeValue}>
              {item.hora_salida || "--:--"}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderDashboard = () => (
    <ScrollView 
      style={styles.dashboardContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.welcomeText}>Bienvenido, {user?.nombre}</Text>
      
      {/* Información de tienda */}
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Mi Tienda</Text>
        {tienda ? (
          <>
            <Text style={styles.tiendaNombre}>{tienda.nombre}</Text>
            <Text style={styles.tiendaDireccion}>{tienda.direccion}</Text>
            {tienda.telefono && (
              <Text style={styles.tiendaTelefono}>Teléfono: {tienda.telefono}</Text>
            )}
          </>
        ) : (
          <Text style={styles.noDataText}>No se pudo cargar información de la tienda</Text>
        )}
      </View>

      {/* Fecha y hora actual */}
      <View style={styles.dateTimeCard}>
        <Text style={styles.currentDate}>{formatDate(currentDateTime)}</Text>
        <Text style={styles.currentTime}>{formatTime(currentDateTime)}</Text>
      </View>

      {/* Estadísticas */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalEmpleados}</Text>
          <Text style={styles.statLabel}>Empleados</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.asistenciasHoy}</Text>
          <Text style={styles.statLabel}>Asistencias Hoy</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.empleadosPresentes}</Text>
          <Text style={styles.statLabel}>Presentes Ahora</Text>
        </View>
      </View>

      {/* Acciones rápidas */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.quickActionButton} 
          onPress={() => {
            setActiveTab('empleados');
            setModalEmpleadoVisible(true);
          }}
        >
          <Text style={styles.quickActionText}>Nuevo Empleado</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.quickActionButton} 
          onPress={() => setActiveTab('scanner')}
        >
          <Text style={styles.quickActionText}>Escanear QR</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderScanner = () => {
    // Verificar permisos
    if (!permission) {
      // Permisos aún cargando
      return (
        <View style={styles.scannerContainer}>
          <Text>Verificando permisos...</Text>
        </View>
      );
    }

    if (!permission.granted) {
      // Sin permisos de cámara
      return (
        <View style={styles.scannerContainer}>
          <Text style={styles.scannerTitle}>Permisos de cámara requeridos</Text>
          <Text style={styles.scannerSubtitle}>
            Necesitamos acceso a la cámara para escanear códigos QR
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Conceder Permisos</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Cámara con permisos
    return (
      <View style={styles.scannerContainer}>
        <Text style={styles.scannerTitle}>Escanear QR de Empleado</Text>
        <Text style={styles.scannerSubtitle}>
          Posiciona el código QR del empleado en el centro de la pantalla
        </Text>
        
        <View style={styles.scannerFrame}>
          <CameraView
            style={styles.scanner}
            facing="back"
            onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
          />
          {/* Overlay para el marco de escaneo */}
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerBox} />
          </View>
        </View>
        
        {scanned && (
          <TouchableOpacity 
            style={styles.scanAgainButton}
            onPress={() => setScanned(false)}
          >
            <Text style={styles.scanAgainButtonText}>Escanear de nuevo</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Administrador</Text>
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
            Inicio
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'empleados' && styles.activeTab]}
          onPress={() => setActiveTab('empleados')}
        >
          <Text style={[styles.tabText, activeTab === 'empleados' && styles.activeTabText]}>
            Empleados
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'asistencias' && styles.activeTab]}
          onPress={() => setActiveTab('asistencias')}
        >
          <Text style={[styles.tabText, activeTab === 'asistencias' && styles.activeTabText]}>
            Asistencias
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, activeTab === 'scanner' && styles.activeTab]}
          onPress={() => setActiveTab('scanner')}
        >
          <Text style={[styles.tabText, activeTab === 'scanner' && styles.activeTabText]}>
            Scanner
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'dashboard' && renderDashboard()}
        
        {activeTab === 'empleados' && (
          <View style={styles.tabContent}>
            <View style={styles.tabHeader}>
              <Text style={styles.tabTitle}>Gestión de Empleados</Text>
              <TouchableOpacity 
                style={styles.addButton} 
                onPress={() => setModalEmpleadoVisible(true)}
              >
                <Text style={styles.addButtonText}>Agregar</Text>
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={empleados}
              keyExtractor={(item, index) => item?.id?.toString() || index.toString()}
              renderItem={renderEmpleado}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.noDataContainer}>
                  <Text style={styles.noDataText}>No hay empleados registrados</Text>
                  <Text style={styles.noDataSubtext}>Crea tu primer empleado</Text>
                </View>
              }
            />
          </View>
        )}
        
        {activeTab === 'asistencias' && (
          <View style={styles.tabContent}>
            <View style={styles.tabHeader}>
              <Text style={styles.tabTitle}>Asistencias de la Tienda</Text>
              <TouchableOpacity 
                style={styles.refreshButton} 
                onPress={fetchAsistencias}
              >
                <Text style={styles.refreshButtonText}>Actualizar</Text>
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={asistencias}
              keyExtractor={(item, index) => item?.id?.toString() || index.toString()}
              renderItem={renderAsistencia}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.noDataContainer}>
                  <Text style={styles.noDataText}>No hay registros de asistencia</Text>
                  <Text style={styles.noDataSubtext}>Las asistencias aparecerán aquí</Text>
                </View>
              }
            />
          </View>
        )}

        {activeTab === 'scanner' && renderScanner()}
      </View>

      {/* Modal para Empleado */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalEmpleadoVisible}
        onRequestClose={resetEmpleadoForm}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nuevo Empleado</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Nombre completo"
              value={nombreEmpleado}
              onChangeText={setNombreEmpleado}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={emailEmpleado}
              onChangeText={setEmailEmpleado}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              value={passwordEmpleado}
              onChangeText={setPasswordEmpleado}
              secureTextEntry
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={resetEmpleadoForm}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]} 
                onPress={crearEmpleado}
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
    backgroundColor: '#FF9800',
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
    borderBottomColor: '#FF9800',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: '#FF9800',
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
  infoCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  tiendaNombre: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 5,
  },
  tiendaDireccion: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  tiendaTelefono: {
    fontSize: 14,
    color: '#666',
  },
  dateTimeCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentDate: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
    textTransform: 'capitalize',
  },
  currentTime: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: 'white',
    padding: 15,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    backgroundColor: '#FF9800',
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
  refreshButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  refreshButtonText: {
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
    minWidth: 70,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  asistenciaItem: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  asistenciaInfo: {
    flex: 1,
  },
  asistenciaNombre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
  },
  asistenciaFecha: {
    fontSize: 12,
    color: '#666',
  },
  asistenciaTimes: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  timeContainer: {
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  timeValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  scannerContainer: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  scannerSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  scannerFrame: {
    width: 300,
    height: 300,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 30,
  },
  scanner: {
    flex: 1,
  },
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerBox: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: '#FF9800',
    backgroundColor: 'transparent',
    borderRadius: 20,
  },
  permissionButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 20,
  },
  permissionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  scanAgainButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  scanAgainButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
    textAlign: 'center',
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
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
    backgroundColor: '#FF9800',
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