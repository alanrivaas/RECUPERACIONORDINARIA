import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  createEmployee,
  deleteEmployee,
  fetchEmployees,
  updateEmployee,
} from './src/api/employees';

export default function App() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [formValues, setFormValues] = useState({
    name: '',
    age: '',
    position: '',
    phone: '',
  });
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);

  const isEditing = useMemo(() => editingEmployeeId !== null, [editingEmployeeId]);

  useEffect(() => {
    loadEmployees();
  }, []);

  // Debounce de búsqueda cuando cambia searchTerm
  const searchTimeoutRef = useRef(null);
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      loadEmployees(searchTerm);
    }, 450);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  async function loadEmployees(optionalTerm) {
    setLoading(true);
    setErrorMessage(null);
    try {
      // Cargar todos los empleados
      const list = await fetchEmployees();
      
      // Filtrar por búsqueda si hay término
      const term = optionalTerm ?? searchTerm;
      if (term && term.trim().length > 0) {
        const searchLower = term.trim().toLowerCase();
        const filtered = list.filter(emp => 
          emp.name.toLowerCase().includes(searchLower)
        );
        setEmployees(filtered);
      } else {
        setEmployees(list);
      }
    } catch (err) {
      setErrorMessage(String(err.message || err));
    } finally {
      setLoading(false);
    }
  }

  function openCreateForm() {
    setFormValues({ name: '', age: '', position: '', phone: '' });
    setEditingEmployeeId(null);
    setIsFormVisible(true);
  }

  function openEditForm(employee) {
    setFormValues({
      name: String(employee.name ?? ''),
      age: String(employee.age ?? ''),
      position: String(employee.position ?? ''),
      phone: String(employee.phone ?? ''),
    });
    setEditingEmployeeId(employee.id);
    setIsFormVisible(true);
  }

  function closeForm() {
    setIsFormVisible(false);
    setEditingEmployeeId(null);
  }

  function handleChange(field, value) {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    const trimmed = {
      name: formValues.name.trim(),
      age: Number(formValues.age),
      position: formValues.position.trim(),
      phone: formValues.phone.trim(),
    };

    if (!trimmed.name || !trimmed.position || !trimmed.phone || Number.isNaN(trimmed.age)) {
      Alert.alert('Datos incompletos', 'Nombre, edad, puesto y teléfono son obligatorios');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      if (isEditing) {
        await updateEmployee(editingEmployeeId, trimmed);
      } else {
        await createEmployee(trimmed);
      }
      closeForm();
      await loadEmployees();
    } catch (err) {
      setErrorMessage(String(err.message || err));
    } finally {
      setLoading(false);
    }
  }

  function confirmDelete(id, employeeName = '') {
    console.log('🔴 confirmDelete llamado con ID:', id, 'Tipo:', typeof id);
    
    // Asegurar que tenemos un ID válido - intentar múltiples formas
    let validId = id;
    
    // Si es undefined o null, intentar extraerlo de otra forma
    if (!validId && validId !== 0) {
      console.warn('⚠️ ID es null/undefined, intentando conversión');
      validId = Number(id);
    }
    
    // Verificar que sea un número válido
    if (validId === null || validId === undefined || (isNaN(validId) && validId !== 0)) {
      console.error('❌ ID inválido:', id);
      if (Platform.OS === 'web') {
        // En web, usar window.confirm
        const confirmed = window.confirm(`Error: No se pudo identificar el empleado a eliminar. ID recibido: ${id}`);
      } else {
        Alert.alert('Error', `No se pudo identificar el empleado a eliminar. ID recibido: ${id}`);
      }
      return;
    }
    
    console.log('✅ ID válido para eliminar:', validId);
    
    // Usar modal personalizado en web, Alert en móvil
    if (Platform.OS === 'web') {
      // Para web, usar modal personalizado
      setEmployeeToDelete({ id: validId, name: employeeName });
      setDeleteConfirmVisible(true);
    } else {
      // Para móvil, usar Alert nativo
      Alert.alert(
        'Eliminar empleado', 
        '¿Estás seguro de que deseas eliminar este empleado? Esta acción no se puede deshacer.', 
        [
          { 
            text: 'Cancelar', 
            style: 'cancel',
            onPress: () => console.log('🚫 Eliminación cancelada')
          },
          { 
            text: 'Eliminar', 
            style: 'destructive', 
            onPress: () => {
              console.log('✅ Usuario confirmó eliminación, llamando handleDelete con:', validId);
              handleDelete(validId);
            }
          },
        ],
        { cancelable: true }
      );
    }
  }

  function handleDeleteConfirm() {
    if (employeeToDelete) {
      console.log('✅ Usuario confirmó eliminación desde modal, llamando handleDelete con:', employeeToDelete.id);
      handleDelete(employeeToDelete.id);
      setDeleteConfirmVisible(false);
      setEmployeeToDelete(null);
    }
  }

  function handleDeleteCancel() {
    console.log('🚫 Eliminación cancelada desde modal');
    setDeleteConfirmVisible(false);
    setEmployeeToDelete(null);
  }

  async function handleDelete(id) {
    console.log('🗑️ handleDelete llamado con ID:', id, 'Tipo:', typeof id);
    
    // Convertir a número si es string, pero mantener 0 si es 0
    let validId;
    if (typeof id === 'string') {
      validId = Number(id);
    } else if (id === null || id === undefined) {
      console.error('❌ ID es null/undefined');
      Alert.alert('Error', 'ID de empleado inválido: null o undefined');
      return;
    } else {
      validId = id;
    }
    
    // Validar que sea un número válido (permitir 0)
    if (isNaN(validId) && validId !== 0) {
      console.error('❌ ID no es un número válido:', validId);
      Alert.alert('Error', `ID de empleado inválido: ${id}`);
      return;
    }
    
    console.log('✅ Procesando eliminación con ID válido:', validId);
    
    try {
      setLoading(true);
      setErrorMessage(null);
      console.log('📡 Llamando a deleteEmployee con ID:', validId);
      await deleteEmployee(validId);
      console.log('✅ deleteEmployee completado, recargando lista...');
      await loadEmployees();
      console.log('✅ Lista recargada, mostrando alerta de éxito');
      if (Platform.OS === 'web') {
        window.alert('✅ Empleado eliminado correctamente');
      } else {
        Alert.alert('Éxito', 'Empleado eliminado correctamente');
      }
    } catch (err) {
      console.error('❌ Error en handleDelete:', err);
      const errorMsg = String(err?.message || err || 'Error al eliminar el empleado');
      setErrorMessage(errorMsg);
      if (Platform.OS === 'web') {
        window.alert(`❌ Error: ${errorMsg}`);
      } else {
        Alert.alert('Error al eliminar', errorMsg);
      }
    } finally {
      setLoading(false);
      console.log('🏁 handleDelete finalizado');
    }
  }

  async function onRefresh() {
    try {
      setRefreshing(true);
      await loadEmployees();
    } finally {
      setRefreshing(false);
    }
  }

  function renderItem({ item }) {
    // Asegurar que el ID se extrae correctamente - probar múltiples variantes
    const itemId = item?.id ?? item?.Id ?? item?.ID;
    
    console.log('📋 Renderizando item:', {
      id: item.id,
      Id: item.Id,
      ID: item.ID,
      itemIdExtraido: itemId,
      itemCompleto: item
    });
    
    if (itemId === undefined || itemId === null) {
      console.warn('⚠️ Item sin ID:', item);
      return (
        <View style={styles.card}>
          <Text style={styles.error}>Error: Item sin ID válido</Text>
        </View>
      );
    }
    
    // Crear una función específica para este item que capture el ID correctamente
    const handleDeletePress = () => {
      console.log('👆 Botón Eliminar presionado para item:', item);
      console.log('👆 ID que se enviará:', itemId);
      confirmDelete(itemId, item.name);
    };
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{item.name?.charAt(0)?.toUpperCase() || '?'}</Text>
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardSubtitle}>{item.position}</Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Edad:</Text>
            <Text style={styles.infoValue}>{String(item.age)} años</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Teléfono:</Text>
            <Text style={styles.infoValue}>{item.phone}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ID:</Text>
            <Text style={styles.infoValue}>{String(itemId)}</Text>
          </View>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.editButton]} 
            onPress={() => {
              console.log('✏️ Botón Editar presionado');
              openEditForm(item);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.actionButtonText}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]} 
            onPress={handleDeletePress}
            activeOpacity={0.7}
          >
            <Text style={styles.actionButtonText}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (isFormVisible) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.formHeaderContainer}>
          <Text style={styles.formHeader}>{isEditing ? 'Editar Empleado' : 'Nuevo Empleado'}</Text>
          <Text style={styles.formSubheader}>
            {isEditing ? 'Actualiza la información del empleado' : 'Completa los datos del nuevo empleado'}
          </Text>
        </View>
        <View style={styles.formContent}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Nombre completo</Text>
            <TextInput 
              style={styles.input} 
              value={formValues.name} 
              onChangeText={(t) => handleChange('name', t)} 
              placeholder="Ej: Juan Pérez" 
              placeholderTextColor="#999"
            />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Edad</Text>
            <TextInput 
              style={styles.input} 
              value={String(formValues.age)} 
              onChangeText={(t) => handleChange('age', t)} 
              keyboardType="numeric" 
              placeholder="Ej: 30" 
              placeholderTextColor="#999"
            />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Puesto de trabajo</Text>
            <TextInput 
              style={styles.input} 
              value={formValues.position} 
              onChangeText={(t) => handleChange('position', t)} 
              placeholder="Ej: Desarrollador Full Stack" 
              placeholderTextColor="#999"
            />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Teléfono</Text>
            <TextInput 
              style={styles.input} 
              value={formValues.phone} 
              onChangeText={(t) => handleChange('phone', t)} 
              keyboardType="phone-pad" 
              placeholder="Ej: +1234567890" 
              placeholderTextColor="#999"
            />
          </View>
          {errorMessage ? (
            <View style={styles.errorContainer}>
              <Text style={styles.error}>{errorMessage}</Text>
            </View>
          ) : null}
          <View style={styles.formActions}>
            <TouchableOpacity 
              style={[styles.formButton, styles.cancelButton]} 
              onPress={closeForm}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.formButton, styles.submitButton]} 
              onPress={handleSubmit}
              activeOpacity={0.7}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isEditing ? 'Guardar Cambios' : 'Crear Empleado'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
        <StatusBar style="auto" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Gestión de Empleados</Text>
        <Text style={styles.subheader}>Administra tu equipo de trabajo</Text>
      </View>
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre..."
            placeholderTextColor="#999"
            value={searchTerm}
            onChangeText={setSearchTerm}
            onSubmitEditing={() => loadEmployees(searchTerm)}
            returnKeyType="search"
          />
        </View>
        {loading && (
          <ActivityIndicator size="small" color="#6366f1" style={styles.loadingIndicator} />
        )}
      </View>
      {errorMessage ? (
        <View style={styles.errorContainer}>
          <Text style={styles.error}>{errorMessage}</Text>
        </View>
      ) : null}
      <FlatList
        data={employees}
        keyExtractor={(item) => String(item?.id ?? item?.Id ?? Math.random())}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{loading ? 'Cargando empleados...' : 'No hay empleados registrados'}</Text>
            {!loading && (
              <Text style={styles.emptySubtext}>Presiona el botón + para agregar uno nuevo</Text>
            )}
          </View>
        }
        contentContainerStyle={employees.length === 0 ? styles.centerList : styles.listContainer}
        refreshing={refreshing}
        onRefresh={onRefresh}
        showsVerticalScrollIndicator={false}
      />
      <TouchableOpacity 
        style={styles.fab} 
        onPress={openCreateForm}
        activeOpacity={0.8}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
      
      {/* Modal de confirmación de eliminación para web */}
      {deleteConfirmVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Eliminar empleado</Text>
            <Text style={styles.modalMessage}>
              ¿Estás seguro de que deseas eliminar a {employeeToDelete?.name || 'este empleado'}?
            </Text>
            <Text style={styles.modalWarning}>
              Esta acción no se puede deshacer.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonCancel]} 
                onPress={handleDeleteCancel}
                activeOpacity={0.7}
              >
                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonDelete]} 
                onPress={handleDeleteConfirm}
                activeOpacity={0.7}
              >
                <Text style={styles.modalButtonDeleteText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  // Header styles
  headerContainer: {
    marginBottom: 24,
    paddingTop: Platform.OS === 'ios' ? 10 : 0,
  },
  header: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subheader: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '400',
  },
  // Search styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  searchBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  loadingIndicator: {
    marginRight: 8,
  },
  // Card styles
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 15,
    color: '#6366f1',
    fontWeight: '600',
  },
  cardBody: {
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    color: '#1e293b',
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    backgroundColor: '#10b981',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  // Form styles
  formHeaderContainer: {
    marginBottom: 32,
    paddingTop: Platform.OS === 'ios' ? 10 : 0,
  },
  formHeader: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 8,
  },
  formSubheader: {
    fontSize: 16,
    color: '#64748b',
  },
  formContent: {
    flex: 1,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1e293b',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  formButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  cancelButtonText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#6366f1',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  // FAB styles
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 32,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fabIcon: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '300',
    lineHeight: 32,
  },
  // Error styles
  errorContainer: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  error: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '500',
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
  },
  // List styles
  listContainer: {
    paddingBottom: 100,
  },
  centerList: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flex1: {
    flex: 1,
  },
  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    color: '#334155',
    marginBottom: 8,
    lineHeight: 24,
  },
  modalWarning: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '600',
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    minWidth: 100,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  modalButtonCancelText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonDelete: {
    backgroundColor: '#ef4444',
  },
  modalButtonDeleteText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
