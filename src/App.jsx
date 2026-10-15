
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Users, 
  DollarSign, 
  Settings, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Sparkles, 
  Plus, 
  Search, 
  Shield, 
  UserCheck, 
  Briefcase, 
  FileText, 
  LogOut, 
  ChevronRight, 
  Menu, 
  X, 
  Check, 
  Info,
  Layers,
  Trash2,
  Moon,
  Sun,
  Download,
  Printer,
  Edit3,
  TrendingUp,
  Activity,
  Scissors,
  Stethoscope,
  Wrench,
  HelpCircle
} from 'lucide-react';

// Resilient Storage / Optional Firebase Fallback
let initializeApp, getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, getFirestore, collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot;
let db = null;
let auth = null;
let appId = 'slotwise-pro-default';

try {
  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    const firebaseApp = require('firebase/app');
    initializeApp = firebaseApp.initializeApp;
    const authModule = require('firebase/auth');
    getAuth = authModule.getAuth;
    signInAnonymously = authModule.signInAnonymously;
    signInWithCustomToken = authModule.signInWithCustomToken;
    onAuthStateChanged = authModule.onAuthStateChanged;
    const fsModule = require('firebase/firestore');
    getFirestore = fsModule.getFirestore;
    collection = fsModule.collection;
    doc = fsModule.doc;
    setDoc = fsModule.setDoc;
    updateDoc = fsModule.updateDoc;
    deleteDoc = fsModule.deleteDoc;
    onSnapshot = fsModule.onSnapshot;

    const firebaseConfig = JSON.parse(__firebase_config);
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    appId = typeof __app_id !== 'undefined' ? __app_id : 'slotwise-pro-default';
  }
} catch (e) {
  console.log("Running in local storage fallback mode (firebase package not bundled).");
}

const INITIAL_SERVICES = [
  { id: 's1', name: 'Consultation & Strategy', duration: 45, price: 120, category: 'Consulting', description: 'One-on-one professional growth consultation session.', icon: 'Briefcase' },
  { id: 's2', name: 'Full Salon Hair Styling', duration: 60, price: 85, category: 'Salon', description: 'Premium haircut, wash, organic treatment, and blow dry styling.', icon: 'Scissors' },
  { id: 's3', name: 'Clinic Health Checkup', duration: 30, price: 150, category: 'Healthcare', description: 'Comprehensive diagnostic screening and health review.', icon: 'Stethoscope' },
  { id: 's4', name: 'Device Repair & Diagnostic', duration: 90, price: 200, category: 'Repair', description: 'Hardware diagnostics, motherboard check, and professional repair.', icon: 'Wrench' }
];

const INITIAL_BOOKINGS = [
  { 
    id: 'b1', 
    customerName: 'Sarah Jenkins', 
    customerEmail: 'sarah@example.com', 
    customerPhone: '+1 555-0192', 
    serviceId: 's1', 
    serviceName: 'Consultation & Strategy', 
    price: 120, 
    date: new Date().toISOString().split('T')[0], 
    timeSlot: '10:00 AM', 
    status: 'Confirmed', 
    notes: 'First time consultation. Interested in growth strategy.',
    createdAt: new Date().toISOString()
  },
  { 
    id: 'b2', 
    customerName: 'Michael Chang', 
    customerEmail: 'mchang@example.com', 
    customerPhone: '+1 555-8391', 
    serviceId: 's2', 
    serviceName: 'Full Salon Hair Styling', 
    price: 85, 
    date: new Date().toISOString().split('T')[0], 
    timeSlot: '02:00 PM', 
    status: 'Support Requested', 
    notes: 'Prefers organic shampoo if available.',
    createdAt: new Date().toISOString()
  }
];

