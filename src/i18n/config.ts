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
      pendingRequests: 'Pending Requests',
      
      // Calendar
      today: 'Today',
      previous: 'Previous',
      next: 'Next',
      pitchA: 'Pitch A',
      pitchB: 'Pitch B',
      
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
      loginTitle: 'Login to Your Account',
      registerTitle: 'Create an Account',
      noAccount: "Don't have an account?",
      hasAccount: 'Already have an account?',
      signUp: 'Sign Up',
      signIn: 'Sign In',
      loginRequired: 'Please login to book a slot',
      
      // My Bookings
      upcomingBookings: 'Upcoming Bookings',
      pastBookings: 'Past Bookings',
      noBookings: 'No bookings found',
      
      // Notifications
      notifications: 'Notifications',
      markAllRead: 'Mark All as Read',
      noNotifications: 'No notifications',
      bookingApproved: 'Your booking for {{pitch}} on {{date}} at {{time}} has been approved.',
      bookingRejected: 'Your booking for {{pitch}} on {{date}} at {{time}} has been rejected.',
      bookingCancelled: 'Your booking for {{pitch}} on {{date}} at {{time}} has been cancelled by admin.',
      
      // Admin
      adminPanel: 'Admin Panel',
      userEmail: 'User Email',
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
      appName: 'Soccer Star Ταύρος',
      login: 'Σύνδεση',
      logout: 'Αποσύνδεση',
      register: 'Εγγραφή',
      
      // Navigation
      calendar: 'Ημερολόγιο',
      myBookings: 'Οι Κρατήσεις μου',
      pendingRequests: 'Αιτήματα σε Εκκρεμότητα',
      
      // Calendar
      today: 'Σήμερα',
      previous: 'Προηγούμενη',
      next: 'Επόμενη',
      pitchA: 'Γήπεδο A',
      pitchB: 'Γήπεδο B',
      
      // Booking Status
      available: 'Διαθέσιμο',
      pending: 'Σε Εκκρεμότητα',
      booked: 'Κρατημένο',
      blocked: 'Μπλοκαρισμένο',
      
      // Booking Modal
      bookSlot: 'Κράτηση Ώρας',
      createBooking: 'Δημιουργία Κράτησης',
      editBooking: 'Επεξεργασία Κράτησης',
      blockSlot: 'Μπλοκάρισμα Ώρας',
      selectDuration: 'Επιλογή Διάρκειας',
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
      loginTitle: 'Σύνδεση στο Λογαριασμό σας',
      registerTitle: 'Δημιουργία Λογαριασμού',
      noAccount: 'Δεν έχετε λογαριασμό;',
      hasAccount: 'Έχετε ήδη λογαριασμό;',
      signUp: 'Εγγραφή',
      signIn: 'Σύνδεση',
      loginRequired: 'Παρακαλώ συνδεθείτε για να κάνετε κράτηση',
      
      // My Bookings
      upcomingBookings: 'Επερχόμενες Κρατήσεις',
      pastBookings: 'Προηγούμενες Κρατήσεις',
      noBookings: 'Δεν βρέθηκαν κρατήσεις',
      
      // Notifications
      notifications: 'Ειδοποιήσεις',
      markAllRead: 'Σήμανση Όλων ως Αναγνωσμένα',
      noNotifications: 'Δεν υπάρχουν ειδοποιήσεις',
      bookingApproved: 'Η κράτησή σας για το {{pitch}} στις {{date}} στις {{time}} εγκρίθηκε.',
      bookingRejected: 'Η κράτησή σας για το {{pitch}} στις {{date}} στις {{time}} απορρίφθηκε.',
      bookingCancelled: 'Η κράτησή σας για το {{pitch}} στις {{date}} στις {{time}} ακυρώθηκε από τον διαχειριστή.',
      
      // Admin
      adminPanel: 'Πίνακας Διαχειριστή',
      userEmail: 'Email Χρήστη',
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

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
