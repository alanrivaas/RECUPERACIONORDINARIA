import Constants from 'expo-constants';

const BASE_URL = (Constants?.expoConfig?.extra?.apiBaseUrl) || 'https://retoolapi.dev/Vv50y8/recuperacion';

async function handleResponse(response) {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }
  // Maneja respuestas sin cuerpo (204 o 200 sin JSON)
  const contentLength = response.headers.get('content-length');
  if (response.status === 204 || contentLength === '0' || contentLength === null) {
    try {
      // Algunos servidores omiten content-length; intenta leer texto y valida
      const text = await response.text();
      if (!text) return null;
      return JSON.parse(text);
    } catch (_) {
      return null;
    }
  }
  return await response.json();
}

function normalizeEmployeeFromApi(raw) {
  return {
    id: raw.id ?? raw.Id,
    name: raw.name ?? raw.Name ?? raw.nombre ?? raw.Nombre ?? '',
    age: raw.age ?? raw.Age ?? raw.edad ?? raw.Edad ?? '',
    position: raw.position ?? raw.Position ?? raw.puesto ?? raw.Puesto ?? '',
    phone: raw.phone ?? raw.Phone ?? raw.telefono ?? raw.Telefono ?? '',
  };
}

export async function fetchEmployees(searchTerm) {
  const url = searchTerm && searchTerm.trim().length > 0
    ? `${BASE_URL}?Name=${encodeURIComponent(searchTerm.trim())}`
    : BASE_URL;
  const response = await fetch(url);
  const data = await handleResponse(response);
  return Array.isArray(data) ? data.map(normalizeEmployeeFromApi) : [];
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
  const response = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' });
  // La API suele devolver 200/204 sin cuerpo; no es necesario parsear
  if (!response.ok) {
    const msg = await response.text();
    throw new Error(`HTTP ${response.status}: ${msg}`);
  }
  return null;
}


