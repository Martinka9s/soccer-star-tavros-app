import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      // Header
      appName: 'Soccer Star Tavros',
      login: 'Login',
      logout: 'Logout',
      register: 'Register',

      // Navigation
      calendar: 'Calendar',
      myBookings: 'My Bookings',
      bookings: 'Bookings',
      pendingRequests: 'Pending Requests',

      // Calendar
      today: 'Today',
      previous: 'Previous',
      next: 'Next',
      pitchA: 'Pitch A',
      pitchB: 'Pitch B',

      // Title & Subtitle
      livePitchAvailability: 'Live pitch availability',
      selectDateAndPitch: 'Check available slots & book easily',

      // Booking Status
      available: 'Available',
      pending: 'Pending',
      booked: 'Booked',
      blocked: 'Blocked',

      // Booking Modal
      bookSlot: 'Book Slot',
      createBooking: 'Create Booking',
      editBooking: 'Edit Booking',
      blockSlot: 'Block Slot',
      selectDuration: 'Select Duration',
      hours: 'hours',
      hour: 'hour',
      phoneNumber: 'Phone Number',
      teamName: 'Team Name',
      notes: 'Notes',
      submit: 'Submit',
      cancel: 'Cancel',
      save: 'Save',
      delete: 'Delete',
      approve: 'Approve',
      reject: 'Reject',
      close: 'Close',

      // Auth
      email: 'Email',
      password: 'Password',
      loginTitle: 'Login to your account',
      registerTitle: 'Create an account',
      noAccount: "Don't have an account?",
      hasAccount: 'Already have an account?',
      signUp: 'Sign up',
      signIn: 'Sign in',
      loginRequired: 'Please login to book a slot',

      // NEW: Auth error/help texts
      auth_email_in_use: 'Email already in use. Try logging in or reset your password.',
      auth_invalid_email: 'Invalid email address.',
      auth_weak_password: 'Password must be at least 6 characters long and include one uppercase letter, one lowercase letter, and one number.',
      send_reset_link: 'Send reset link',
      reset_sent: 'Password reset email sent.',

      // My Bookings
      upcomingBookings: 'Upcoming bookings',
      pastBookings: 'Past bookings',
      noBookings: 'No bookings found',

      // Notifications
      notifications: 'Notifications',
      markAllRead: 'Mark all as read',
      noNotifications: 'No notifications',
      bookingApproved: 'Your booking for {{pitch}} on {{date}} at {{time}} has been approved.',
      bookingRejected: 'Your booking for {{pitch}} on {{date}} at {{time}} has been rejected.',
      bookingCancelled: 'Your booking for {{pitch}} on {{date}} at {{time}} has been cancelled by admin.',

      // Admin
      adminPanel: 'Admin panel',
      userEmail: 'User email',
      status: 'Status',
      actions: 'Actions',

      // Footer
      contact: 'Contact',
      location: 'Location',
      followUs: 'Follow Us',

      // Messages
      bookingSuccess: 'Booking request submitted successfully!',
      bookingError: 'Failed to create booking. Please try again.',
      loginSuccess: 'Logged in successfully!',
      loginError: 'Failed to login. Please check your credentials.',
      registerSuccess: 'Account created successfully!',
      registerError: 'Failed to create account. Please try again.',
      conflictError: 'This time slot conflicts with an existing booking.',
      selectSlot: 'Please select an available time slot to book.',
      pastDateError: 'Cannot book slots in the past.',

      // Time
      am: 'AM',
      pm: 'PM',
    }
  },
  el: {
    translation: {
      // Header
      appName: 'Soccer Star Tavros',
      login: 'Σύνδεση',
      logout: 'Αποσύνδεση',
      register: 'Εγγραφή',

      // Navigation
      calendar: 'Ημερολόγιο',
      myBookings: 'Οι Κρατήσεις μου',
      bookings: 'Κρατήσεις',
      pendingRequests: 'Αιτήματα σε εκκρεμότητα',

      // Calendar
      today: 'Σήμερα',
      previous: 'Προηγούμενη',
      next: 'Επόμενη',
      pitchA: 'Γήπεδο A',
      pitchB: 'Γήπεδο B',

      // Τίτλος & Υπότιτλος
      livePitchAvailability: 'Live διαθεσιμότητα γηπέδων',
      selectDateAndPitch: 'Δες διαθέσιμες ώρες & κάνε κράτηση εύκολα',

      // Booking Status
      available: 'Διαθέσιμο',
      pending: 'Σε αναμονή',
      booked: 'Κρατημένο',
      blocked: 'Μπλοκαρισμένο',

      // Booking Modal
      bookSlot: 'Κράτηση ώρας',
      createBooking: 'Δημιουργία κράτησης',
      editBooking: 'Επεξεργασία κράτησης',
      blockSlot: 'Μπλοκάρισμα ώρας',
      selectDuration: 'Επιλογή διάρκειας',
      hours: 'ώρες',
      hour: 'ώρα',
      phoneNumber: 'Τηλέφωνο',
      teamName: 'Όνομα Ομάδας',
      notes: 'Σημειώσεις',
      submit: 'Υποβολή',
      cancel: 'Ακύρωση',
      save: 'Αποθήκευση',
      delete: 'Διαγραφή',
      approve: 'Έγκριση',
      reject: 'Απόρριψη',
      close: 'Κλείσιμο',

      // Auth
      email: 'Email',
      password: 'Κωδικός',
      loginTitle: 'Σύνδεση στο λογαριασμό σας',
      registerTitle: 'Δημιουργία λογαριασμού',
      noAccount: 'Δεν έχετε λογαριασμό;',
      hasAccount: 'Έχετε ήδη λογαριασμό;',
      signUp: 'Εγγραφή',
      signIn: 'Σύνδεση',
      loginRequired: 'Παρακαλώ συνδεθείτε για να κάνετε κράτηση',

      // NEW: Auth error/help texts (EL)
      auth_email_in_use: 'Το email χρησιμοποιείται ήδη. Δοκιμάστε σύνδεση ή επαναφορά κωδικού.',
      auth_invalid_email: 'Μη έγκυρο email.',
      auth_weak_password: 'Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες, 1 κεφαλαίο, 1 πεζό γράμμα και 1 αριθμό.',
      send_reset_link: 'Αποστολή συνδέσμου επαναφοράς',
      reset_sent: 'Στάλθηκε email για επαναφορά κωδικού.',

      // My Bookings
      upcomingBookings: 'Επερχόμενες κρατήσεις',
      pastBookings: 'Προηγούμενες κρατήσεις',
      noBookings: 'Δεν βρέθηκαν κρατήσεις',

      // Notifications
      notifications: 'Ειδοποιήσεις',
      markAllRead: 'Σήμανση όλων ως αναγνωσμένα',
      noNotifications: 'Δεν υπάρχουν ειδοποιήσεις',
      bookingApproved: 'Η κράτησή σας για το {{pitch}} στις {{date}} στις {{time}} εγκρίθηκε.',
      bookingRejected: 'Η κράτησή σας για το {{pitch}} στις {{date}} στις {{time}} απορρίφθηκε.',
      bookingCancelled: 'Η κράτησή σας για το {{pitch}} στις {{date}} στις {{time}} ακυρώθηκε από τον διαχειριστή.',

      // Admin
      adminPanel: 'Πίνακας διαχειριστή',
      userEmail: 'Email χρήστη',
      status: 'Κατάσταση',
      actions: 'Ενέργειες',

      // Footer
      contact: 'Επικοινωνία',
      location: 'Τοποθεσία',
      followUs: 'Ακολουθήστε μας',

      // Messages
      bookingSuccess: 'Το αίτημα κράτησης υποβλήθηκε επιτυχώς!',
      bookingError: 'Αποτυχία δημιουργίας κράτησης. Παρακαλώ δοκιμάστε ξανά.',
      loginSuccess: 'Επιτυχής σύνδεση!',
      loginError: 'Αποτυχία σύνδεσης. Ελέγξτε τα διαπιστευτήριά σας.',
      registerSuccess: 'Ο λογαριασμός δημιουργήθηκε επιτυχώς!',
      registerError: 'Αποτυχία δημιουργίας λογαριασμού. Παρακαλώ δοκιμάστε ξανά.',
      conflictError: 'Αυτή η ώρα συγκρούεται με μια υπάρχουσα κράτηση.',
      selectSlot: 'Παρακαλώ επιλέξτε μια διαθέσιμη ώρα για κράτηση.',
      pastDateError: 'Δεν μπορείτε να κάνετε κράτηση σε παρελθοντικές ώρες.',

      // Time
      am: 'ΠΜ',
      pm: 'ΜΜ',
    }
  }
};

// Read saved language if present; otherwise default to Greek ('el')
const getInitialLang = (): 'el' | 'en' => {
  try {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('i18nextLng') : null;
    if (saved === 'el' || saved === 'en') return saved;
  } catch {}
  return 'el';
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getInitialLang(),   // preselect Greek on first load, or saved choice
    fallbackLng: 'el',       // fall back to Greek
    interpolation: { escapeValue: false },
  });

export default i18n;
