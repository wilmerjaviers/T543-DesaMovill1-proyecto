import React, { useEffect, useState } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  RefreshControl,
  FlatList
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useAuth } from "../context/useAuth";
import api from "../api";

interface Asistencia {
  id: number;
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

type TabType = 'dashboard' | 'asistencia' | 'qr';

export default function EmployeeHome() {
  const { user, logout } = useAuth();
  
  // Estados
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [refreshing, setRefreshing] = useState(false);
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [tienda, setTienda] = useState<Tienda | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

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
      fetchAsistencias(),
      fetchTienda()
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  };

  // ===============================
  // FUNCIONES PARA ASISTENCIAS
  // ===============================

  const fetchAsistencias = async () => {
    try {
      console.log("Fetching asistencias...");
      const res = await api.get("/asistencias/mis-asistencias");
      console.log("Asistencias response:", res.data);
      
      const data = Array.isArray(res.data) ? res.data : [];
      setAsistencias(data.slice(0, 5)); // Solo los últimos 5 registros
    } catch (error) {
      console.error("Error fetching asistencias:", error);
      setAsistencias([]);
    }
  };

  const fetchTienda = async () => {
    try {
      if (user?.id_tienda) {
        console.log("Fetching tienda ID:", user.id_tienda);
        const res = await api.get(`/tiendas/${user.id_tienda}`);
        console.log("Tienda response:", res.data);
        setTienda(res.data);
      }
    } catch (error) {
      console.error("Error fetching tienda:", error);
      setTienda(null);
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
  // COMPONENTES DE RENDER
  // ===============================

  const renderAsistenciaItem = ({ item }: { item: Asistencia }) => {
    if (!item) return null;
    
    return (
      <View style={styles.asistenciaItem}>
        <View style={styles.asistenciaDate}>
          <Text style={styles.asistenciaDateText}>
            {formatDateFromString(item.fecha)}
          </Text>
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
        <View style={styles.asistenciaStatus}>
          <Text style={[
            styles.statusText,
            item.hora_salida ? styles.statusComplete : styles.statusIncomplete
          ]}>
            {item.hora_salida ? "Completo" : "Pendiente"}
          </Text>
        </View>
      </View>
    );
  };

  const renderDashboard = () => (
    <ScrollView 
      style={styles.dashboardContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.welcomeText}>Hola, {user?.nombre}!</Text>
      
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

      {/* Instrucciones para registro */}
      <View style={styles.instructionsCard}>
        <Text style={styles.instructionsTitle}>¿Cómo registrar asistencia?</Text>
        <Text style={styles.instructionsText}>
          1. Ve a la pestaña "Mi QR"
        </Text>
        <Text style={styles.instructionsText}>
          2. Muestra tu código QR al administrador
        </Text>
        <Text style={styles.instructionsText}>
          3. El administrador escaneará tu código para registrar entrada/salida
        </Text>
        <TouchableOpacity 
          style={styles.goToQRButton}
          onPress={() => setActiveTab('qr')}
        >
          <Text style={styles.goToQRButtonText}>Ver Mi QR</Text>
        </TouchableOpacity>
      </View>

      {/* Últimas asistencias */}
      <View style={styles.recentCard}>
        <Text style={styles.cardTitle}>Últimas Asistencias</Text>
        {asistencias.length > 0 ? (
          <FlatList
            data={asistencias}
            keyExtractor={(item, index) => item?.id?.toString() || index.toString()}
            renderItem={renderAsistenciaItem}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No hay registros de asistencia</Text>
            <Text style={styles.noDataSubtext}>
              Presenta tu código QR al administrador para registrar tu primera asistencia
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderAsistenciaTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.tabHeader}>
        <Text style={styles.tabTitle}>Mis Asistencias</Text>
        <TouchableOpacity 
          style={styles.refreshButton} 
          onPress={fetchAsistencias}
        >
          <Text style={styles.refreshButtonText}>Actualizar</Text>
        </TouchableOpacity>
      </View>
      
      {asistencias.length > 0 ? (
        <FlatList
          data={asistencias}
          keyExtractor={(item, index) => item?.id?.toString() || index.toString()}
          renderItem={renderAsistenciaItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No hay registros de asistencia</Text>
          <Text style={styles.noDataSubtext}>
            Presenta tu código QR al administrador para registrar tu primera asistencia
          </Text>
          
          <TouchableOpacity 
            style={styles.primaryButton} 
            onPress={() => setActiveTab('qr')}
          >
            <Text style={styles.primaryButtonText}>
              Ver Mi Código QR
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderQR = () => (
    <View style={styles.qrContainer}>
      <Text style={styles.qrTitle}>Mi Código QR</Text>
      <Text style={styles.qrSubtitle}>
        Presenta este código al administrador para registrar tu entrada o salida
      </Text>
      
      <View style={styles.qrCodeContainer}>
        {showQR && user?.id ? (
          <QRCode 
            value={user.id.toString()} 
            size={200}
            backgroundColor="white"
            color="black"
          />
        ) : (
          <View style={styles.qrPlaceholder}>
            <Text style={styles.qrPlaceholderText}>Código QR</Text>
            <Text style={styles.qrPlaceholderSubtext}>Toca "Mostrar QR" para ver tu código</Text>
          </View>
        )}
      </View>
      
      <TouchableOpacity 
        style={styles.qrButton} 
        onPress={() => setShowQR(!showQR)}
      >
        <Text style={styles.qrButtonText}>
          {showQR ? "Ocultar QR" : "Mostrar QR"}
        </Text>
      </TouchableOpacity>
      
      <View style={styles.qrInfoContainer}>
        <Text style={styles.qrInfo}>
          ID de Empleado: {user?.id}
        </Text>
        <Text style={styles.qrInfo}>
          {user?.email}
        </Text>
      </View>

      <View style={styles.qrInstructions}>
        <Text style={styles.instructionsTitle}>Instrucciones:</Text>
        <Text style={styles.instructionsText}>• Solicita al administrador escanear tu código</Text>
        <Text style={styles.instructionsText}>• El administrador seleccionará "Entrada" o "Salida"</Text>
        <Text style={styles.instructionsText}>• Tu asistencia se registrará automáticamente</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Empleado</Text>
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
          style={[styles.tab, activeTab === 'asistencia' && styles.activeTab]}
          onPress={() => setActiveTab('asistencia')}
        >
          <Text style={[styles.tabText, activeTab === 'asistencia' && styles.activeTabText]}>
            Asistencias
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'qr' && styles.activeTab]}
          onPress={() => setActiveTab('qr')}
        >
          <Text style={[styles.tabText, activeTab === 'qr' && styles.activeTabText]}>
            Mi QR
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'asistencia' && renderAsistenciaTab()}
        {activeTab === 'qr' && renderQR()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4CAF50',
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
    borderBottomColor: '#4CAF50',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#4CAF50',
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
    color: '#4CAF50',
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
    color: '#4CAF50',
  },
  instructionsCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  instructionsText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    lineHeight: 20,
  },
  goToQRButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'center',
    marginTop: 10,
  },
  goToQRButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  recentCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  refreshButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  refreshButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  asistenciaItem: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  asistenciaDate: {
    flex: 1,
  },
  asistenciaDateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  asistenciaTimes: {
    flex: 2,
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
  asistenciaStatus: {
    flex: 1,
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusComplete: {
    backgroundColor: '#e8f5e8',
    color: '#4CAF50',
  },
  statusIncomplete: {
    backgroundColor: '#fff3e0',
    color: '#ff9800',
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
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  qrContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  qrTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  qrSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  qrCodeContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  qrPlaceholderText: {
    color: '#999',
    fontSize: 16,
  },
  qrPlaceholderSubtext: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 5,
  },
  qrButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 20,
  },
  qrButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  qrInfoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  qrInfo: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 5,
  },
  qrInstructions: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    width: '100%',
  },
});