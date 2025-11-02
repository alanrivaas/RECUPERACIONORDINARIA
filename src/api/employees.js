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
  console.log(' DELETE - ID recibido:', id);
  console.log(' DELETE - URL:', `${BASE_URL}/${id}`);
  
  const response = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' });
  
  console.log(' DELETE - Status:', response.status);
  console.log(' DELETE - OK:', response.ok);
  
  // La API suele devolver 200/204 sin cuerpo; no es necesario parsear
  if (!response.ok) {
    const msg = await response.text();
    console.error(' DELETE - Error:', `HTTP ${response.status}: ${msg}`);
    throw new Error(`HTTP ${response.status}: ${msg}`);
  }
  
  console.log(' DELETE - Éxito');
  return null;
}


