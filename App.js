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

  function confirmDelete(id) {
    console.log(' CONFIRM_DELETE - ID recibido:', id, 'Tipo:', typeof id);
    Alert.alert('Eliminar', '¿Deseas eliminar este empleado?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => handleDelete(id) },
    ]);
  }

  async function handleDelete(id) {
    console.log(' HANDLE_DELETE - ID recibido:', id, 'Tipo:', typeof id);
    try {
      setLoading(true);
      setErrorMessage(null);
      await deleteEmployee(id);
      await loadEmployees();
      console.log(' HANDLE_DELETE - Éxito');
    } catch (err) {
      console.error(' HANDLE_DELETE - Error:', err);
      setErrorMessage(String(err.message || err));
    } finally {
      setLoading(false);
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
    console.log(' RENDER_ITEM - Item completo:', item);
    const itemId = item.id;
    console.log(' RENDER_ITEM - ID extraído:', itemId);
    
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardText}>Edad: {String(item.age)}</Text>
        <Text style={styles.cardText}>Puesto: {item.position}</Text>
        <Text style={styles.cardText}>Teléfono: {item.phone}</Text>
        <View style={styles.row}>
          <TouchableOpacity style={[styles.button, styles.edit]} onPress={() => openEditForm(item)}>
            <Text style={styles.buttonText}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.delete]} onPress={() => {
            console.log(' ON_PRESS - ID a eliminar:', itemId);
            confirmDelete(itemId);
          }}>
            <Text style={styles.buttonText}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (isFormVisible) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.header}>{isEditing ? 'Editar empleado' : 'Nuevo empleado'}</Text>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Nombre</Text>
          <TextInput style={styles.input} value={formValues.name} onChangeText={(t) => handleChange('name', t)} placeholder="Nombre" />
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Edad</Text>
          <TextInput style={styles.input} value={String(formValues.age)} onChangeText={(t) => handleChange('age', t)} keyboardType="numeric" placeholder="Edad" />
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Puesto</Text>
          <TextInput style={styles.input} value={formValues.position} onChangeText={(t) => handleChange('position', t)} placeholder="Puesto de trabajo" />
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Teléfono</Text>
          <TextInput style={styles.input} value={formValues.phone} onChangeText={(t) => handleChange('phone', t)} keyboardType="phone-pad" placeholder="Teléfono" />
        </View>
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        <View style={styles.row}>
          <TouchableOpacity style={[styles.button, styles.secondary]} onPress={closeForm}>
            <Text style={styles.buttonText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.primary]} onPress={handleSubmit}>
            <Text style={styles.buttonText}>{isEditing ? 'Guardar cambios' : 'Crear'}</Text>
          </TouchableOpacity>
        </View>
        <StatusBar style="auto" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Empleados</Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.flex1]}
          placeholder="Buscar por nombre"
          value={searchTerm}
          onChangeText={setSearchTerm}
          onSubmitEditing={() => loadEmployees(searchTerm)}
          returnKeyType="search"
        />
        <TouchableOpacity style={[styles.button, styles.secondary]} onPress={() => loadEmployees(searchTerm)}>
          <Text style={styles.buttonText}>{loading ? '...' : 'Buscar'}</Text>
        </TouchableOpacity>
      </View>
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      <FlatList
        data={employees}
        keyExtractor={(item) => String(item.id ?? item.Id)}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.muted}>{loading ? 'Cargando...' : 'Sin resultados'}</Text>}
        contentContainerStyle={employees.length === 0 ? styles.centerList : undefined}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />
      <TouchableOpacity style={[styles.fab, styles.primary]} onPress={openCreateForm}>
        <Text style={styles.fabText}>Nuevo</Text>
      </TouchableOpacity>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f7fb',
    padding: 16,
  },
  header: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  formGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: '#333',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9e9e9',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardText: {
    fontSize: 15,
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  primary: {
    backgroundColor: '#0a7cff',
  },
  secondary: {
    backgroundColor: '#616a75',
  },
  edit: {
    backgroundColor: '#1f9d55',
  },
  delete: {
    backgroundColor: '#dc3545',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  fabText: {
    color: '#fff',
    fontWeight: '700',
  },
  error: {
    color: '#b00020',
    marginVertical: 6,
  },
  muted: {
    color: '#808995',
  },
  centerList: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flex1: {
    flex: 1,
  },
});
