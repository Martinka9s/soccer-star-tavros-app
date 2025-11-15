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
      home: 'Home',
      calendar: 'Calendar',
      championships: 'Championships',
      myBookings: 'My bookings',
      bookings: 'Bookings',
      pendingRequests: 'Pending requests',
      teams: 'Teams',

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
      bookSlot: 'Book slot',
      createBooking: 'Create booking',
      editBooking: 'Edit booking',
      blockSlot: 'Block slot',
      selectDuration: 'Select duration',
      hours: 'hours',
      hour: 'hour',
      phoneNumber: 'Phone number',
      teamName: 'Team name',
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

      // Auth error/help texts
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
      bookingApprovedMessage: 'Your booking was approved! Check the date and time, and don\'t be late.',
      matchScheduledMessage: 'You got a new booking for the championship. Check the date and time, and don\'t be late!',

      // Admin
      adminPanel: 'Admin panel',
      userEmail: 'User email',
      status: 'Status',
      actions: 'Actions',
      noPendingRequests: 'No pending requests',
      allRequestsProcessed: 'All booking requests have been processed',
      processing: 'Processing...',
      confirmReject: 'Are you sure you want to reject this booking?',
      loading: 'Loading...',

      // Footer
      contact: 'Contact',
      location: 'Location',
      followUs: 'Follow us',

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

      // Dashboard
      nextGames: 'Next games',
      yesterdayResults: "Yesterday's results",
      noUpcomingGames: 'No upcoming games scheduled',
      noResultsYesterday: 'No results from yesterday',
      showAll: 'Show all',
      showLess: 'Show less',
      bookAPitch: 'Book a pitch',
      joinTheChampionship: 'Join the championship',
      registerYourTeam: 'Register your team and compete for glory!',
      joinNow: 'Join now',
      professionalFootballFacilities: 'Professional football facilities',
      stateOfTheArtPitches: 'State-of-the-art pitches for the best experience',
      learnMore: 'Learn more',

      // NEW: Championships & Subgroups
      championshipsDesc: 'View standings and match schedules',
      standings: 'Standings',
      allGroups: 'All groups (merged)',
      mondayGroup: 'Monday group',
      tuesdayGroup: 'Tuesday group',
      wednesdayGroup: 'Wednesday group',
      thursdayGroup: 'Thursday group',
      mergedStandings: 'Combined standings',
      noTeamsInSubgroup: 'No teams in this subgroup yet',
      noTeamsInChampionship: 'No teams in this championship yet',
      
      // NEW: Table Headers & Legend
      pld: 'Pld',
      played: 'Played',
      w: 'W',
      won: 'Won',
      d: 'D',
      draw: 'Draw',
      l: 'L',
      lost: 'Lost',
      gf: 'GF',
      goalsFor: 'Goals for',
      ga: 'GA',
      goalsAgainst: 'Goals against',
      gd: 'GD',
      goalDifference: 'Goal difference',
      pts: 'Pts',
      points: 'Points',
      legend: 'Legend',
      top3: 'Top 3',
      highlightedInGreen: 'highlighted in green',
      eliminated: 'Eliminated',
      highlightedInRed: 'teams shown in red',
      
      // NEW: Team Modal
      joinChampionship: 'Join championship',
      joinChampionshipDesc: 'Register your team to compete in our championships. An admin will review your request and assign you to the appropriate league.',
      assignTeam: 'Assign to championship',
      championship: 'Championship',
      selectChampionship: 'Select a championship...',
      subgroup: 'Playing day group',
      selectSubgroup: 'Select a subgroup...',
      subgroupExplanation: 'Teams in each subgroup will compete against each other during the group stage.',
      championshipReviewInfo: 'Your request will be reviewed by an admin who will assign you to one of our championships: MSL DREAM LEAGUE, MSL A, or MSL B.',
      enterTeamName: 'Enter your team name',
      enterPhone: 'Enter your phone number',
      submitting: 'Submitting...',
      submitRequest: 'Submit request',
      
      // NEW: Knockout Bracket
      knockoutBracket: 'Knockout bracket',
      bracketComingSoon: 'Knockout bracket will appear here when finals begin',
      
      // NEW: Phases (for future use)
      groupStage: 'Group stage',
      qualificationRound: 'Qualification round',
      finals: 'Finals',
      roundOf16: 'Round of 16',
      quarterfinals: 'Quarterfinals',
      semifinals: 'Semifinals',
      final: 'Final',
      
      // NEW: Team registration fields
      teamLevel: 'Team level',
      selectTeamLevel: 'Select team level...',
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
      preferredDay: 'Preferred playing day',
      selectPreferredDay: 'Select preferred day...',
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
    }
  },
  gr: {
    translation: {
      // Header
      appName: 'Soccer Star Tavros',
      login: 'Σύνδεση',
      logout: 'Αποσύνδεση',
      register: 'Εγγραφή',

      // Navigation
      home: 'Αρχική',
      calendar: 'Ημερολόγιο',
      championships: 'Πρωταθλήματα',
      myBookings: 'Οι κρατήσεις μου',
      bookings: 'Κρατήσεις',
      pendingRequests: 'Αιτήματα σε εκκρεμότητα',
      teams: 'Ομάδες',

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
      teamName: 'Όνομα ομάδας',
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

      // Auth error/help texts
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
      bookingApprovedMessage: 'Η κράτησή σας εγκρίθηκε! Ελέγξτε την ημερομηνία και την ώρα, και μην αργήσετε.',
      matchScheduledMessage: 'Έχετε νέα κράτηση για το πρωτάθλημα. Ελέγξτε την ημερομηνία και την ώρα, και μην αργήσετε!',

      // Admin
      adminPanel: 'Πίνακας διαχειριστή',
      userEmail: 'Email χρήστη',
      status: 'Κατάσταση',
      actions: 'Ενέργειες',
      noPendingRequests: 'Δεν υπάρχουν αιτήματα σε εκκρεμότητα',
      allRequestsProcessed: 'Όλα τα αιτήματα κράτησης έχουν διεκπεραιωθεί',
      processing: 'Επεξεργασία...',
      confirmReject: 'Είστε σίγουροι ότι θέλετε να απορρίψετε αυτή την κράτηση;',
      loading: 'Φόρτωση...',

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

      // Dashboard
      nextGames: 'Επόμενα παιχνίδια',
      yesterdayResults: 'Χθεσινά αποτελέσματα',
      noUpcomingGames: 'Δεν υπάρχουν προγραμματισμένα παιχνίδια',
      noResultsYesterday: 'Δεν υπάρχουν χθεσινά αποτελέσματα',
      showAll: 'Δείτε όλα',
      showLess: 'Δείτε λιγότερα',
      bookAPitch: 'Κάντε κράτηση',
      joinTheChampionship: 'Εγγραφείτε στο πρωτάθλημα',
      registerYourTeam: 'Εγγράψτε την ομάδα σας και διαγωνιστείτε για τη δόξα!',
      joinNow: 'Εγγραφή τώρα',
      professionalFootballFacilities: 'Επαγγελματικές εγκαταστάσεις ποδοσφαίρου',
      stateOfTheArtPitches: 'Γήπεδα τελευταίας τεχνολογίας για την καλύτερη εμπειρία',
      learnMore: 'Μάθετε περισσότερα',

      // NEW: Championships & Subgroups
      championshipsDesc: 'Δείτε τη βαθμολογία και το πρόγραμμα αγώνων',
      standings: 'Βαθμολογία',
      allGroups: 'Όλοι οι όμιλοι (συγχωνευμένοι)',
      mondayGroup: 'Όμιλος Δευτέρας',
      tuesdayGroup: 'Όμιλος Τρίτης',
      wednesdayGroup: 'Όμιλος Τετάρτης',
      thursdayGroup: 'Όμιλος Πέμπτης',
      mergedStandings: 'Συνολική βαθμολογία',
      noTeamsInSubgroup: 'Δεν υπάρχουν ομάδες σε αυτόν τον όμιλο ακόμα',
      noTeamsInChampionship: 'Δεν υπάρχουν ομάδες σε αυτό το πρωτάθλημα ακόμα',
      
      // NEW: Table Headers & Legend
      pld: 'Αγ',
      played: 'Αγώνες',
      w: 'Ν',
      won: 'Νίκες',
      d: 'Ι',
      draw: 'Ισοπαλίες',
      l: 'Η',
      lost: 'Ήττες',
      gf: 'ΓΥ',
      goalsFor: 'Γκολ υπέρ',
      ga: 'ΓΚ',
      goalsAgainst: 'Γκολ κατά',
      gd: 'ΔΓ',
      goalDifference: 'Διαφορά γκολ',
      pts: 'Βαθ',
      points: 'Βαθμοί',
      legend: 'Υπόμνημα',
      top3: 'Πρώτες 3',
      highlightedInGreen: 'επισημαίνονται με πράσινο',
      eliminated: 'Αποκλεισμένοι',
      highlightedInRed: 'ομάδες εμφανίζονται με κόκκινο',
      
      // NEW: Team Modal
      joinChampionship: 'Εγγραφή στο πρωτάθλημα',
      joinChampionshipDesc: 'Εγγράψτε την ομάδα σας για να αγωνιστείτε στα πρωταθλήματά μας. Ένας διαχειριστής θα αναθεωρήσει το αίτημά σας και θα σας αναθέσει στο κατάλληλο πρωτάθλημα.',
      assignTeam: 'Ανάθεση σε πρωτάθλημα',
      championship: 'Πρωτάθλημα',
      selectChampionship: 'Επιλέξτε πρωτάθλημα...',
      subgroup: 'Όμιλος αγώνων',
      selectSubgroup: 'Επιλέξτε όμιλο...',
      subgroupExplanation: 'Οι ομάδες κάθε ομίλου θα αγωνιστούν μεταξύ τους κατά τη διάρκεια της φάσης των ομίλων.',
      championshipReviewInfo: 'Το αίτημά σας θα αναθεωρηθεί από έναν διαχειριστή που θα σας αναθέσει σε ένα από τα πρωταθλήματά μας: MSL DREAM LEAGUE, MSL A ή MSL B.',
      enterTeamName: 'Εισάγετε το όνομα της ομάδας σας',
      enterPhone: 'Εισάγετε τον αριθμό τηλεφώνου σας',
      submitting: 'Υποβολή...',
      submitRequest: 'Υποβολή αιτήματος',
      
      // NEW: Knockout Bracket
      knockoutBracket: 'Πίνακας νοκ-άουτ',
      bracketComingSoon: 'Ο πίνακας νοκ-άουτ θα εμφανιστεί εδώ όταν ξεκινήσουν οι τελικοί',
      
      // NEW: Phases (for future use)
      groupStage: 'Φάση ομίλων',
      qualificationRound: 'Γύρος προκριματικών',
      finals: 'Τελικοί',
      roundOf16: 'Φάση των 16',
      quarterfinals: 'Προημιτελικά',
      semifinals: 'Ημιτελικοί',
      final: 'Τελικός',
    }
  }
};

// Read saved language if present; otherwise default to Greek ('gr')
const getInitialLang = (): 'gr' | 'en' => {
  try {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('i18nextLng') : null;
    if (saved === 'gr' || saved === 'en') return saved;
  } catch {}
  return 'gr';
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getInitialLang(),
    fallbackLng: 'gr',
    interpolation: { escapeValue: false },
  });

export default i18n;