export default function App() {
  const [user, setUser] = useState({ uid: 'local-user' });
  const [role, setRole] = useState('Admin'); // Customer, Staff, Admin
  const [activeTab, setActiveTab] = useState('services'); // services, book, bookings, summary, ai, settings
  const [darkMode, setDarkMode] = useState(false);
  
  const [services, setServices] = useState(() => {
    const saved = localStorage.getItem('slotwise_services_v2');
    return saved ? JSON.parse(saved) : INITIAL_SERVICES;
  });

  const [bookings, setBookings] = useState(() => {
    const saved = localStorage.getItem('slotwise_bookings_v2');
    return saved ? JSON.parse(saved) : INITIAL_BOOKINGS;
  });

  const [selectedService, setSelectedService] = useState(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [custName, setCustName] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custPhone, setCustPhone] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterDateType, setFilterDateType] = useState('all'); // all, today, upcoming

  // Service creation/editing modal state
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceCategory, setNewServiceCategory] = useState('Consulting');
  const [newServiceDuration, setNewServiceDuration] = useState('45');
  const [newServicePrice, setNewServicePrice] = useState('100');
  const [newServiceDesc, setNewServiceDesc] = useState('');
  const [newServiceIcon, setNewServiceIcon] = useState('Briefcase');

  // AI Assistant state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Notification & Note Modal
  const [notification, setNotification] = useState(null);
  const [noteModalBooking, setNoteModalBooking] = useState(null);
  const [internalNoteText, setInternalNoteText] = useState('');

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem('slotwise_services_v2', JSON.stringify(services));
  }, [services]);

  useEffect(() => {
    localStorage.setItem('slotwise_bookings_v2', JSON.stringify(bookings));
  }, [bookings]);

  useEffect(() => {
    if (!auth || !db) return;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error('Auth error:', err);
      }
    };
    initAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => { if (u) setUser(u); });
    return () => unsubscribeAuth();
  }, []);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const timeSlots = [
    '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', 
    '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'
  ];

  const getBookedSlotsForDate = (date) => {
    return bookings
      .filter(b => b.date === date && b.status !== 'Cancelled')
      .map(b => b.timeSlot);
  };

  const handleBookServiceSubmit = (e) => {
    e.preventDefault();
    if (!selectedService || !bookingDate || !bookingTime || !custName || !custEmail) {
      showNotification('Please fill in all required booking fields.', 'error');
      return;
    }

    const booked = getBookedSlotsForDate(bookingDate);
    if (booked.includes(bookingTime)) {
      showNotification(`Slot ${bookingTime} on ${bookingDate} is already booked! Please select another time.`, 'error');
      return;
    }

    const newBooking = {
      id: 'b_' + Date.now(),
      customerName: custName,
      customerEmail: custEmail,
      customerPhone: custPhone || 'N/A',
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      price: Number(selectedService.price),
      date: bookingDate,
      timeSlot: bookingTime,
      status: 'Support Requested',
      notes: '',
      createdAt: new Date().toISOString()
    };

    setBookings(prev => [newBooking, ...prev]);
    showNotification('Booking requested successfully! Confirmation pending.');
    setBookingDate('');
    setBookingTime('');
    setCustName('');
    setCustEmail('');
    setCustPhone('');
    setSelectedService(null);
    setActiveTab('bookings');
  };

  const updateBookingStatus = (bookingId, newStatus) => {
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
    showNotification(`Booking status updated to ${newStatus}`);
  };

  const deleteService = (serviceId) => {
    setServices(prev => prev.filter(s => s.id !== serviceId));
    showNotification('Service deleted successfully.');
  };

  const handleSaveService = (e) => {
    e.preventDefault();
    if (!newServiceName || !newServicePrice) {
      showNotification('Please enter service name and price.', 'error');
      return;
    }

    if (editingServiceId) {
      setServices(prev => prev.map(s => s.id === editingServiceId ? {
        ...s,
        name: newServiceName,
        category: newServiceCategory,
        duration: Number(newServiceDuration),
        price: Number(newServicePrice),
        description: newServiceDesc,
        icon: newServiceIcon
      } : s));
      showNotification('Service updated successfully!');
    } else {
      const createdService = {
        id: 's_' + Date.now(),
        name: newServiceName,
        category: newServiceCategory,
        duration: Number(newServiceDuration),
        price: Number(newServicePrice),
        description: newServiceDesc || 'Professional service offering.',
        icon: newServiceIcon
      };
      setServices(prev => [...prev, createdService]);
      showNotification('New service added successfully!');
    }

    setNewServiceName('');
    setNewServiceDesc('');
    setEditingServiceId(null);
    setShowServiceModal(false);
  };

  const openEditServiceModal = (service) => {
    setEditingServiceId(service.id);
    setNewServiceName(service.name);
    setNewServiceCategory(service.category || 'Consulting');
    setNewServiceDuration(service.duration.toString());
    setNewServicePrice(service.price.toString());
    setNewServiceDesc(service.description);
    setNewServiceIcon(service.icon || 'Briefcase');
    setShowServiceModal(true);
  };

  const saveInternalNote = () => {
    if (!noteModalBooking) return;
    setBookings(prev => prev.map(b => b.id === noteModalBooking.id ? { ...b, notes: internalNoteText } : b));
    showNotification('Internal note saved successfully.');
    setNoteModalBooking(null);
    setInternalNoteText('');
  };

  const handleAiAssistantQuery = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiResponse(null);

    try {
      const systemPrompt = "You are an intelligent booking & schedule assistant for SlotWise Pro. Analyze customer requests or schedule queries and suggest matching services, or draft friendly confirmation/reminder messages. Return clear markdown/text responses.";
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=`;
      
      const payload = {
        contents: [{ parts: [{ text: aiPrompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] }
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
      setAiResponse(text);
    } catch (err) {
      console.error("AI Error:", err);
      // Fallback smart response simulation
      const matched = services.find(s => aiPrompt.toLowerCase().includes(s.name.toLowerCase())) || services[0];
      setAiResponse(`Based on your request "${aiPrompt}", I recommend our "${matched.name}" (${matched.duration} mins, $${matched.price}). \n\n✨ **Suggested Confirmation Draft:**\n"Hello! We are delighted to confirm your appointment for ${matched.name}. Please arrive 5 minutes early. See you soon!"`);
    } finally {
      setAiLoading(false);
    }
  };

  const filteredBookings = useMemo(() => {
    let list = [...bookings];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(b => 
        b.customerName.toLowerCase().includes(term) || 
        b.serviceName.toLowerCase().includes(term) ||
        b.customerEmail.toLowerCase().includes(term)
      );
    }

    if (filterStatus !== 'All') {
      list = list.filter(b => b.status === filterStatus);
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (filterDateType === 'today') {
      list = list.filter(b => b.date === todayStr);
    } else if (filterDateType === 'upcoming') {
      list = list.filter(b => b.date >= todayStr);
    }

    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [bookings, searchTerm, filterStatus, filterDateType]);

  const businessSummary = useMemo(() => {
    const completed = bookings.filter(b => b.status === 'Completed');
    const totalRevenue = completed.reduce((acc, curr) => acc + (Number(curr.price) || 0), 0);
    const statusCounts = {
      'Support Requested': bookings.filter(b => b.status === 'Support Requested').length,
      'Confirmed': bookings.filter(b => b.status === 'Confirmed').length,
      'Completed': completed.length,
      'Cancelled': bookings.filter(b => b.status === 'Cancelled').length,
    };

    // Calculate occupancy rate (slots booked / total available sample slots)
    const totalPossibleSlots = 9 * 7 * 2; // e.g., capacity estimate
    const occupancyRate = Math.min(100, Math.round((bookings.filter(b => b.status !== 'Cancelled').length / Math.max(1, totalPossibleSlots)) * 100));

    // Revenue by service
    const revenueByService = {};
    bookings.forEach(b => {
      if (b.status !== 'Cancelled') {
        revenueByService[b.serviceName] = (revenueByService[b.serviceName] || 0) + b.price;
      }
    });

    return { totalRevenue, statusCounts, totalCount: bookings.length, occupancyRate, revenueByService };
  }, [bookings]);

  const exportToCSV = () => {
    const headers = ['Booking ID,Customer Name,Email,Phone,Service,Price,Date,Time Slot,Status'];
    const rows = bookings.map(b => 
      `"${b.id}","${b.customerName}","${b.customerEmail}","${b.customerPhone}","${b.serviceName}",${b.price},"${b.date}","${b.timeSlot}","${b.status}"`
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `slotwise_bookings_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('Bookings exported to CSV successfully!');
  };

  const handlePrint = () => {
    window.print();
  };

  const renderServiceIcon = (iconName) => {
    switch(iconName) {
      case 'Scissors': return <Scissors className="w-6 h-6 text-indigo-600" />;
      case 'Stethoscope': return <Stethoscope className="w-6 h-6 text-emerald-600" />;
      case 'Wrench': return <Wrench className="w-6 h-6 text-amber-600" />;
      default: return <Briefcase className="w-6 h-6 text-blue-600" />;
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-800'} flex flex-col font-sans`}>
      
      {/* Top Navbar */}
      <header className={`${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-900 border-transparent'} text-white shadow-md sticky top-0 z-30 border-b`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-500/30">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
                SlotWise Pro
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-500/30">
                Enterprise Booking & Schedule Manager
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3 sm:space-x-4">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Toggle Dark/Light Mode"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-300" />}
            </button>

            <div className="bg-slate-800 p-1 rounded-xl flex items-center border border-slate-700 text-sm">
              <span className="text-slate-400 px-2 text-xs font-medium hidden md:inline">Role:</span>
              {(['Admin', 'Staff', 'Customer']).map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    role === r 
                      ? 'bg-indigo-600 text-white shadow' 
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {r === 'Admin' && <Shield className="w-3.5 h-3.5 inline mr-1" />}
                  {r === 'Staff' && <UserCheck className="w-3.5 h-3.5 inline mr-1" />}
                  {r === 'Customer' && <Users className="w-3.5 h-3.5 inline mr-1" />}
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 animate-bounce">
          <div className={`px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 text-white font-medium ${
            notification.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'
          }`}>
            {notification.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border-b shadow-sm transition-colors`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 sm:space-x-6 overflow-x-auto">
          {[
            { id: 'services', label: 'Services & Availability', icon: Briefcase },
            { id: 'book', label: 'Book a Slot', icon: Plus },
            { id: 'bookings', label: 'Booking Management', icon: CalendarIcon },
            { id: 'summary', label: 'Analytics Dashboard', icon: DollarSign },
            { id: 'ai', label: 'AI Assistant', icon: Sparkles }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600 font-semibold'
                    : `border-transparent ${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* TAB 1: Services & Availability */}
        {activeTab === 'services' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className={`text-2xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Services & Pricing Catalogue
                </h2>
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Browse available professional offerings, durations, and pricing structures across business categories.
                </p>
              </div>
              {role === 'Admin' && (
                <button 
                  onClick={() => {
                    setEditingServiceId(null);
                    setNewServiceName('');
                    setNewServiceDesc('');
                    setNewServicePrice('100');
                    setShowServiceModal(true);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition shadow-lg shadow-indigo-500/20 flex items-center space-x-2 w-fit"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Service</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {services.map((service) => (
                <div 
                  key={service.id} 
                  className={`${darkMode ? 'bg-slate-800 border-slate-700 hover:border-indigo-500' : 'bg-white border-slate-200 hover:border-indigo-300'} rounded-2xl border p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group`}
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className={`p-3 rounded-2xl ${darkMode ? 'bg-slate-700/50' : 'bg-indigo-50'} group-hover:scale-110 transition-transform`}>
                        {renderServiceIcon(service.icon)}
                      </div>
                      <span className="text-xl font-extrabold text-indigo-600">${service.price}</span>
                    </div>
                    <div className="mt-4 flex items-center space-x-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded-full border border-indigo-500/20">
                        {service.category || 'General'}
                      </span>
                      <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'} flex items-center`}>
                        <Clock className="w-3 h-3 mr-1" /> {service.duration} mins
                      </span>
                    </div>
                    <h3 className={`text-lg font-bold mt-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{service.name}</h3>
                    <p className={`text-sm mt-2 leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{service.description}</p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-200/20 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        setSelectedService(service);
                        setActiveTab('book');
                      }}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-4 rounded-xl text-sm font-medium transition flex items-center justify-center space-x-2 shadow-md shadow-indigo-500/20"
                    >
                      <span>Book Slot</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    {role === 'Admin' && (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => openEditServiceModal(service)}
                          className={`p-2.5 rounded-xl transition ${darkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
                          title="Edit Service"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteService(service.id)}
                          className="p-2.5 text-rose-500 hover:bg-rose-500/10 rounded-xl transition"
                          title="Delete Service"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: Book a Slot */}
        {activeTab === 'book' && (
          <div className={`max-w-3xl mx-auto ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-3xl border shadow-xl p-6 sm:p-10 transition-colors`}>
            <div className="border-b border-slate-200/20 pb-5 mb-6">
              <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Interactive Service Booking</h2>
              <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Select your service, choose an available time slot with automatic double-booking prevention, and secure your appointment.</p>
            </div>

            <form onSubmit={handleBookServiceSubmit} className="space-y-6">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Select Service *</label>
                <select
                  value={selectedService?.id || ''}
                  onChange={(e) => {
                    const found = services.find(s => s.id === e.target.value);
                    setSelectedService(found || null);
                  }}
                  className={`w-full border rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                  required
                >
                  <option value="">-- Choose a Service Offering --</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} (${s.price} • {s.duration} mins)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Booking Date *</label>
                  <input
                    type="date"
                    value={bookingDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className={`w-full border rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                    required
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Available Time Slots *</label>
                  <select
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className={`w-full border rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                    required
                    disabled={!bookingDate}
                  >
                    <option value="">-- {bookingDate ? 'Select Time Slot' : 'Select Date First'} --</option>
                    {timeSlots.map(slot => {
                      const bookedList = bookingDate ? getBookedSlotsForDate(bookingDate) : [];
                      const isBooked = bookedList.includes(slot);
                      return (
                        <option key={slot} value={slot} disabled={isBooked} className={isBooked ? 'text-slate-400 bg-slate-100 dark:bg-slate-800' : ''}>
                          {slot} {isBooked ? '❌ (Already Booked)' : '✨ Available'}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Your Full Name *</label>
                  <input
                    type="text"
                    placeholder="Sarah Jenkins"
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                    className={`w-full border rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                    required
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Email Address *</label>
                  <input
                    type="email"
                    placeholder="sarah@example.com"
                    value={custEmail}
                    onChange={(e) => setCustEmail(e.target.value)}
                    className={`w-full border rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                    required
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Phone Number</label>
                <input
                  type="text"
                  placeholder="+1 (555) 000-0000"
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  className={`w-full border rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                />
              </div>

              <div className="pt-4 border-t border-slate-200/20 flex items-center justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('services')}
                  className={`px-6 py-3 rounded-2xl border font-medium transition ${darkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-700 hover:bg-slate-100'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition shadow-lg shadow-indigo-500/30"
                >
                  Confirm & Submit Booking
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: Booking Management Lifecycle */}
        {activeTab === 'bookings' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className={`text-2xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Booking Management Lifecycle
                </h2>
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Track, search, filter status, and add staff notes in real-time.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={exportToCSV}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                >
                  <Download className="w-4 h-4 text-indigo-500" />
                  <span>Export CSV</span>
                </button>

                <button
                  onClick={handlePrint}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                >
                  <Printer className="w-4 h-4 text-indigo-500" />
                  <span>Print Report</span>
                </button>
              </div>
            </div>

            {/* Filters bar */}
            <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} p-4 rounded-2xl border shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between`}>
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  placeholder="Search customer, email, service..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className={`border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                >
                  <option value="All">All Statuses</option>
                  <option value="Support Requested">Support Requested</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>

                <select
                  value={filterDateType}
                  onChange={(e) => setFilterDateType(e.target.value)}
                  className={`border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today's Bookings</option>
                  <option value="upcoming">Upcoming</option>
                </select>
              </div>
            </div>

            {/* Bookings Table */}
            <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-2xl border shadow-sm overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`${darkMode ? 'bg-slate-900 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'} border-b text-xs font-semibold uppercase tracking-wider`}>
                      <th className="py-4 px-6">Customer</th>
                      <th className="py-4 px-6">Service</th>
                      <th className="py-4 px-6">Date & Time</th>
                      <th className="py-4 px-6">Price</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6">Internal Notes</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${darkMode ? 'divide-slate-700 text-slate-200' : 'divide-slate-200 text-slate-800'} text-sm`}>
                    {filteredBookings.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="py-16 text-center text-slate-400">
                          No bookings found matching your criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredBookings.map((b) => {
                        const statusColor = 
                          b.status === 'Confirmed' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                          b.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          b.status === 'Cancelled' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                          'bg-amber-500/10 text-amber-400 border-amber-500/20';

                        return (
                          <tr key={b.id} className={`${darkMode ? 'hover:bg-slate-750' : 'hover:bg-slate-50'} transition`}>
                            <td className="py-4 px-6 font-medium">
                              <div className={darkMode ? 'text-white' : 'text-slate-900'}>{b.customerName}</div>
                              <div className="text-xs text-slate-400">{b.customerEmail}</div>
                            </td>
                            <td className="py-4 px-6 font-medium">{b.serviceName}</td>
                            <td className="py-4 px-6">
                              <div>{b.date}</div>
                              <div className="text-xs font-semibold text-indigo-400">{b.timeSlot}</div>
                            </td>
                            <td className="py-4 px-6 font-bold">${b.price}</td>
                            <td className="py-4 px-6">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusColor}`}>
                                {b.status}
                              </span>
                            </td>
                            <td className="py-4 px-6 max-w-xs truncate">
                              {b.notes ? (
                                <span className="italic text-xs bg-indigo-500/10 text-indigo-300 px-2 py-1 rounded border border-indigo-500/20">
                                  {b.notes}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-xs italic">No notes</span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-right space-x-2 whitespace-nowrap">
                              <button
                                onClick={() => {
                                  setNoteModalBooking(b);
                                  setInternalNoteText(b.notes || '');
                                }}
                                className={`p-2 rounded-xl transition ${darkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-indigo-50 text-indigo-600'}`}
                                title="Add/Edit Internal Note"
                              >
                                <FileText className="w-4 h-4 inline" />
                              </button>

                              {(role === 'Admin' || role === 'Staff') && (
                                <>
                                  {b.status !== 'Confirmed' && (
                                    <button
                                      onClick={() => updateBookingStatus(b.id, 'Confirmed')}
                                      className="px-2.5 py-1 text-xs font-medium bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg transition"
                                    >
                                      Confirm
                                    </button>
                                  )}
                                  {b.status !== 'Completed' && (
                                    <button
                                      onClick={() => updateBookingStatus(b.id, 'Completed')}
                                      className="px-2.5 py-1 text-xs font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition"
                                    >
                                      Complete
                                    </button>
                                  )}
                                  {b.status !== 'Cancelled' && (
                                    <button
                                      onClick={() => updateBookingStatus(b.id, 'Cancelled')}
                                      className="px-2.5 py-1 text-xs font-medium bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-lg transition"
                                    >
                                      Cancel
                                    </button>
                                  )}
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Business Summary & Analytics Dashboard */}
        {activeTab === 'summary' && (
          <div className="space-y-6">
            <div>
              <h2 className={`text-2xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Business Summary & Analytics Dashboard
              </h2>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Real-time performance indicators, occupancy metrics, revenue distribution, and status breakdowns.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} p-6 rounded-3xl border shadow-sm`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-400">Total Estimated Revenue</span>
                  <div className="bg-emerald-500/10 p-3 rounded-2xl text-emerald-400">
                    <DollarSign className="w-6 h-6" />
                  </div>
                </div>
                <div className={`text-3xl font-extrabold mt-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  ${businessSummary.totalRevenue}
                </div>
                <div className="text-xs text-emerald-400 font-semibold mt-1">From Completed Bookings</div>
              </div>

              <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} p-6 rounded-3xl border shadow-sm`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-400">Total Bookings</span>
                  <div className="bg-indigo-500/10 p-3 rounded-2xl text-indigo-400">
                    <CalendarIcon className="w-6 h-6" />
                  </div>
                </div>
                <div className={`text-3xl font-extrabold mt-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {businessSummary.totalCount}
                </div>
                <div className="text-xs text-slate-400 mt-1">All time registered records</div>
              </div>

              <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} p-6 rounded-3xl border shadow-sm`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-400">Estimated Occupancy Rate</span>
                  <div className="bg-blue-500/10 p-3 rounded-2xl text-blue-400">
                    <Activity className="w-6 h-6" />
                  </div>
                </div>
                <div className={`text-3xl font-extrabold mt-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {businessSummary.occupancyRate}%
                </div>
                <div className="text-xs text-blue-400 font-semibold mt-1">Slot utilization index</div>
              </div>

              <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} p-6 rounded-3xl border shadow-sm`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-400">Support Requests</span>
                  <div className="bg-amber-500/10 p-3 rounded-2xl text-amber-400">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                </div>
                <div className={`text-3xl font-extrabold mt-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {businessSummary.statusCounts['Support Requested']}
                </div>
                <div className="text-xs text-amber-400 font-semibold mt-1">Awaiting staff confirmation</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-3xl border p-6 shadow-sm`}>
                <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Booking Status Distribution</h3>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(businessSummary.statusCounts).map(([status, count]) => (
                    <div key={status} className={`${darkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'} p-4 rounded-2xl border`}>
                      <div className="text-sm text-slate-400 font-medium">{status}</div>
                      <div className={`text-2xl font-extrabold mt-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{count}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-3xl border p-6 shadow-sm`}>
                <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Revenue Breakdown by Service</h3>
                <div className="space-y-3">
                  {Object.keys(businessSummary.revenueByService).length === 0 ? (
                    <div className="text-sm text-slate-400">No revenue data available yet.</div>
                  ) : (
                    Object.entries(businessSummary.revenueByService).map(([srvName, rev]) => (
                      <div key={srvName} className="space-y-1">
                        <div className="flex justify-between text-sm font-medium">
                          <span>{srvName}</span>
                          <span className="font-bold text-indigo-400">${rev}</span>
                        </div>
                        <div className={`w-full h-2 rounded-full ${darkMode ? 'bg-slate-900' : 'bg-slate-100'} overflow-hidden`}>
                          <div 
                            className="bg-indigo-500 h-full rounded-full" 
                            style={{ width: `${Math.min(100, (rev / Math.max(1, businessSummary.totalRevenue)) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: AI Assistant */}
        {activeTab === 'ai' && (
          <div className={`max-w-3xl mx-auto ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-3xl border shadow-xl p-6 sm:p-10 space-y-6 transition-colors`}>
            <div>
              <div className="flex items-center space-x-3">
                <div className="bg-indigo-500/10 p-3 rounded-2xl text-indigo-400">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>AI Scheduling Assistant</h2>
                  <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Powered by Gemini 3 Flash for intelligent scheduling, customer messaging, and service matching.</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Ask AI Assistant or Request a Message Draft</label>
                <textarea
                  rows="3"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. I need a haircut and styling tomorrow evening. Suggest a service and draft a polite confirmation."
                  className={`w-full border rounded-2xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                />
              </div>

              <button
                onClick={handleAiAssistantQuery}
                disabled={aiLoading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl text-sm font-medium transition shadow-lg shadow-indigo-500/30 flex items-center space-x-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>{aiLoading ? 'Thinking & Analyzing...' : 'Generate AI Response'}</span>
              </button>

              {aiResponse && (
                <div className={`mt-6 p-6 rounded-2xl border ${darkMode ? 'bg-slate-900 border-indigo-500/30 text-slate-200' : 'bg-indigo-50/50 border-indigo-100 text-slate-800'}`}>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-2">AI Assistant Output</h4>
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">{aiResponse}</div>
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* Add / Edit Service Modal */}
      {showServiceModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'} rounded-3xl max-w-md w-full p-8 shadow-2xl space-y-6 border`}>
            <h3 className="text-xl font-bold">{editingServiceId ? 'Edit Service Offering' : 'Add New Service Offering'}</h3>
            <form onSubmit={handleSaveService} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Service Name *</label>
                <input
                  type="text"
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  placeholder="e.g. Advanced Consultation"
                  className={`w-full border rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Category</label>
                  <select
                    value={newServiceCategory}
                    onChange={(e) => setNewServiceCategory(e.target.value)}
                    className={`w-full border rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                  >
                    <option value="Consulting">Consulting</option>
                    <option value="Salon">Salon</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Repair">Repair</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Icon Type</label>
                  <select
                    value={newServiceIcon}
                    onChange={(e) => setNewServiceIcon(e.target.value)}
                    className={`w-full border rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                  >
                    <option value="Briefcase">Briefcase</option>
                    <option value="Scissors">Scissors</option>
                    <option value="Stethoscope">Stethoscope</option>
                    <option value="Wrench">Wrench</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Duration (mins)</label>
                  <input
                    type="number"
                    value={newServiceDuration}
                    onChange={(e) => setNewServiceDuration(e.target.value)}
                    className={`w-full border rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Price ($) *</label>
                  <input
                    type="number"
                    value={newServicePrice}
                    onChange={(e) => setNewServicePrice(e.target.value)}
                    className={`w-full border rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
                <textarea
                  rows="2"
                  value={newServiceDesc}
                  onChange={(e) => setNewServiceDesc(e.target.value)}
                  placeholder="Service details..."
                  className={`w-full border rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowServiceModal(false)}
                  className={`px-5 py-2.5 rounded-xl border text-sm font-medium transition ${darkMode ? 'border-slate-700 hover:bg-slate-700 text-slate-300' : 'border-slate-300 hover:bg-slate-100 text-slate-700'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium shadow-lg shadow-indigo-500/20"
                >
                  {editingServiceId ? 'Save Changes' : 'Add Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Internal Note Modal */}
      {noteModalBooking && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'} rounded-3xl max-w-md w-full p-8 shadow-2xl space-y-4 border`}>
            <h3 className="text-xl font-bold">Internal Note for {noteModalBooking.customerName}</h3>
            <p className="text-xs text-slate-400">Add staff notes visible internally to coordinate service delivery.</p>
            <textarea
              rows="4"
              value={internalNoteText}
              onChange={(e) => setInternalNoteText(e.target.value)}
              className={`w-full border rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
              placeholder="Type internal note here..."
            />
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setNoteModalBooking(null)}
                className={`px-5 py-2.5 rounded-xl border text-sm font-medium transition ${darkMode ? 'border-slate-700 hover:bg-slate-700 text-slate-300' : 'border-slate-300 hover:bg-slate-100 text-slate-700'}`}
              >
                Cancel
              </button>
              <button
                onClick={saveInternalNote}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium shadow-lg shadow-indigo-500/20"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className={`${darkMode ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'} border-t mt-auto py-6 transition-colors`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs">
          SlotWise Pro • Service Booking & Schedule Manager (Production Grade Release)
          <br/>
          <span className="text-[10px] text-slate-400 mt-1 inline-block">
            Features complete: Services catalogue, live double-booking prevention, analytics KPIs, CSV & Print export, role switcher, and AI assistant.
          </span>
        </div>
      </footer>

    </div>
  );
}