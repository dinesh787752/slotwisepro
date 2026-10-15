
const API_URL = 'http://localhost:5000/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'API request failed');
  }

  return data;
}

export const getServices = () => request('/services');

export const getBookings = () => request('/bookings');

export const createBooking = (booking) =>
  request('/bookings', {
    method: 'POST',
    body: JSON.stringify(booking),
  });

export const updateBookingStatus = (id, status) =>
  request(`/bookings/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

export const getBusinessSummary = () =>
  request('/summary');
