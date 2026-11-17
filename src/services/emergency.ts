import { TriggerType, SOSEvent } from '../types';
import { api } from './api';
import { sound } from './audio';
import { captureCurrentLocation } from './location';

export type EmergencyState = 'idle' | 'countdown' | 'dispatching' | 'confirmed' | 'cancelled' | 'error';

export interface SOSStateSnapshot {
  state: EmergencyState;
  triggerType: TriggerType | null;
  secondsRemaining: number;
  lastConfirmedEvent: SOSEvent | null;
  notifiedCount: number;
  lastError: string | null;
  isDuplicateBlocked: boolean;
}

type Listener = (snapshot: SOSStateSnapshot) => void;

class EmergencyEngine {
  private state: EmergencyState = 'idle';
  private triggerType: TriggerType | null = null;
  private secondsRemaining: number = 5;
  private countdownTimer: any = null;
  private lastDispatchTimestamp: number = 0;
  private lastConfirmedEvent: SOSEvent | null = null;
  private notifiedCount: number = 0;
  private lastError: string | null = null;
  private isDuplicateBlocked: boolean = false;
  private listeners: Set<Listener> = new Set();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const snap = this.getSnapshot();
    this.listeners.forEach((l) => l(snap));
  }

  getSnapshot(): SOSStateSnapshot {
    return {
      state: this.state,
      triggerType: this.triggerType,
      secondsRemaining: this.secondsRemaining,
      lastConfirmedEvent: this.lastConfirmedEvent,
      notifiedCount: this.notifiedCount,
      lastError: this.lastError,
      isDuplicateBlocked: this.isDuplicateBlocked,
    };
  }

  /**
   * Central SOS Activation point for manual, gesture, and voice triggers.
   */
  activateSOS(trigger: TriggerType): boolean {
    const now = Date.now();

    // Prevent activation if already active or counting down
    if (this.state === 'countdown' || this.state === 'dispatching') {
      return false;
    }

    // Duplicate check: 10s cool-down between confirmed dispatches
    if (now - this.lastDispatchTimestamp < 10000) {
      this.isDuplicateBlocked = true;
      this.notify();
      setTimeout(() => {
        this.isDuplicateBlocked = false;
        this.notify();
      }, 3000);
      return false;
    }

    this.state = 'countdown';
    this.triggerType = trigger;
    this.secondsRemaining = 5;
    this.lastError = null;
    this.notify();

    sound.playCountdownTick(5);

    if (this.countdownTimer) clearInterval(this.countdownTimer);

    this.countdownTimer = setInterval(() => {
      this.secondsRemaining -= 1;

      if (this.secondsRemaining > 0) {
        sound.playCountdownTick(this.secondsRemaining);
        this.notify();
      } else {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
        this.proceedWithEmergency();
      }
    }, 1000);

    return true;
  }

  /**
   * Cancel SOS countdown before it reaches 0
   */
  cancelSOS() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }

    sound.playCancelChime();
    this.state = 'cancelled';
    this.notify();

    setTimeout(() => {
      if (this.state === 'cancelled') {
        this.state = 'idle';
        this.triggerType = null;
        this.notify();
      }
    }, 2500);
  }

  /**
   * Once countdown reaches 0: Capture GPS, submit to backend, alert MSG91 contacts
   */
  private async proceedWithEmergency() {
    this.state = 'dispatching';
    this.notify();

    try {
      // 1. Capture user GPS location
      const locResult = await captureCurrentLocation();

      // 2. Submit to backend API
      const response = await api.triggerSOS({
        trigger_type: this.triggerType || 'manual',
        latitude: locResult.coordinates?.latitude || null,
        longitude: locResult.coordinates?.longitude || null,
        accuracy: locResult.coordinates?.accuracy || null,
        address_label: locResult.coordinates?.addressLabel || (locResult.error ? `Location: ${locResult.error}` : undefined),
      });

      this.lastDispatchTimestamp = Date.now();
      this.lastConfirmedEvent = response.event;
      this.notifiedCount = response.contacts_notified_count;
      this.state = 'confirmed';
      sound.playEmergencyConfirmed();
      this.notify();
    } catch (err: any) {
      this.state = 'error';
      this.lastError = err.message || 'Failed to dispatch emergency alert';
      this.notify();
    }
  }

  resetToIdle() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    this.state = 'idle';
    this.triggerType = null;
    this.secondsRemaining = 5;
    this.lastError = null;
    this.notify();
  }
}

export const emergencyEngine = new EmergencyEngine();
