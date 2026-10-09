import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const LanguageContext = createContext(null);

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ta', label: 'தமிழ்', flag: '🇮🇳' },
];

const TRANSLATIONS = {
  en: {
    // Nav
    'nav.home': 'Home',
    'nav.events': 'Events',
    'nav.dashboard': 'Dashboard',
    'nav.myRegistrations': 'My Registrations',
    'nav.myTickets': 'My Tickets',
    'nav.profile': 'Profile',
    'nav.login': 'Login',
    'nav.register': 'Register',
    'nav.logout': 'Logout',
    'nav.manageEvents': 'Manage Events',
    'nav.registrations': 'Registrations',
    'nav.payments': 'Payments',
    'nav.refunds': 'Refunds',
    'nav.checkin': 'Check-in',
    'nav.reports': 'Reports',
    'nav.users': 'Users',

    // Auth
    'auth.welcomeBack': 'Welcome back',
    'auth.loginSubtitle': 'Login to continue to CampusEvents.',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.confirmPassword': 'Confirm Password',
    'auth.fullName': 'Full Name',
    'auth.phone': 'Phone',
    'auth.department': 'Department',
    'auth.selectDepartment': 'Select department',
    'auth.loginButton': 'Login',
    'auth.loggingIn': 'Logging in...',
    'auth.createAccount': 'Create your account',
    'auth.registerSubtitle': 'Join CampusEvents to discover and manage college events.',
    'auth.createAccountButton': 'Create Account',
    'auth.creatingAccount': 'Creating account...',
    'auth.dontHaveAccount': "Don't have an account?",
    'auth.alreadyHaveAccount': 'Already have an account?',
    'auth.orSignInWith': 'Or continue with',
    'auth.signInWithGoogle': 'Sign in with Google',

    // Dashboard
    'dash.welcome': 'Welcome',
    'dash.overview': "Here's an overview of your event activity and recommendations.",
    'dash.totalEvents': 'Total Events',
    'dash.totalRegistrations': 'Total Registrations',
    'dash.confirmed': 'Confirmed',
    'dash.pendingPayments': 'Pending Payments',
    'dash.myTickets': 'My Tickets',
    'dash.recommendedForYou': '✨ Recommended For You',
    'dash.recommendedSubtitle': 'Curated based on your interests, department, and campus activity.',
    'dash.recentRegistrations': 'Recent Registrations',
    'dash.recentlyViewed': '🕒 Recently Viewed',
    'dash.quickActions': 'Quick Actions',
    'dash.browseEvents': 'Browse Events',
    'dash.viewAll': 'View all',
    'dash.scheduleConflict': '⚠️ Schedule Conflict',

    // General
    'common.free': 'Free',
    'common.paid': 'Paid',
    'common.viewDetails': 'View Details',
    'common.registerNow': 'Register Now',
    'common.registered': 'Registered',
    'common.back': 'Back',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.all': 'All',
  },

  es: {
    // Nav
    'nav.home': 'Inicio',
    'nav.events': 'Eventos',
    'nav.dashboard': 'Panel',
    'nav.myRegistrations': 'Mis Inscripciones',
    'nav.myTickets': 'Mis Entradas',
    'nav.profile': 'Perfil',
    'nav.login': 'Iniciar Sesión',
    'nav.register': 'Registrarse',
    'nav.logout': 'Cerrar Sesión',
    'nav.manageEvents': 'Gestionar Eventos',
    'nav.registrations': 'Inscripciones',
    'nav.payments': 'Pagos',
    'nav.refunds': 'Reembolsos',
    'nav.checkin': 'Registro de Entrada',
    'nav.reports': 'Informes',
    'nav.users': 'Usuarios',

    // Auth
    'auth.welcomeBack': 'Bienvenido de nuevo',
    'auth.loginSubtitle': 'Inicia sesión para continuar en CampusEvents.',
    'auth.email': 'Correo electrónico',
    'auth.password': 'Contraseña',
    'auth.confirmPassword': 'Confirmar contraseña',
    'auth.fullName': 'Nombre completo',
    'auth.phone': 'Teléfono',
    'auth.department': 'Departamento',
    'auth.selectDepartment': 'Seleccionar departamento',
    'auth.loginButton': 'Iniciar Sesión',
    'auth.loggingIn': 'Iniciando sesión...',
    'auth.createAccount': 'Crea tu cuenta',
    'auth.registerSubtitle': 'Únete a CampusEvents para descubrir y gestionar eventos.',
    'auth.createAccountButton': 'Crear Cuenta',
    'auth.creatingAccount': 'Creando cuenta...',
    'auth.dontHaveAccount': '¿No tienes una cuenta?',
    'auth.alreadyHaveAccount': '¿Ya tienes una cuenta?',
    'auth.orSignInWith': 'O continúa con',
    'auth.signInWithGoogle': 'Iniciar sesión con Google',

    // Dashboard
    'dash.welcome': 'Bienvenido',
    'dash.overview': 'Aquí tienes un resumen de tus eventos y recomendaciones.',
    'dash.totalEvents': 'Total de Eventos',
    'dash.totalRegistrations': 'Total de Inscripciones',
    'dash.confirmed': 'Confirmados',
    'dash.pendingPayments': 'Pagos Pendientes',
    'dash.myTickets': 'Mis Entradas',
    'dash.recommendedForYou': '✨ Recomendado Para Ti',
    'dash.recommendedSubtitle': 'Seleccionado según tus intereses y departamento.',
    'dash.recentRegistrations': 'Inscripciones Recientes',
    'dash.recentlyViewed': '🕒 Visto Recientemente',
    'dash.quickActions': 'Acciones Rápidas',
    'dash.browseEvents': 'Explorar Eventos',
    'dash.viewAll': 'Ver todos',
    'dash.scheduleConflict': '⚠️ Conflicto de Horario',

    // General
    'common.free': 'Gratis',
    'common.paid': 'De Pago',
    'common.viewDetails': 'Ver Detalles',
    'common.registerNow': 'Inscribirse Ahora',
    'common.registered': 'Inscrito',
    'common.back': 'Volver',
    'common.search': 'Buscar',
    'common.filter': 'Filtrar',
    'common.all': 'Todos',
  },

  hi: {
    // Nav
    'nav.home': 'होम',
    'nav.events': 'इवेंट्स',
    'nav.dashboard': 'डैशबोर्ड',
    'nav.myRegistrations': 'मेरे पंजीकरण',
    'nav.myTickets': 'मेरे टिकट',
    'nav.profile': 'प्रोफ़ाइल',
    'nav.login': 'लॉग इन',
    'nav.register': 'पंजीकरण करें',
    'nav.logout': 'लॉग आउट',
    'nav.manageEvents': 'इवेंट्स प्रबंधित करें',
    'nav.registrations': 'पंजीकरण',
    'nav.payments': 'भुगतान',
    'nav.refunds': 'रिफंड',
    'nav.checkin': 'चेक-इन',
    'nav.reports': 'रिपोर्ट्स',
    'nav.users': 'उपयोगकर्ता',

    // Auth
    'auth.welcomeBack': 'वापसी पर स्वागत है',
    'auth.loginSubtitle': 'CampusEvents में जारी रखने के लिए लॉग इन करें।',
    'auth.email': 'ईमेल',
    'auth.password': 'पासवर्ड',
    'auth.confirmPassword': 'पासवर्ड की पुष्टि करें',
    'auth.fullName': 'पूरा नाम',
    'auth.phone': 'फ़ोन नंबर',
    'auth.department': 'विभाग',
    'auth.selectDepartment': 'विभाग चुनें',
    'auth.loginButton': 'लॉग इन करें',
    'auth.loggingIn': 'लॉग इन हो रहा है...',
    'auth.createAccount': 'अपना खाता बनाएं',
    'auth.registerSubtitle': 'कॉलेज इवेंट्स खोजने और प्रबंधित करने के लिए शामिल हों।',
    'auth.createAccountButton': 'खाता बनाएं',
    'auth.creatingAccount': 'खाता बनाया जा रहा है...',
    'auth.dontHaveAccount': 'खाता नहीं है?',
    'auth.alreadyHaveAccount': 'पहले से खाता है?',
    'auth.orSignInWith': 'या इसके साथ जारी रखें',
    'auth.signInWithGoogle': 'Google से साइन इन करें',

    // Dashboard
    'dash.welcome': 'स्वागत है',
    'dash.overview': 'आपकी इवेंट गतिविधि और सिफारिशों का अवलोकन।',
    'dash.totalEvents': 'कुल इवेंट्स',
    'dash.totalRegistrations': 'कुल पंजीकरण',
    'dash.confirmed': 'पुष्टीकृत',
    'dash.pendingPayments': 'लंबित भुगतान',
    'dash.myTickets': 'मेरे टिकट',
    'dash.recommendedForYou': '✨ आपके लिए अनुशंसित',
    'dash.recommendedSubtitle': 'आपकी रुचियों और विभाग के आधार पर चयनित।',
    'dash.recentRegistrations': 'हाल के पंजीकरण',
    'dash.recentlyViewed': '🕒 हाल ही में देखे गए',
    'dash.quickActions': 'त्वरित कार्रवाई',
    'dash.browseEvents': 'इवेंट्स ब्राउज़ करें',
    'dash.viewAll': 'सभी देखें',
    'dash.scheduleConflict': '⚠️ समय टकराव (कॉन्फ्लिक्ट)',

    // General
    'common.free': 'निःशुल्क',
    'common.paid': 'सशुल्क',
    'common.viewDetails': 'विवरण देखें',
    'common.registerNow': 'अभी रजिस्टर करें',
    'common.registered': 'पंजीकृत',
    'common.back': 'पीछे',
    'common.search': 'खोजें',
    'common.filter': 'फ़िल्टर',
    'common.all': 'सभी',
  },

  ta: {
    // Nav
    'nav.home': 'முகப்பு',
    'nav.events': 'நிகழ்வுகள்',
    'nav.dashboard': 'டாஷ்போர்டு',
    'nav.myRegistrations': 'என் பதிவுகள்',
    'nav.myTickets': 'என் டிக்கெட்டுகள்',
    'nav.profile': 'சுயவிவரம்',
    'nav.login': 'உள்நுழைக',
    'nav.register': 'பதிவுசெய்க',
    'nav.logout': 'வெளியேறு',
    'nav.manageEvents': 'நிகழ்வு மேலாண்மை',
    'nav.registrations': 'பதிவுகள்',
    'nav.payments': 'பணப்பரிவர்த்தனைகள்',
    'nav.refunds': 'பணத்திருப்பங்கள்',
    'nav.checkin': 'செக்-இன்',
    'nav.reports': 'அறிக்கைகள்',
    'nav.users': 'பயனர்கள்',

    // Auth
    'auth.welcomeBack': 'மீண்டும் வருக',
    'auth.loginSubtitle': 'CampusEvents தளத்தை தொடர உள்நுழைக.',
    'auth.email': 'மின்னஞ்சல்',
    'auth.password': 'கடவுச்சொல்',
    'auth.confirmPassword': 'கடவுச்சொல்லை உறுதிப்படுத்துக',
    'auth.fullName': 'முழு பெயர்',
    'auth.phone': 'தொலைபேசி எண்',
    'auth.department': 'துறை',
    'auth.selectDepartment': 'துறையைத் தேர்ந்தெடுக்கவும்',
    'auth.loginButton': 'உள்நுழைக',
    'auth.loggingIn': 'உள்நுழைகிறது...',
    'auth.createAccount': 'புதிய கணக்கை உருவாக்கவும்',
    'auth.registerSubtitle': 'கல்லூரி நிகழ்வுகளை கண்டறிய பதிவுசெய்க.',
    'auth.createAccountButton': 'கணக்கை உருவாக்கு',
    'auth.creatingAccount': 'கணக்கு உருவாக்கப்படுகிறது...',
    'auth.dontHaveAccount': 'கணக்கு இல்லையா?',
    'auth.alreadyHaveAccount': 'ஏற்கனவே கணக்கு உள்ளதா?',
    'auth.orSignInWith': 'அல்லது இதன் மூலம் தொடரவும்',
    'auth.signInWithGoogle': 'Google மூலம் உள்நுழைக',

    // Dashboard
    'dash.welcome': 'வணக்கம்',
    'dash.overview': 'உங்கள் நிகழ்வு செயல்பாடு மற்றும் பரிந்துரைகள்.',
    'dash.totalEvents': 'மொத்த நிகழ்வுகள்',
    'dash.totalRegistrations': 'மொத்த பதிவுகள்',
    'dash.confirmed': 'உறுதி செய்யப்பட்டது',
    'dash.pendingPayments': 'நிலுவையில் உள்ள கட்டணம்',
    'dash.myTickets': 'என் டிக்கெட்டுகள்',
    'dash.recommendedForYou': '✨ உங்களுக்கான பரிந்துரைகள்',
    'dash.recommendedSubtitle': 'உங்கள் ஆர்வம் மற்றும் துறை அடிப்படையில் பரிந்துரைக்கப்பட்டது.',
    'dash.recentRegistrations': 'சமீபத்திய பதிவுகள்',
    'dash.recentlyViewed': '🕒 சமீபத்தில் பார்த்தவை',
    'dash.quickActions': 'விரைவு செயல்கள்',
    'dash.browseEvents': 'நிகழ்வுகளைப் பார்க்கவும்',
    'dash.viewAll': 'அனைத்தையும் காண்க',
    'dash.scheduleConflict': '⚠️ நேர முரண்பாடு',

    // General
    'common.free': 'இலவசம்',
    'common.paid': 'கட்டண நிகழ்வு',
    'common.viewDetails': 'விவரங்கள் பார்க்க',
    'common.registerNow': 'இப்போதே பதிவுசெய்க',
    'common.registered': 'பதிவுசெய்யப்பட்டது',
    'common.back': 'பின்செல்',
    'common.search': 'தேடுக',
    'common.filter': 'வடிகட்டுக',
    'common.all': 'அனைத்தும்',
  },
};

export function LanguageProvider({ children }) {
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    try {
      return localStorage.getItem('ce_language') || 'en';
    } catch {
      return 'en';
    }
  });

  const setLanguage = useCallback((code) => {
    setCurrentLanguage(code);
    try {
      localStorage.setItem('ce_language', code);
    } catch {
      // ignore
    }
  }, []);

  const t = useCallback((key, fallback = '') => {
    const langDict = TRANSLATIONS[currentLanguage] || TRANSLATIONS['en'];
    if (langDict && langDict[key]) return langDict[key];
    const enDict = TRANSLATIONS['en'];
    if (enDict && enDict[key]) return enDict[key];
    return fallback || key;
  }, [currentLanguage]);

  const value = {
    currentLanguage,
    setLanguage,
    t,
    languages: SUPPORTED_LANGUAGES,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    return {
      currentLanguage: 'en',
      setLanguage: () => {},
      t: (key, fallback = '') => fallback || key,
      languages: SUPPORTED_LANGUAGES,
    };
  }
  return ctx;
}
