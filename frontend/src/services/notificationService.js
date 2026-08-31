/**
 * AI Smart City - Real-Time Mobile & Browser Native Push Notification Service
 * --------------------------------------------------------------------------
 * 100% Free & Native: Uses the W3C Web Notifications & Service Worker standard.
 * Delivers instant native push banners directly on Android / iOS / Desktop screens
 * with zero third-party subscriptions or citizen verification friction.
 */

class NativeNotificationService {
  constructor() {
    this.isSupported = typeof window !== 'undefined' && 'Notification' in window;
    this.audioChime = null;
    this.initAudio();
  }

  initAudio() {
    try {
      if (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) {
        // Prepare subtle synthetic notification chime
        this.playChime = () => {
          try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            const ctx = new AudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
          } catch (e) {
            // Audio context silently handled
          }
        };
      }
    } catch (e) {
      this.playChime = () => {};
    }
  }

  get permission() {
    if (!this.isSupported) return 'denied';
    return Notification.permission;
  }

  async requestPermission() {
    if (!this.isSupported) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;

    try {
      const result = await Notification.requestPermission();
      if (result === 'granted') {
        this.showNativePush({
          title: '🔔 SmartGov Alerts Enabled',
          body: 'You will receive real-time updates when your grievances are processed.',
          tag: 'welcome-notification'
        });
        return true;
      }
      return false;
    } catch (e) {
      console.warn('Notification permission error:', e);
      return false;
    }
  }

  showNativePush({ title, body, icon = '/favicon.ico', tag = 'smartgov-alert', url = null }) {
    if (!this.isSupported || Notification.permission !== 'granted') {
      return null;
    }

    try {
      if (this.playChime) {
        this.playChime();
      }

      const options = {
        body: body,
        icon: icon,
        badge: icon,
        tag: tag,
        renotify: true,
        requireInteraction: false,
        vibrate: [200, 100, 200],
        data: { url: url || window.location.href }
      };

      const notification = new Notification(title, options);

      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        if (url) {
          window.location.href = url;
        }
        notification.close();
      };

      return notification;
    } catch (e) {
      console.warn('Native notification dispatch failed:', e);
      return null;
    }
  }

  /**
   * Dispatches instant push notification when a new complaint is registered
   */
  notifyComplaintRegistered(complaint) {
    if (!complaint) return;
    const ticket = complaint.ticket_number || 'CMP-NEW';
    const dept = complaint.assigned_department_name || complaint.department?.name || 'Municipal Operations';
    const sla = complaint.estimated_resolution_hours ? `< ${Math.round(complaint.estimated_resolution_hours)} hrs` : '12 hrs';

    this.showNativePush({
      title: `🏛️ Grievance Registered: ${ticket}`,
      body: `Assigned to ${dept} (SLA: ${sla}). Our field team has been alerted.`,
      tag: `reg-${ticket}`,
      url: `/?ticket=${ticket}`
    });
  }

  /**
   * Dispatches push notification when complaint status changes (e.g. Assigned -> Resolved)
   */
  notifyStatusUpdate(ticketNumber, newStatus, departmentName = 'Municipal Department') {
    const statusLabels = {
      VERIFIED: 'Verified by AI Vision & Geotagged',
      ASSIGNED: `Assigned to ${departmentName} Field Team`,
      IN_PROGRESS: 'Field Inspection & Repair in Progress 🛠️',
      RESOLVED: 'Resolution Completed & Verified ✅',
      REJECTED: 'Case Reviewed and Closed'
    };

    const statusText = statusLabels[newStatus] || `Status updated to ${newStatus}`;

    this.showNativePush({
      title: `🚨 Grievance Update: ${ticketNumber}`,
      body: statusText,
      tag: `status-${ticketNumber}-${newStatus}`,
      url: `/?ticket=${ticketNumber}`
    });
  }
}

export const notificationService = new NativeNotificationService();
