/**
 * AuthHub Widget SDK
 * Embeddable authentication widget for external services
 * 
 * Usage:
 * <script src="https://your-authhub-domain.com/authhub-widget.js"></script>
 * <script>
 *   const authHub = new AuthHubWidget({
 *     domain: 'https://your-authhub-domain.com',
 *     onSuccess: (token, user) => {
 *       // Store token and redirect/update UI
 *       console.log('Authenticated:', user);
 *     },
 *     onError: (error) => {
 *       console.error('Auth failed:', error);
 *     }
 *   });
 * 
 *   // Show login popup
 *   authHub.login();
 * </script>
 */

(function(window) {
  'use strict';

  class AuthHubWidget {
    constructor(config) {
      this.config = {
        domain: config.domain || window.location.origin,
        onSuccess: config.onSuccess || function() {},
        onError: config.onError || function() {},
        width: config.width || 500,
        height: config.height || 650,
        debug: config.debug || false
      };

      this.popup = null;
      this.messageListener = null;

      this._log('AuthHub Widget initialized', this.config);
    }

    /**
     * Open authentication popup
     */
    login() {
      // Close existing popup if any
      if (this.popup && !this.popup.closed) {
        this.popup.focus();
        return;
      }

      // Calculate popup position (centered)
      const left = (window.screen.width / 2) - (this.config.width / 2);
      const top = (window.screen.height / 2) - (this.config.height / 2);

      // Open popup window
      const popupUrl = `${this.config.domain}/widget-login`;
      const popupFeatures = `width=${this.config.width},height=${this.config.height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`;

      this._log('Opening popup:', popupUrl);
      this.popup = window.open(popupUrl, 'AuthHubLogin', popupFeatures);

      if (!this.popup) {
        this._handleError('Popup blocked. Please allow popups for this site.');
        return;
      }

      // Set up message listener
      this._setupMessageListener();

      // Monitor popup closure
      this._monitorPopup();
    }

    /**
     * Logout (clear local token if stored externally)
     */
    logout() {
      this._log('Logout requested');
      // External app should handle token removal
      // This just closes popup if open
      if (this.popup && !this.popup.closed) {
        this.popup.close();
      }
    }

    /**
     * Set up postMessage listener
     */
    _setupMessageListener() {
      // Remove existing listener
      if (this.messageListener) {
        window.removeEventListener('message', this.messageListener);
      }

      // Create new listener
      this.messageListener = (event) => {
        // Validate origin
        const expectedOrigin = new URL(this.config.domain).origin;
        if (event.origin !== expectedOrigin) {
          this._log('Ignoring message from unexpected origin:', event.origin);
          return;
        }

        this._log('Received message:', event.data);

        // Handle different message types
        if (event.data.type === 'AUTHHUB_AUTH_SUCCESS') {
          this._handleSuccess(event.data.token, event.data.user);
        } else if (event.data.type === 'AUTHHUB_AUTH_ERROR') {
          this._handleError(event.data.error);
        } else if (event.data.type === 'AUTHHUB_AUTH_CANCEL') {
          this._handleCancel();
        }
      };

      window.addEventListener('message', this.messageListener);
    }

    /**
     * Monitor popup window for closure
     */
    _monitorPopup() {
      const checkClosed = setInterval(() => {
        if (!this.popup || this.popup.closed) {
          clearInterval(checkClosed);
          this._log('Popup closed');
          
          // Clean up listener
          if (this.messageListener) {
            window.removeEventListener('message', this.messageListener);
            this.messageListener = null;
          }
        }
      }, 500);
    }

    /**
     * Handle successful authentication
     */
    _handleSuccess(token, user) {
      this._log('Authentication successful:', user);
      
      // Close popup
      if (this.popup && !this.popup.closed) {
        this.popup.close();
      }

      // Call success callback
      if (typeof this.config.onSuccess === 'function') {
        this.config.onSuccess(token, user);
      }
    }

    /**
     * Handle authentication error
     */
    _handleError(error) {
      this._log('Authentication error:', error);
      
      // Close popup
      if (this.popup && !this.popup.closed) {
        this.popup.close();
      }

      // Call error callback
      if (typeof this.config.onError === 'function') {
        this.config.onError(error);
      }
    }

    /**
     * Handle user cancellation
     */
    _handleCancel() {
      this._log('Authentication cancelled by user');
      
      // Close popup
      if (this.popup && !this.popup.closed) {
        this.popup.close();
      }

      // Call error callback with cancellation message
      if (typeof this.config.onError === 'function') {
        this.config.onError('Authentication cancelled');
      }
    }

    /**
     * Debug logging
     */
    _log(...args) {
      if (this.config.debug) {
        console.log('[AuthHub Widget]', ...args);
      }
    }
  }

  // Expose to global scope
  window.AuthHubWidget = AuthHubWidget;

})(window);
