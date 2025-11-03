import Constants from 'expo-constants';

const BASE_URL = (Constants?.expoConfig?.extra?.apiBaseUrl) || 'https://retoolapi.dev/Vv50y8/recuperacion';

async function handleResponse(response) {
  // Maneja respuestas sin cuerpo (204 No Content)
  if (response.status === 204) {
    return null;
  }
  
  // Leer el texto de la respuesta una sola vez
  const text = await response.text();
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${text}`);
  }
  
  // Intentar parsear JSON
  try {
    if (!text || text.trim() === '') {
      return null;
    }
    return JSON.parse(text);
  } catch (err) {
    // Si no puede parsear, retornar null
    return null;
  }
}

function normalizeEmployeeFromApi(raw) {
  const normalized = {
    id: raw.Id ?? raw.id,
    name: raw.Name ?? raw.name ?? raw.nombre ?? raw.Nombre ?? '',
    age: raw.Age ?? raw.age ?? raw.edad ?? raw.Edad ?? '',
    position: raw.Position ?? raw.position ?? raw.Puesto ?? raw.puesto ?? raw.Job ?? '',
    phone: raw.Phone ?? raw.phone ?? raw.PhoneNumber ?? raw.telefono ?? raw.Telefono ?? '',
  };
  console.log(' NORMALIZE - Raw:', raw, '→ Normalized:', normalized);
  return normalized;
}

export async function fetchEmployees(searchTerm) {
  const url = searchTerm && searchTerm.trim().length > 0
    ? `${BASE_URL}?Name=${encodeURIComponent(searchTerm.trim())}`
    : BASE_URL;
  console.log(' SEARCH - Término:', searchTerm);
  console.log(' SEARCH - URL:', url);
  
  const response = await fetch(url);
  const data = await handleResponse(response);
  
  console.log(' SEARCH - Datos recibidos:', data);
  console.log(' SEARCH - Es array:', Array.isArray(data));
  
  const result = Array.isArray(data) ? data.map(normalizeEmployeeFromApi) : [];
  console.log(' SEARCH - Resultado normalizado:', result);
  
  return result;
}

export async function fetchEmployeeById(id) {
  const response = await fetch(`${BASE_URL}/${id}`);
  const data = await handleResponse(response);
  return normalizeEmployeeFromApi(data);
}

export async function createEmployee(employee) {
  const payload = {
    // Enviamos ambas variantes de claves para compatibilidad con el dataset
    name: employee.name,
    Name: employee.name,
    age: employee.age,
    Edad: employee.age,
    position: employee.position,
    Puesto: employee.position,
    phone: employee.phone,
    Telefono: employee.phone,
  };
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await handleResponse(response);
  return normalizeEmployeeFromApi(data);
}

export async function updateEmployee(id, employee) {
  const payload = {
    name: employee.name,
    Name: employee.name,
    age: employee.age,
    Edad: employee.age,
    position: employee.position,
    Puesto: employee.position,
    phone: employee.phone,
    Telefono: employee.phone,
  };
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await handleResponse(response);
  return normalizeEmployeeFromApi(data);
}

export async function deleteEmployee(id) {
  // Asegurar que el ID sea un número o string válido
  const validId = String(id).trim();
  
  if (!validId || validId === 'undefined' || validId === 'null') {
    console.error('❌ DELETE - ID inválido:', id);
    throw new Error(`ID inválido: ${id}`);
  }
  
  const url = `${BASE_URL}/${validId}`;
  console.log('🗑️ DELETE - ID recibido:', id, 'Tipo:', typeof id);
  console.log('🗑️ DELETE - ID válido:', validId);
  console.log('🗑️ DELETE - URL:', url);
  
  try {
    const response = await fetch(url, { 
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log('🗑️ DELETE - Status:', response.status);
    console.log('🗑️ DELETE - OK:', response.ok);
    console.log('🗑️ DELETE - StatusText:', response.statusText);
    
    // La API puede devolver 200, 204, o 404 si no existe
    if (response.status === 404) {
      throw new Error(`Empleado con ID ${validId} no encontrado`);
    }
    
    if (!response.ok) {
      let errorMsg = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const text = await response.text();
        if (text) {
          errorMsg += ` - ${text}`;
        }
      } catch (e) {
        // Ignorar error al leer el texto
      }
      console.error('❌ DELETE - Error:', errorMsg);
      throw new Error(errorMsg);
    }
    
    console.log('✅ DELETE - Éxito');
    return { success: true, id: validId };
  } catch (err) {
    console.error('❌ DELETE - Excepción:', err);
    // Si es un error de red, proporcionar un mensaje más claro
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('Error de conexión. Verifica tu conexión a internet.');
    }
    throw err;
  }
}


